"use client";

import { useLocation } from "@funstack/router";
import { useState } from "react";
import { GITHUB_URL } from "../navigation.js";
import { DocsNav } from "./DocsNav.js";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/getting-started", label: "Getting Started" },
  { path: "/learn", label: "Learn" },
  { path: "/api", label: "API Reference" },
  { path: "/examples", label: "Examples" },
  { path: "/faq", label: "FAQ" },
];

export function Header() {
  const { pathname: currentPath } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    // Handle API Reference section (match any /api/* path)
    if (path === "/api") {
      return currentPath.startsWith("/api");
    }
    // Handle Learn section (match any /learn/* path)
    if (path === "/learn") {
      return currentPath.startsWith("/learn");
    }
    // Handle home path
    if (path === "/") {
      return currentPath === "/" || currentPath === "";
    }
    return currentPath === path;
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="logo">
          <a href="/">FUNSTACK Router</a>
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
        <a href={GITHUB_URL} className="github-link" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <button
          className="hamburger"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? "✕" : "☰"}
        </button>
      </div>
      {isMenuOpen && (
        <nav className="mobile-nav" aria-label="Site">
          <a
            href="/"
            className={`mobile-nav-link ${isActive("/") ? "active" : ""}`}
            onClick={closeMenu}
          >
            Home
          </a>
          <DocsNav onNavigate={closeMenu} />
        </nav>
      )}
    </header>
  );
}
