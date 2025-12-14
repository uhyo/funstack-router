import type { ComponentType } from "react";

/**
 * Arguments passed to loader functions.
 */
export type LoaderArgs = {
  /** Extracted path parameters */
  params: Record<string, string>;
  /** Request object with URL and headers */
  request: Request;
  /** AbortSignal for cancellation on navigation */
  signal: AbortSignal;
};

/**
 * Route definition for the router.
 * When a loader is defined, the component receives the loader result as a `data` prop.
 */
export type RouteDefinition<TData = unknown> = {
  /** Path pattern to match (e.g., "users/:id") */
  path: string;
  /** Child routes for nested routing */
  children?: RouteDefinition<unknown>[];
} & (
  | {
      /** Loader function that fetches data for this route */
      loader: (args: LoaderArgs) => TData;
      /** Component to render - receives data prop from loader */
      component: ComponentType<{ data: TData }>;
    }
  | {
      /** No loader defined */
      loader?: never;
      /** Component to render when this route matches */
      component?: ComponentType;
    }
);

/**
 * A matched route with its parameters.
 */
export type MatchedRoute = {
  /** The original route definition */
  route: RouteDefinition<unknown>;
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
