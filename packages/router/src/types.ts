import type { ComponentType } from "react";
import type { LoaderArgs, RouteDefinition } from "./route.js";

const InternalRouteDefinitionSymbol = Symbol();

/**
 * Internal structure for storing per-route state in NavigationHistoryEntry.
 * Each route in the matched stack gets its own state slot indexed by match position.
 */
export type InternalRouteState = {
  __routeStates: (unknown | undefined)[];
};

/**
 * Route definition for the router.
 * When a loader is defined, the component receives the loader result as a `data` prop.
 */
export type InternalRouteDefinition = {
  [InternalRouteDefinitionSymbol]: never;
  /** Path pattern to match (e.g., "users/:id") */
  path: string;
  /** Child routes for nested routing */
  children?: InternalRouteDefinition[];

  // Note: `loader` and `component` may both exist or both not exist.
  // Also, `unknown`s may actually be more specific types. They are guaranteed
  // to be the same type by the `route` helper function.
  /** Data loader function for this route */
  loader?: (args: LoaderArgs) => unknown;
  /** Component to render when this route matches */
  component?: ComponentType<{
    data?: unknown;
    params?: Record<string, string>;
    state?: unknown;
    setState?: (state: unknown | ((prev: unknown) => unknown)) => void;
    resetState?: () => void;
  }>;
};

/**
 * Converts user-defined routes to internal route definitions.
 * This function is used internally by the Router.
 *
 * Actually, this function just performs a type assertion since
 * both RouteDefinition and InternalRouteDefinition have the same runtime shape.
 */
export function internalRoutes(
  routes: RouteDefinition[],
): InternalRouteDefinition[] {
  return routes as InternalRouteDefinition[];
}

/**
 * A matched route with its parameters.
 */
export type MatchedRoute = {
  /** The original route definition */
  route: InternalRouteDefinition;
  /** Extracted path parameters */
  params: Record<string, string>;
  /** The matched pathname segment */
  pathname: string;
};

/**
 * A matched route with loader data.
 */
export type MatchedRouteWithData = MatchedRoute & {
  /** Data returned from the loader (undefined if no loader) */
  data: unknown | undefined;
};

/**
 * Options for navigation.
 */
export type NavigateOptions = {
  /** Replace current history entry instead of pushing */
  replace?: boolean;
  /** State to associate with the navigation */
  state?: unknown;
};

/**
 * Location object representing current URL state.
 */
export type Location = {
  pathname: string;
  search: string;
  hash: string;
};

/**
 * Callback invoked before navigation is intercepted.
 * Call `event.preventDefault()` to prevent the router from handling this navigation.
 *
 * @param event - The NavigateEvent from the Navigation API
 * @param matched - Array of matched routes, or null if no routes matched
 */
export type OnNavigateCallback = (
  event: NavigateEvent,
  matched: readonly MatchedRoute[] | null,
) => void;

/**
 * Fallback mode when Navigation API is unavailable.
 *
 * - `"none"` (default): Render nothing when Navigation API is unavailable
 * - `"static"`: Render matched routes without navigation capabilities (MPA behavior)
 */
export type FallbackMode =
  | "none" // Default: render nothing when Navigation API unavailable
  | "static"; // Render matched routes without navigation capabilities
