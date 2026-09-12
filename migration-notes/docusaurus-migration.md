# VuePress 到 Docusaurus 迁移说明

本站使用 Docusaurus 3.10.2 的 classic preset，并通过 `routeBasePath: "/"` 让 `docs/` 直接作为站点根路由。文档页面通过 front matter 显式声明 `id` 和 `slug`；原有的目录 URL 以及带 `.html` 的旧 URL 因而可以继续使用。静态构建输出位于根目录 `build/`。

## 原插件与 Docusaurus 对应关系

| VuePress 能力                               | Docusaurus 实现                                              | 说明                                                                                                                                                                                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vuepress/theme-default` 与 Vite bundler   | `@docusaurus/preset-classic`                                 | 站点改用 React/webpack 构建，导航、侧边栏、暗色模式和代码高亮由 classic theme 提供。                                                                                                                                                                                                  |
| `@vuepress/plugin-search`                   | `@easyops-cn/docusaurus-search-local`                        | 以 theme 方式安装，配置中文和英文分词、根文档路由，并生成本地搜索索引；不依赖 Algolia 账号或外部服务。                                                                                                                                                                                |
| `@vuepress/plugin-pwa`                      | 官方 `@docusaurus/plugin-pwa`                                | 生产构建用 Workbox 生成 service worker。由于本站把根 `assets/` 配置为 Docusaurus static directory，`assets/manifest.json` 和其中列出的图标是可安装 PWA 的必要资源；开发服务器不会注册生产 service worker。                                                                            |
| `@vuepress/plugin-toc` 与 `sidebarDepth: 2` | classic theme 的 `themeConfig.tableOfContents`               | 当前全局目录显示 H2–H3；右侧目录的收起交互由主题扩展提供。旧的 `[[toc]]` 标记不是 Docusaurus 语法，迁移页面中应删除，使用右侧目录或正常 Markdown 标题。                                                                                                                               |
| `@vuepress/plugin-git`                      | docs preset 的 `showLastUpdateTime` / `showLastUpdateAuthor` | Docusaurus 从 Git 历史读取页面更新时间和作者；CI checkout 保留完整历史（`fetch-depth: 0`）。                                                                                                                                                                                          |
| `@vuepress/plugin-markdown-image`           | Docusaurus 原生 Markdown/MDX 图片语法                        | 相邻文件可用 `![说明](./image.png)`，会作为文档资源处理；`/assets/...` 这类绝对路径必须对应 `assets/assets/...`。Docusaurus 会把图片交给构建管线，也可在 MDX `<img>` 上指定 `loading="lazy"` 和尺寸；旧插件的明暗标记与 Obsidian 尺寸语法没有内建等价项，应使用主题 CSS 或 MDX 表达。 |

Docusaurus 默认把 `.md` 文件按 MDX 编译，因此文档可以使用 React 组件；组件应放在 `src/` 并按 MDX 规则导入。普通 Markdown 表格、代码块、相对链接和相对图片仍可直接使用。

Windows 上的 pnpm 12 默认把 `node_modules/.pnpm` 内的虚拟存储目录名限制为 60 个字符。当前 Docusaurus 的 peer 依赖目录更长，缩短后会使根目录 junction 指向错误的截断目录，进而在构建时无法解析 `@docusaurus/theme-common` 或 `@docusaurus/plugin-content-docs/client`。因此 `pnpm-workspace.yaml` 保留 `virtualStoreDirMaxLength: 120`；这是 pnpm 12 读取的 camelCase 工作区配置，且不改变 isolated `nodeLinker`。

## 本地任务

```bash
pixi run dev
pixi run --locked build
pixi run --locked start
pixi run --locked test-gpa
pixi run --locked fmt-check
```

`SITE_URL` 可指定部署站点的规范 URL，`BASE_URL` 可指定子路径部署前缀；未设置时，本地构建使用 `http://localhost:3000/`，Vercel 构建优先使用其提供的部署 URL。这样配置不会把未核实的生产域名写入站点元数据。
