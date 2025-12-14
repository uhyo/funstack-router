import type { ComponentType } from "react";
import type { LoaderArgs, RouteDefinition } from "./types.js";

const routeDefinitionSymbol = Symbol("RouteDefinition");

/**
 * Route definition created by the `route` helper function.
 */
export interface OpaqueRouteDefinition {
  [routeDefinitionSymbol]: never;
  path: string;
  children?: OpaqueRouteDefinition[];
}

/**
 * Route definition with loader - infers TData from loader return type.
 */
type RouteWithLoader<TData> = {
  path: string;
  loader: (args: LoaderArgs) => TData;
  component: ComponentType<{ data: TData }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: RouteDefinition<any>[];
};

/**
 * Route definition without loader.
 */
type RouteWithoutLoader = {
  path: string;
  component?: ComponentType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: RouteDefinition<any>[];
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
