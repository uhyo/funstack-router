import type { ComponentType, ReactNode } from "react";

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
 * Props for route components without loader.
 * Includes navigation state management props.
 */
export type RouteComponentProps<
  TParams extends Record<string, string>,
  TState = undefined,
> = {
  /** Extracted path parameters */
  params: TParams;
  /** Current navigation state for this route (undefined on first visit) */
  state: TState | undefined;
  /** Update navigation state for this route asynchronously via replace navigation */
  setState: (
    state: TState | ((prev: TState | undefined) => TState),
  ) => Promise<void>;
  /** Update navigation state for this route synchronously via updateCurrentEntry */
  setStateSync: (
    state: TState | ((prev: TState | undefined) => TState),
  ) => void;
  /** Reset navigation state to undefined */
  resetState: () => void;
  /** Ephemeral navigation info (only available during navigation, not persisted) */
  info: unknown;
};

/**
 * Props for route components with loader.
 * Includes data from loader and navigation state management props.
 */
export type RouteComponentPropsWithData<
  TParams extends Record<string, string>,
  TData,
  TState = undefined,
> = RouteComponentProps<TParams, TState> & {
  /** Data returned from the loader */
  data: TData;
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
 * Type-carrying route definition created by the `route` helper function when an `id` is provided.
 * This type carries type information for params, state, and data, enabling type-safe hooks in the future.
 */
export interface TypefulOpaqueRouteDefinition<
  Id extends string,
  Params extends Record<string, string>,
  State,
  Data,
> {
  [routeDefinitionSymbol]: {
    id: Id;
    params: Params;
    state: State;
    data: Data;
  };
  path: string;
  children?: RouteDefinition[];
}

/** Extract the Id type from a TypefulOpaqueRouteDefinition */
export type ExtractRouteId<T> =
  T extends TypefulOpaqueRouteDefinition<
    infer Id,
    infer _Params,
    infer _State,
    infer _Data
  >
    ? Id
    : never;

/** Extract the Params type from a TypefulOpaqueRouteDefinition */
export type ExtractRouteParams<T> =
  T extends TypefulOpaqueRouteDefinition<
    infer _Id,
    infer Params,
    infer _State,
    infer _Data
  >
    ? Params
    : never;

/** Extract the State type from a TypefulOpaqueRouteDefinition */
export type ExtractRouteState<T> =
  T extends TypefulOpaqueRouteDefinition<
    infer _Id,
    infer _Params,
    infer State,
    infer _Data
  >
    ? State
    : never;

/** Extract the Data type from a TypefulOpaqueRouteDefinition */
export type ExtractRouteData<T> =
  T extends TypefulOpaqueRouteDefinition<
    infer _Id,
    infer _Params,
    infer _State,
    infer Data
  >
    ? Data
    : never;

/**
 * Any route definition defined by user.
 */
export type RouteDefinition =
  | OpaqueRouteDefinition
  | TypefulOpaqueRouteDefinition<
      string,
      Record<string, string>,
      unknown,
      unknown
    >
  | {
      path: string;
      component?: ComponentType<object> | ReactNode;
      children?: RouteDefinition[];
    };

/**
 * Route definition with loader - infers TData from loader return type.
 * TPath is used to infer params type from the path pattern.
 * TState is the type of navigation state for this route.
 * TId is the optional route identifier for type-safe route references.
 */
type RouteWithLoader<
  TPath extends string,
  TData,
  TState,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path: TPath;
  loader: (args: LoaderArgs) => TData;
  component:
    | ComponentType<
        RouteComponentPropsWithData<PathParams<TPath>, TData, TState>
      >
    | ReactNode;
  children?: RouteDefinition[];
};

/**
 * Route definition without loader.
 * TPath is used to infer params type from the path pattern.
 * TState is the type of navigation state for this route.
 * TId is the optional route identifier for type-safe route references.
 */
type RouteWithoutLoader<
  TPath extends string,
  TState,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path: TPath;
  component?:
    | ComponentType<RouteComponentProps<PathParams<TPath>, TState>>
    | ReactNode;
  children?: RouteDefinition[];
};

/**
 * Helper function for creating type-safe route definitions.
 *
 * When a loader is provided, TypeScript infers the return type and ensures
 * the component accepts a `data` prop of that type. Components always receive
 * a `params` prop with types inferred from the path pattern.
 *
 * For routes with navigation state, use `routeState<TState>()({ ... })` instead.
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
 *   component: UserDetail, // Must accept { data: Promise<User>, params: { userId: string }, state, setState, resetState }
 * });
 *
 * // Route without loader
 * route({
 *   path: "about",
 *   component: AboutPage, // Must accept { params: {}, state, setState, resetState }
 * });
 * ```
 */
// Overload with id + loader → TypefulOpaqueRouteDefinition
export function route<TId extends string, TPath extends string, TData>(
  definition: RouteWithLoader<TPath, TData, undefined, TId> & { id: TId },
): TypefulOpaqueRouteDefinition<TId, PathParams<TPath>, undefined, TData>;
// Overload with id + no loader → TypefulOpaqueRouteDefinition
export function route<TId extends string, TPath extends string>(
  definition: RouteWithoutLoader<TPath, undefined, TId> & { id: TId },
): TypefulOpaqueRouteDefinition<TId, PathParams<TPath>, undefined, undefined>;
// Overload with loader (no id)
export function route<TPath extends string, TData>(
  definition: RouteWithLoader<TPath, TData, undefined>,
): OpaqueRouteDefinition;
// Overload without loader (no id)
export function route<TPath extends string>(
  definition: RouteWithoutLoader<TPath, undefined>,
): OpaqueRouteDefinition;
// Implementation
export function route<TId extends string, TPath extends string, TData>(
  definition:
    | (RouteWithLoader<TPath, TData, undefined, TId> & { id: TId })
    | (RouteWithoutLoader<TPath, undefined, TId> & { id: TId })
    | RouteWithLoader<TPath, TData, undefined>
    | RouteWithoutLoader<TPath, undefined>,
):
  | TypefulOpaqueRouteDefinition<TId, PathParams<TPath>, undefined, TData>
  | OpaqueRouteDefinition {
  return definition as unknown as OpaqueRouteDefinition;
}

/**
 * Helper function for creating type-safe route definitions with navigation state.
 *
 * Use this curried function when your route component needs to manage navigation state.
 * The state is tied to the navigation history entry and persists across back/forward navigation.
 *
 * @example
 * ```typescript
 * // Route with navigation state
 * type MyState = { scrollPosition: number };
 * routeState<MyState>()({
 *   path: "users/:userId",
 *   component: UserPage, // Receives { params, state, setState, resetState }
 * });
 *
 * // Route with both loader and navigation state
 * type FilterState = { filter: string };
 * routeState<FilterState>()({
 *   path: "products",
 *   loader: async () => fetchProducts(),
 *   component: ProductList, // Receives { data, params, state, setState, resetState }
 * });
 * ```
 */
export function routeState<TState>(): {
  // Overload with id + loader → TypefulOpaqueRouteDefinition
  <TId extends string, TPath extends string, TData>(
    definition: RouteWithLoader<TPath, TData, TState, TId> & { id: TId },
  ): TypefulOpaqueRouteDefinition<TId, PathParams<TPath>, TState, TData>;
  // Overload with id + no loader → TypefulOpaqueRouteDefinition
  <TId extends string, TPath extends string>(
    definition: RouteWithoutLoader<TPath, TState, TId> & { id: TId },
  ): TypefulOpaqueRouteDefinition<TId, PathParams<TPath>, TState, undefined>;
  // Overload with loader (no id)
  <TPath extends string, TData>(
    definition: RouteWithLoader<TPath, TData, TState>,
  ): OpaqueRouteDefinition;
  // Overload without loader (no id)
  <TPath extends string>(
    definition: RouteWithoutLoader<TPath, TState>,
  ): OpaqueRouteDefinition;
} {
  return ((definition: object) => {
    return definition as unknown as OpaqueRouteDefinition;
  }) as never;
}
