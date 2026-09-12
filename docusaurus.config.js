const { themes: prismThemes } = require("prism-react-renderer");

const title = "水专手册";
const description = "上海海洋大学校园信息手册";
const themeColor = "#49BF7C";

// SITE_URL is the canonical deployment URL. Vercel supplies a safe build-time
// fallback for previews; local builds intentionally use localhost instead of
// guessing a production domain.
const configuredSiteUrl =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
const siteUrl = configuredSiteUrl.replace(/\/+$/, "");
const configuredBaseUrl = process.env.BASE_URL || "/";
const baseUrl = configuredBaseUrl === "/" ? "/" : `/${configuredBaseUrl.replace(/^\/+|\/+$/g, "")}/`;
const withBase = (resource) => `${baseUrl}${resource.replace(/^\/+/, "")}`;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title,
  tagline: description,
  favicon: "img/icons/icon-192.png",

  url: siteUrl,
  baseUrl,
  organizationName: "Conduit-Club",
  projectName: "SHOU-Online-Manual",
  staticDirectories: ["assets"],

  trailingSlash: true,
  onBrokenLinks: "throw",
  onBrokenAnchors: "throw",
  markdown: {
    format: "mdx",
    hooks: {
      onBrokenMarkdownLinks: "throw",
    },
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: "docs",
          routeBasePath: "/",
          sidebarPath: "./sidebars.js",
          editUrl: "https://github.com/Conduit-Club/SHOU-Online-Manual/edit/dev/",
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: false,
        pages: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],

  i18n: {
    defaultLocale: "zh-Hans",
    locales: ["zh-Hans"],
  },

  plugins: [
    [
      "@docusaurus/plugin-pwa",
      {
        offlineModeActivationStrategies: ["appInstalled", "standalone", "queryString"],
        pwaHead: [
          {
            tagName: "link",
            rel: "manifest",
            href: withBase("manifest.json"),
          },
          {
            tagName: "meta",
            name: "theme-color",
            content: themeColor,
          },
          {
            tagName: "meta",
            name: "apple-mobile-web-app-capable",
            content: "yes",
          },
          {
            tagName: "meta",
            name: "apple-mobile-web-app-status-bar-style",
            content: "default",
          },
          {
            tagName: "link",
            rel: "apple-touch-icon",
            href: withBase("img/icons/icon-192.png"),
          },
        ],
      },
    ],
  ],

  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        hashed: true,
        language: ["zh", "en"],
        docsRouteBasePath: "/",
        indexBlog: false,
        indexPages: false,
        searchBarShortcutKeymap: "mod+k",
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      metadata: [
        {
          name: "description",
          content: description,
        },
      ],
      navbar: {
        title,
        items: [
          { to: "/", label: "🏠首页", position: "left" },
          { to: "/emergency/", label: "🚨应急", position: "left" },
          { to: "/about/", label: "☎️联系项目", position: "right" },
          {
            href: "https://github.com/Conduit-Club/SHOU-Online-Manual",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "学校入口",
            items: [
              { label: "上海海洋大学官网", href: "https://www.shou.edu.cn/" },
              { label: "上海海洋大学图书馆", href: "https://library.shou.edu.cn/" },
              { label: "教务处", href: "https://jwc.shou.edu.cn/" },
              { label: "学生在线", href: "https://xszx.shou.edu.cn/" },
              { label: "数字校园", href: "https://portal.shou.edu.cn/" },
            ],
          },
        ],
        copyright: `水专手册 · 上海海洋大学校园信息手册 · ${new Date().getFullYear()}`,
      },
      colorMode: {
        defaultMode: "light",
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: false,
        },
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ["bash", "json", "toml", "yaml", "powershell", "typescript", "jsx"],
      },
    }),
};

module.exports = config;
