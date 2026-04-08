import { Outlet } from "@funstack/router";
import { Header } from "./Header.js";

export function Layout() {
  return (
    <div className="layout">
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>
          FUNSTACK Router &mdash; Pathless SSR Example (shell rendered without{" "}
          <code>ssr</code> prop)
        </p>
      </footer>
    </div>
  );
}
