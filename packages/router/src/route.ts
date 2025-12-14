import type { ComponentType } from "react";

const routeDefinitionSymbol = Symbol();

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
 * Route definition created by the `route` helper function.
 */
export interface OpaqueRouteDefinition {
  [routeDefinitionSymbol]: never;
  path: string;
  children?: RouteDefinition[];
}

/**
 * Any route definition defined by user.
 */
export type RouteDefinition =
  | OpaqueRouteDefinition
  | {
      path: string;
      component?: ComponentType<{}>;
      children?: RouteDefinition[];
    };

/**
 * Route definition with loader - infers TData from loader return type.
 */
type RouteWithLoader<TData> = {
  path: string;
  loader: (args: LoaderArgs) => TData;
  component: ComponentType<{ data: TData }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: RouteDefinition[];
};

/**
 * Route definition without loader.
 */
type RouteWithoutLoader = {
  path: string;
  component?: ComponentType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: RouteDefinition[];
};

/**
 * Helper function for creating type-safe route definitions.
 *
 * When a loader is provided, TypeScript infers the return type and ensures
 * the component accepts a `data` prop of that type.
 *
 * @example
 * ```typescript
 * // Route with async loader
 * route({
 *   path: "users/:userId",
 *   loader: async ({ params, signal }) => {
 *     const res = await fetch(`/api/users/${params.userId}`, { signal });
 *     return res.json() as Promise<User>;
 *   },
 *   component: UserDetail, // Must accept { data: Promise<User> }
 * });
 *
 * // Route without loader
 * route({
 *   path: "about",
 *   component: AboutPage, // No data prop required
 * });
 * ```
 */
export function route<TData>(
  definition: RouteWithLoader<TData>,
): OpaqueRouteDefinition;
export function route(definition: RouteWithoutLoader): OpaqueRouteDefinition;
export function route<TData>(
  definition: RouteWithLoader<TData> | RouteWithoutLoader,
): OpaqueRouteDefinition {
  return definition as OpaqueRouteDefinition;
}
