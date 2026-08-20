import { type ReactNode, use, useContext } from "react";
import { RouteContext } from "./context/RouteContext.js";
import { RouterContext } from "./context/RouterContext.js";
import { getBrowserFn } from "./core/browserBailout.js";

/**
 * Renders the matched child route.
 * Used in layout components to specify where child routes should render.
 *
 * When the `pathlessSSROutletDeferral` feature is enabled on the Router and
 * no child route matches during pathless SSR, calls React's `use(browser())`
 * instead of rendering `null`, suspending server rendering at the nearest
 * `<Suspense>` boundary and deferring the content to the browser.
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
    routerContext.features.pathlessSSROutletDeferral &&
    routerContext.url === null
  ) {
    // During pathless SSR, child routes cannot match because there is no URL.
    // use(browser()) suspends server rendering at the nearest <Suspense>
    // boundary, deferring the outlet content to the browser. In the browser,
    // use(browser()) returns undefined and rendering continues.
    use(getBrowserFn()("Route not matched during pathless SSR"));
  }

  return routeContext.outlet;
}
