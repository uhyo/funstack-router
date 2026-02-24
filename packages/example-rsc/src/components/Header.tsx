"use client";

import { useLocation } from "@funstack/router";

export function Header() {
  const location = useLocation();
  const pathname = location?.pathname ?? "/";

  const navItems = [
    { path: "/", label: "Dashboard" },
    { path: "/tasks", label: "Tasks" },
    { path: "/settings/profile", label: "Settings" },
  ];

  return (
    <header className="header">
      <h1 className="header-title">Task Manager</h1>
      <nav className="header-nav">
        {navItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={
              "nav-link" +
              (pathname === item.path ||
              (item.path !== "/" && pathname.startsWith(item.path))
                ? " active"
                : "")
            }
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
