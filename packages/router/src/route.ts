import type { ComponentType } from "react";

const routeDefinitionSymbol = Symbol();

/**
 * Extracts parameter names from a path pattern.
 * E.g., "/users/:id/posts/:postId" -> "id" | "postId"
 */
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

/**
 * Creates a params object type from a path pattern.
 * E.g., "/users/:id" -> { id: string }
 */
export type PathParams<T extends string> = [ExtractParams<T>] extends [never]
  ? Record<string, never>
  : { [K in ExtractParams<T>]: string };

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
 * TPath is used to infer params type from the path pattern.
 */
type RouteWithLoader<TPath extends string, TData> = {
  path: TPath;
  loader: (args: LoaderArgs) => TData;
  component: ComponentType<{ data: TData; params: PathParams<TPath> }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: RouteDefinition[];
};

/**
 * Route definition without loader.
 * TPath is used to infer params type from the path pattern.
 */
type RouteWithoutLoader<TPath extends string> = {
  path: TPath;
  component?: ComponentType<{ params: PathParams<TPath> }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: RouteDefinition[];
};

/**
 * Helper function for creating type-safe route definitions.
 *
 * When a loader is provided, TypeScript infers the return type and ensures
 * the component accepts a `data` prop of that type. Components always receive
 * a `params` prop with types inferred from the path pattern.
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
 *   component: UserDetail, // Must accept { data: Promise<User>, params: { userId: string } }
 * });
 *
 * // Route without loader
 * route({
 *   path: "about",
 *   component: AboutPage, // Must accept { params: {} }
 * });
 * ```
 */
export function route<TPath extends string, TData>(
  definition: RouteWithLoader<TPath, TData>,
): OpaqueRouteDefinition;
export function route<TPath extends string>(
  definition: RouteWithoutLoader<TPath>,
): OpaqueRouteDefinition;
export function route<TPath extends string, TData>(
  definition: RouteWithLoader<TPath, TData> | RouteWithoutLoader<TPath>,
): OpaqueRouteDefinition {
  return definition as unknown as OpaqueRouteDefinition;
}
