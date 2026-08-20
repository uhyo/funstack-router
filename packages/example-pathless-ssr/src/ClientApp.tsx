"use client";

import { Router, type RouteDefinition } from "@funstack/router";
import "./styles.css";

export function ClientApp({ routes }: { routes: RouteDefinition[] }) {
  // No ssr prop — during SSR only pathless routes match, rendering the app shell.
  // Path-based content fills in on client hydration.
  // experimentalBrowserBailout uses React's browser() API to avoid hydration
  // mismatches by deferring unmatched outlet content to the browser. The
  // outlet must be wrapped in a <Suspense> boundary (see Layout).
  return <Router routes={routes} fallback="static" experimentalBrowserBailout />;
}
