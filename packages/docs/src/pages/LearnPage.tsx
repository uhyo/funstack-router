"use client";

import { Outlet, useLocation } from "@funstack/router";

const learnNavItems = [
  { path: "/learn/navigation-api", label: "Navigation API" },
  { path: "/learn/nested-routes", label: "Nested Routes" },
  { path: "/learn/type-safety", label: "Type Safety" },
  {
    path: "/learn/server-side-rendering",
    label: "Server-Side Rendering",
  },
  {
    path: "/learn/static-site-generation",
    label: "Static Site Generation",
  },
  {
    path: "/learn/react-server-components",
    label: "React Server Components",
  },
  { path: "/learn/transitions", label: "Transitions" },
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
