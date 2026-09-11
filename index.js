/**
 * GitHub Proxy - Cloudflare Worker Snippet
 * 参考 hunshcn/gh-proxy 实现的单文件极简版本
 */

const ASSET_URL = 'https://hunshcn.github.io/gh-proxy/';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // 1. 根路径返回默认主页UI
        if (url.pathname === '/' || url.pathname === '/index.html') {
            return fetch(ASSET_URL);
        }
        if (url.pathname === '/favicon.ico') {
            return fetch(ASSET_URL + 'favicon.ico');
        }

        // 2. 解析需要代理的目标 URL
        let targetStr = url.pathname.substring(1) + url.search;
        
        // 如果用户忘了加 https:// 前缀，自动补全
        if (targetStr.startsWith('github.com') || 
            targetStr.startsWith('raw.githubusercontent.com') ||
            targetStr.startsWith('gist.githubusercontent.com')) {
            targetStr = 'https://' + targetStr;
        }

        // 如果用户直接输入类似 user/repo/releases... 格式，补全 github.com
        if (/^[\w.-]+\/[\w.-]+\/(releases|archive|blob|raw|info)\//.test(targetStr)) {
            targetStr = 'https://github.com/' + targetStr;
        }

        let targetUrl;
        try {
            targetUrl = new URL(targetStr);
        } catch (e) {
            return new Response('Invalid URL. Example: https://your-worker.dev/https://github.com/user/repo', { status: 400 });
        }

        // 3. 限制仅代理 GitHub 相关域名，防止滥用为通用代理
        const allowedDomains = [
            'github.com',
            'githubusercontent.com',
            'githubassets.com',
            'github-releases.githubusercontent.com'
        ];
        
        const isAllowed = allowedDomains.some(domain => 
            targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
        );

        if (!isAllowed) {
            return new Response('Forbidden: Domain not allowed. Only GitHub related domains are supported.', { status: 403 });
        }

        // 4. 构造代理请求
        const init = {
            method: request.method,
            headers: new Headers(request.headers),
            redirect: 'manual' // 手动处理重定向
        };

        // 清理原始请求中的客户端信息，避免被目标服务器拒绝
        init.headers.delete('Host');
        init.headers.delete('X-Forwarded-For');
        init.headers.delete('X-Real-IP');
        init.headers.delete('CF-Connecting-IP');
        // 防止由于源站配置了严格的 Referer 导致拉取失败
        init.headers.delete('Referer');

        // 5. 发送请求并处理响应
        try {
            const response = await fetch(targetUrl.href, init);
            const newHeaders = new Headers(response.headers);
            
            // 注入 CORS 头，允许跨域访问（方便在前端项目中使用该代理）
            newHeaders.set('Access-Control-Allow-Origin', '*');
            newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            newHeaders.set('Access-Control-Allow-Headers', '*');

            // 如果遇到重定向（例如下载 Release 时 GitHub 会重定向到 AWS S3）
            if (response.status >= 300 && response.status < 400) {
                const location = newHeaders.get('location');
                if (location) {
                    try {
                        const locUrl = new URL(location);
                        // 如果重定向的目标还是 GitHub 的域名，继续用我们的代理进行包裹
                        if (allowedDomains.some(domain => locUrl.hostname === domain || locUrl.hostname.endsWith('.' + domain))) {
                            newHeaders.set('location', url.origin + '/' + location);
                        } 
                        // 如果重定向到了外部（如 AWS S3），保留原 location 并让浏览器直接去外部下载
                    } catch (e) {
                        // 解析异常忽略
                    }
                }
            }

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        } catch (e) {
            return new Response('Proxy Error: ' + e.message, { status: 500 });
        }
    }
};
