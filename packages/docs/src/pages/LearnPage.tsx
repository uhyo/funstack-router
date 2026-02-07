"use client";

import { Outlet, useLocation } from "@funstack/router";

const learnNavItems = [
  { path: "/funstack-router/learn/navigation-api", label: "Navigation API" },
  { path: "/funstack-router/learn/nested-routes", label: "Nested Routes" },
  { path: "/funstack-router/learn/type-safety", label: "Type Safety" },
  {
    path: "/funstack-router/learn/server-side-rendering",
    label: "Server-Side Rendering",
  },
];

export function LearnPage() {
  const location = useLocation();

  return (
    <div className="page docs-page learn-page">
      <h1>Learn</h1>

      <nav className="api-nav">
        {learnNavItems.map((item) => (
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
