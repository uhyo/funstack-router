"use client";

import { Outlet, useLocation } from "@funstack/router";
import { apiNavItems } from "../navigation.js";

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
