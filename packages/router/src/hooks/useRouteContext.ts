import { useContext } from "react";
import {
  RouteContext,
  findRouteContextById,
  type RouteContextValue,
} from "../context/RouteContext.js";

/**
 * Internal hook that returns the RouteContextValue for the given route.
 * If the route has an ID, it searches the ancestor chain for a matching route.
 * If no ID is provided, it returns the current (nearest) route context.
 *
 * @param hookName - Name of the calling hook (for error messages)
 * @param routeId - Optional route ID to search for in the ancestor chain
 * @returns The matching RouteContextValue
 * @throws If called outside a route component or if the route ID is not found
 * @internal
 */
export function useRouteContext(
  hookName: string,
  routeId: string | undefined,
): RouteContextValue {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error(`${hookName} must be used within a route component`);
  }

  // If no expected ID, use current context (backwards compatible)
  if (routeId === undefined) {
    return context;
  }

  // Look for matching route in ancestor chain
  const matchedContext = findRouteContextById(context, routeId);
  if (!matchedContext) {
    throw new Error(
      `${hookName}: Route ID "${routeId}" not found in current route hierarchy. ` +
        `Current route is "${context.id ?? "(no id)"}"`,
    );
  }

  return matchedContext;
}
