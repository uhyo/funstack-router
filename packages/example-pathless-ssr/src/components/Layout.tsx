import { Suspense } from "react";
import { Outlet } from "@funstack/router";
import { Header } from "./Header.js";

export function Layout() {
  return (
    <div className="layout">
      <Header />
      <main className="main">
        {/* The Suspense boundary is required by experimentalBrowserBailout:
            during pathless SSR the outlet bails out to the browser, leaving
            this fallback in the server-rendered HTML. */}
        <Suspense fallback={<p>Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="footer">
        <p>
          FUNSTACK Router &mdash; Pathless SSR Example (shell rendered without <code>ssr</code>{" "}
          prop)
        </p>
      </footer>
    </div>
  );
}
