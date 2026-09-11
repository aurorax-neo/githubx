export default {
  async fetch(request) {
    const url = new URL(request.url);
    let targetStr = url.pathname.substring(1) + url.search;
    
    // 如果没有指定代理目标，纯后端静默返回 404
    if (!targetStr || targetStr === "favicon.ico") {
        return new Response("Not Found", { status: 404 });
    }

    // 智能补全 GitHub 前缀
    if (targetStr.startsWith('github.com') || 
        targetStr.startsWith('raw.githubusercontent.com') ||
        targetStr.startsWith('gist.githubusercontent.com')) {
        targetStr = 'https://' + targetStr;
    } else if (/^[\w.-]+\/[\w.-]+\/(releases|archive|blob|raw|info)\//.test(targetStr)) {
        targetStr = 'https://github.com/' + targetStr;
    }

    let targetUrl;
    try {
        targetUrl = new URL(targetStr);
    } catch (e) {
        return new Response("Bad Request", { status: 400 });
    }

    // 域名白名单限制
    const allowedDomains = [
        'github.com',
        'githubusercontent.com',
        'githubassets.com',
        'github-releases.githubusercontent.com'
    ];
    
    if (!allowedDomains.some(d => targetUrl.hostname === d || targetUrl.hostname.endsWith('.' + d))) {
        return new Response("Forbidden", { status: 403 });
    }

    const init = {
        method: request.method,
        headers: new Headers(request.headers),
        redirect: 'manual'
    };
    
    // 清除可能暴露或导致源站拒绝的 Header
    init.headers.delete('Host');
    init.headers.delete('X-Forwarded-For');
    init.headers.delete('X-Real-IP');
    init.headers.delete('CF-Connecting-IP');
    init.headers.delete('Referer');

    try {
        const response = await fetch(targetUrl.href, init);
        const newHeaders = new Headers(response.headers);
        
        newHeaders.set('Access-Control-Allow-Origin', '*');

        // 处理重定向（如下载 Release 时的 S3 链接）
        if (response.status >= 300 && response.status < 400) {
            const location = newHeaders.get('location');
            if (location) {
                try {
                    const locUrl = new URL(location);
                    if (allowedDomains.some(d => locUrl.hostname === d || locUrl.hostname.endsWith('.' + d))) {
                        newHeaders.set('location', url.origin + '/' + location);
                    }
                } catch (e) {
                    // 原样保留外部重定向
                }
            }
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
        });
    } catch (e) {
        return new Response("Internal Server Error", { status: 500 });
    }
  }
};
