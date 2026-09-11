# GitHub Proxy (Cloudflare Snippets)

一个专为 **Cloudflare Snippets** 编写的纯后端、无 UI、极简版 GitHub 代理。

该版本去除了所有的页面返回和多余依赖，专注于最高效的流量转发。非常适用于命令行下载、脚本拉取、前后端分离项目的 API 代理，或者纯粹作为终端的加速节点。

## ✨ 特性

- **纯后端 (Zero UI)**：无任何前端页面，访问根路径或错误路径直接返回标准 HTTP 状态码（404/403/500），保持高度隐蔽。
- **开箱即用**：单文件原生 JavaScript 编写，无需 `wrangler` 部署，无需任何 npm 依赖。
- **智能补全**：支持省略 `https://`，甚至可以直接省略 `github.com` 前缀。
- **下载防断流**：完美处理 GitHub Releases 的 302 重定向逻辑，重定向内的 GitHub 域名也会被自动包裹代理。
- **安全防白嫖**：内置严格的 GitHub 域名白名单，防止被恶意用作通用外网代理。

## 🚀 部署指南 (Cloudflare Snippets)

由于使用了最新的 Cloudflare Snippets 功能，部署甚至不需要创建完整的 Worker：

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，选择你要绑定的域名。
2. 在左侧菜单中找到并点击 **Rules (规则)** -> **Snippets**。
3. 点击 **Create Snippet (创建 Snippet)**，命名随意（例如 `gh-proxy`）。
4. 将 `index.js` 中的代码全部复制并粘贴到代码编辑器中。
5. 配置触发条件 (Trigger)：
   - 字段选择 `Hostname`，操作符选择 `equals`，值填写你准备用来代理的子域名（例如：`gh.yourdomain.com`）。
   - 或者配置 `URI Path` 匹配特定路径。
6. 点击 **Save and deploy (保存并部署)**。

*提示：记得在 Cloudflare DNS 记录中为该子域名（如 `gh.yourdomain.com`）添加一条指向任意占位 IP（如 `192.0.2.1`）的 A 记录，并开启橙色云朵（Proxy 状态），Snippet 才能正常拦截请求。*

## 📖 使用示例

假设你部署在 `https://gh.yourdomain.com`，以下是几种支持的请求格式：

### 1. 完整链接代理 (推荐)
直接将原本的 GitHub 链接拼接在代理域名之后：
```bash
wget https://gh.yourdomain.com/https://github.com/hunshcn/gh-proxy/archive/master.zip
```

### 2. 省略协议前缀
```bash
wget https://gh.yourdomain.com/github.com/hunshcn/gh-proxy/archive/master.zip
wget https://gh.yourdomain.com/raw.githubusercontent.com/hunshcn/gh-proxy/master/package.json
```

### 3. 省略域名极简模式
当路径匹配 `releases` / `archive` / `blob` / `raw` 时，系统会自动补充 `https://github.com/`：
```bash
wget https://gh.yourdomain.com/hunshcn/gh-proxy/archive/master.zip
```

## 🔒 域名白名单限制

为防止滥用，代理默认**仅允许**以下域名及它们的子域名请求通过：
- `github.com`
- `githubusercontent.com`
- `githubassets.com`
- `github-releases.githubusercontent.com`

尝试请求其他域名（例如 Google 或其他网站）将直接返回 `403 Forbidden`。

## 📄 授权协议

MIT License
