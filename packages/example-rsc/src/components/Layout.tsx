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
          FUNSTACK Router &mdash; RSC Example with Two-Phase Route Definitions
        </p>
      </footer>
    </div>
  );
}
