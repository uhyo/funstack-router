import { type ReactNode, useContext } from "react";
import { RouteContext } from "./context/RouteContext.js";

/**
 * Renders the matched child route.
 * Used in layout components to specify where child routes should render.
 */
export function Outlet(): ReactNode {
  const routeContext = useContext(RouteContext);

  if (!routeContext) {
    return null;
  }

  return routeContext.outlet;
}
