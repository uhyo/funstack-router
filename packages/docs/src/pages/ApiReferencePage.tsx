"use client";

import { Outlet, useLocation } from "@funstack/router";

const apiNavItems = [
  { path: "/funstack-router/api/components", label: "Components" },
  { path: "/funstack-router/api/hooks", label: "Hooks" },
  { path: "/funstack-router/api/utilities", label: "Utilities" },
  { path: "/funstack-router/api/types", label: "Types" },
];

export function ApiReferencePage() {
  const location = useLocation();

  return (
    <div className="page docs-page api-page">
      <h1>API Reference</h1>

      <nav className="api-nav">
        {apiNavItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={location.pathname === item.path ? "active" : ""}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
