import type { ComponentType } from "react";

/**
 * Route definition for the router.
 */
export type RouteDefinition = {
  /** Path pattern to match (e.g., "users/:id") */
  path: string;
  /** Component to render when this route matches */
  component?: ComponentType;
  /** Child routes for nested routing */
  children?: RouteDefinition[];
};

/**
 * A matched route with its parameters.
 */
export type MatchedRoute = {
  /** The original route definition */
  route: RouteDefinition;
  /** Extracted path parameters */
  params: Record<string, string>;
  /** The matched pathname segment */
  pathname: string;
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
