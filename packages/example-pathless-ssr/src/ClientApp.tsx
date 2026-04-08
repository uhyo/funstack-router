"use client";

import { Router, type RouteDefinition } from "@funstack/router";
import "./styles.css";

export function ClientApp({ routes }: { routes: RouteDefinition[] }) {
  // No ssr prop — during SSR only pathless routes match, rendering the app shell.
  // Path-based content fills in on client hydration.
  // experimentalPostpone uses React's unstable_postpone API to avoid hydration
  // mismatches by deferring unmatched outlet content to client rendering.
  return <Router routes={routes} fallback="static" experimentalPostpone />;
}
