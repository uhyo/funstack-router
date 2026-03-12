"use client";

import { Fragment } from "react";
import { Outlet, useLocation } from "@funstack/router";

type NavItem = {
  path: string;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type NavEntry = NavItem | NavGroup;

const learnNavItems: NavEntry[] = [
  { path: "/learn/navigation-api", label: "Navigation API" },
  { path: "/learn/nested-routes", label: "Nested Routes" },
  { path: "/learn/type-safety", label: "Type Safety" },
  { path: "/learn/actions", label: "Form Actions" },
  { path: "/learn/loaders", label: "How Loaders Run" },
  { path: "/learn/error-handling", label: "Error Handling" },
  { path: "/learn/transitions", label: "Transitions" },
  {
    label: "SSR",
    items: [
      { path: "/learn/ssr", label: "How SSR Works" },
      {
        path: "/learn/ssr/static-site-generation",
        label: "Static Site Generation",
      },
      { path: "/learn/ssr/with-loaders", label: "SSR with Loaders" },
    ],
  },
  {
    label: "RSC",
    items: [
      { path: "/learn/rsc", label: "React Server Components" },
      { path: "/learn/rsc/route-features", label: "RSC with Route Features" },
    ],
  },
];

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export function LearnPage() {
  const location = useLocation();

  return (
    <div className="page docs-page learn-page">
      <h1>Learn</h1>

      <nav className="api-nav">
        {learnNavItems.map((entry) => {
          if (isNavGroup(entry)) {
            return (
              <Fragment key={entry.label}>
                <span className="nav-group-label">{entry.label}</span>
                {entry.items.map((item) => (
                  <a
                    key={item.path}
                    href={item.path}
                    className={location.pathname === item.path ? "active" : ""}
                  >
                    {item.label}
                  </a>
                ))}
              </Fragment>
            );
          }
          return (
            <a
              key={entry.path}
              href={entry.path}
              className={location.pathname === entry.path ? "active" : ""}
            >
              {entry.label}
            </a>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
