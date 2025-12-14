import type { ComponentType } from "react";
import type { LoaderArgs, RouteDefinition } from "./route.js";

const InternalRouteDefinitionSymbol = Symbol();

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
  component?: ComponentType<{ data?: unknown }>;
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
