"use client";

import { Router, type RouteDefinition } from "@funstack/router";
import "./styles.css";

export function ClientApp({
  routes,
  ssrPath,
}: {
  routes: RouteDefinition[];
  ssrPath?: string;
}) {
  return (
    <Router
      routes={routes}
      fallback="static"
      ssr={ssrPath ? { path: ssrPath } : undefined}
    />
  );
}
