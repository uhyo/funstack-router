import { Outlet } from "@funstack/router";
import { DocsSidebar } from "./DocsSidebar.js";

// Layout for documentation pages: a site-wide sidebar next to the page content.
export function DocsLayout() {
  return (
    <div className="docs-layout">
      <DocsSidebar />
      <div className="docs-content">
        <Outlet />
      </div>
    </div>
  );
}
