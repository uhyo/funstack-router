import { useState } from "react";
import { Outlet, useLocation } from "@funstack/router";

const navItems = [
  { path: "/funstack-router/", label: "Home" },
  { path: "/funstack-router/getting-started", label: "Getting Started" },
  { path: "/funstack-router/api", label: "API Reference" },
  { path: "/funstack-router/examples", label: "Examples" },
];

export function Layout() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    // Handle API Reference section (match any /api/* path)
    if (path === "/funstack-router/api") {
      return location.pathname.startsWith("/funstack-router/api");
    }
    // Handle home path
    if (path === "/funstack-router/") {
      return (
        location.pathname === "/funstack-router/" ||
        location.pathname === "/funstack-router"
      );
    }
    return location.pathname === path;
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <a href="/funstack-router/">FUNSTACK Router</a>
          </h1>
          <nav className="nav">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`nav-link ${isActive(item.path) ? "active" : ""}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="https://github.com/uhyo/funstack-router"
            className="github-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <button
            className="hamburger"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? "✕" : "☰"}
          </button>
        </div>
        {isMenuOpen && (
          <nav className="mobile-nav">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`mobile-nav-link ${isActive(item.path) ? "active" : ""}`}
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>
          Built with <strong>@funstack/router</strong> &mdash; A modern React
          router based on the Navigation API
        </p>
      </footer>
    </div>
  );
}
