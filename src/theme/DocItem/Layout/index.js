import React, { useState } from "react";
import clsx from "clsx";

import { useDoc } from "@docusaurus/plugin-content-docs/client";
import { useWindowSize } from "@docusaurus/theme-common";

import ContentVisibility from "@theme/ContentVisibility";
import DocBreadcrumbs from "@theme/DocBreadcrumbs";
import DocItemContent from "@theme/DocItem/Content";
import DocItemFooter from "@theme/DocItem/Footer";
import DocItemTOCDesktop from "@theme/DocItem/TOC/Desktop";
import DocItemTOCMobile from "@theme/DocItem/TOC/Mobile";
import DocItemPaginator from "@theme/DocItem/Paginator";
import DocVersionBadge from "@theme/DocVersionBadge";
import DocVersionBanner from "@theme/DocVersionBanner";

function useDocTOC() {
  const { frontMatter, toc } = useDoc();
  const windowSize = useWindowSize();
  const hidden = Boolean(frontMatter?.hide_table_of_contents);
  const canRender = !hidden && Array.isArray(toc) && toc.length > 0;

  return {
    hidden,
    mobile: canRender ? <DocItemTOCMobile /> : null,
    desktop: canRender && (windowSize === "desktop" || windowSize === "ssr") ? <DocItemTOCDesktop /> : null,
  };
}

export default function DocItemLayout({ children }) {
  const docTOC = useDocTOC();
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const { metadata } = useDoc();
  const hasDesktopToc = Boolean(docTOC.desktop);
  const showDesktopToc = hasDesktopToc && !tocCollapsed;

  return (
    <div className="row shou-doc-item-row">
      <div
        className={clsx("col", "shou-doc-item-main", {
          "shou-doc-item-main--with-toc": showDesktopToc,
        })}
      >
        <ContentVisibility metadata={metadata} />
        <DocVersionBanner />
        <div className="shou-doc-item-container">
          <article>
            <DocBreadcrumbs />
            <DocVersionBadge />
            {docTOC.mobile}
            <DocItemContent>{children}</DocItemContent>
            <DocItemFooter />
          </article>
          <DocItemPaginator />
        </div>
        {hasDesktopToc && tocCollapsed ? (
          <button
            type="button"
            className="shou-doc-toc-expand"
            aria-controls="shou-doc-toc-panel"
            aria-expanded={false}
            onClick={() => setTocCollapsed(false)}
          >
            显示文章目录
          </button>
        ) : null}
      </div>
      {showDesktopToc ? (
        <aside className="col shou-doc-toc-column" id="shou-doc-toc-panel" aria-label="文章目录">
          <div className="shou-doc-toc-panel">
            <div className="shou-doc-toc-heading">
              <span>文章目录</span>
              <button
                type="button"
                className="shou-doc-toc-toggle"
                aria-controls="shou-doc-toc-panel"
                aria-expanded={true}
                aria-label="收起文章目录"
                title="收起文章目录"
                onClick={() => setTocCollapsed(true)}
              >
                收起
              </button>
            </div>
            {docTOC.desktop}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
