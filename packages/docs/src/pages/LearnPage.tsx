"use client";

import { Fragment } from "react";
import { Outlet, useLocation } from "@funstack/router";
import { isNavGroup, learnNavItems } from "../navigation.js";

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
