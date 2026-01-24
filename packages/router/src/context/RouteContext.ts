import { createContext, type ReactNode } from "react";

export type RouteContextValue = {
  /** Route identifier (if provided in route definition) */
  id: string | undefined;
  /** Matched route parameters extracted from URL */
  params: Record<string, string>;
  /** The matched path pattern */
  matchedPath: string;
  /** Navigation state for this route */
  state: unknown;
  /** Data from loader (if route has loader) */
  data: unknown;
  /** Child route element to render via Outlet */
  outlet: ReactNode;
  /** Parent route context (for nested routes) */
  parent: RouteContextValue | null;
};

export const RouteContext = createContext<RouteContextValue | null>(null);

/**
 * Find a route context by ID in the ancestor chain.
 * Returns the matching context or null if not found.
 */
export function findRouteContextById(
  context: RouteContextValue | null,
  id: string,
): RouteContextValue | null {
  let current = context;
  while (current !== null) {
    if (current.id === id) return current;
    current = current.parent;
  }
  return null;
}
