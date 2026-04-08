import { type ReactNode, useContext } from "react";
import * as React from "react";
import { RouteContext } from "./context/RouteContext.js";
import { RouterContext } from "./context/RouterContext.js";

/**
 * Renders the matched child route.
 * Used in layout components to specify where child routes should render.
 *
 * When `experimentalPostpone` is enabled on the Router and no child route
 * matches during pathless SSR, calls `React.unstable_postpone()` instead of
 * rendering `null`, deferring the content to client-side rendering.
 */
export function Outlet(): ReactNode {
  const routeContext = useContext(RouteContext);
  const routerContext = useContext(RouterContext);

  if (!routeContext) {
    return null;
  }

  if (
    routeContext.outlet === null &&
    routerContext !== null &&
    routerContext.experimentalPostpone &&
    routerContext.url === null
  ) {
    // During pathless SSR, child routes cannot match because there is no URL.
    // Use React's experimental postpone API to signal that this content
    // should be rendered on the client instead.
    const postpone = (React as Record<string, unknown>)["unstable_postpone"];
    if (typeof postpone === "function") {
      (postpone as (reason: string) => never)(
        "Route not matched during pathless SSR",
      );
    }
  }

  return routeContext.outlet;
}
