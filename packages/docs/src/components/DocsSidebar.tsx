"use client";

import { useEffect, useRef } from "react";
import { DocsNav } from "./DocsNav.js";

export function DocsSidebar() {
  const sidebarRef = useRef<HTMLElement>(null);

  // On initial load, scroll the sidebar so that the current page's link is visible.
  // Later navigations keep the sidebar's scroll position since the user clicked a visible link.
  useEffect(() => {
    const sidebar = sidebarRef.current;
    const activeLink = sidebar?.querySelector<HTMLElement>(".docs-nav-link.active");
    if (!sidebar || !activeLink) {
      return;
    }
    const sidebarRect = sidebar.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    if (linkRect.top < sidebarRect.top || linkRect.bottom > sidebarRect.bottom) {
      sidebar.scrollTop +=
        linkRect.top - sidebarRect.top - (sidebarRect.height - linkRect.height) / 2;
    }
  }, []);

  return (
    <aside className="docs-sidebar" ref={sidebarRef}>
      <nav aria-label="Documentation">
        <DocsNav />
      </nav>
    </aside>
  );
}
