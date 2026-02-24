import type { ComponentType, ReactNode } from "react";

const routeDefinitionSymbol = Symbol();
const partialRouteDefinitionSymbol = Symbol();

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
 * Arguments passed to action functions.
 * The request carries the POST method and FormData body.
 */
export type ActionArgs<Params extends Record<string, string>> = {
  /** Extracted path parameters */
  params: Params;
  /** Request object with method POST and FormData body */
  request: Request;
  /** AbortSignal for cancellation */
  signal: AbortSignal;
};

/**
 * Arguments passed to loader functions.
 */
export type LoaderArgs<
  Params extends Record<string, string>,
  ActionResult = undefined,
> = {
  /** Extracted path parameters */
  params: Params;
  /** Request object with URL and headers */
  request: Request;
  /** AbortSignal for cancellation on navigation */
  signal: AbortSignal;
  /** Result from the action, if this load was triggered by a form submission */
  actionResult: ActionResult | undefined;
};

/**
 * Props for route components without loader.
 * Includes navigation state management props.
 */
export interface RouteComponentProps<
  TParams extends Record<string, string>,
  TState = undefined,
> {
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
  /** Reset navigation state to undefined asynchronously via replace navigation */
  resetState: () => Promise<void>;
  /** Reset navigation state to undefined synchronously via updateCurrentEntry */
  resetStateSync: () => void;
  /** Ephemeral navigation info (only available during navigation, not persisted) */
  info: unknown;
  /** Whether a navigation transition is pending */
  isPending: boolean;
}

/**
 * Props for route components with loader.
 * Includes data from loader and navigation state management props.
 */
export interface RouteComponentPropsWithData<
  TParams extends Record<string, string>,
  TData,
  TState = undefined,
> extends RouteComponentProps<TParams, TState> {
  /** Data returned from the loader */
  data: TData;
}

/**
 * Route definition created by the `route` helper function.
 */
export interface OpaqueRouteDefinition {
  [routeDefinitionSymbol]: unknown;
  path?: string;
  children?: RouteDefinition[];
  exact?: boolean;
  requireChildren?: boolean;
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
  path?: string;
  children?: RouteDefinition[];
  exact?: boolean;
  requireChildren?: boolean;
}

/**
 * Partial route definition created by the `route` helper function when `id` is provided but `component` is not.
 * Used for two-phase route definition in RSC: Phase 1 defines id, path, loader, action;
 * Phase 2 uses `bindRoute()` to attach the component.
 * This type carries type information for params, state, and data, enabling type-safe hooks.
 */
export interface PartialRouteDefinition<
  Id extends string,
  Params extends Record<string, string>,
  State,
  Data,
> {
  [partialRouteDefinitionSymbol]: {
    id: Id;
    params: Params;
    state: State;
    data: Data;
  };
  path?: string;
}

/** Extract the Id type from a TypefulOpaqueRouteDefinition or PartialRouteDefinition */
export type ExtractRouteId<T> =
  T extends PartialRouteDefinition<
    infer Id,
    infer _Params,
    infer _State,
    infer _Data
  >
    ? Id
    : T extends TypefulOpaqueRouteDefinition<
          infer Id,
          infer _Params,
          infer _State,
          infer _Data
        >
      ? Id
      : never;

/** Extract the Params type from a TypefulOpaqueRouteDefinition or PartialRouteDefinition */
export type ExtractRouteParams<T> =
  T extends PartialRouteDefinition<
    infer _Id,
    infer Params,
    infer _State,
    infer _Data
  >
    ? Params
    : T extends TypefulOpaqueRouteDefinition<
          infer _Id,
          infer Params,
          infer _State,
          infer _Data
        >
      ? Params
      : never;

/** Extract the State type from a TypefulOpaqueRouteDefinition or PartialRouteDefinition */
export type ExtractRouteState<T> =
  T extends PartialRouteDefinition<
    infer _Id,
    infer _Params,
    infer State,
    infer _Data
  >
    ? State
    : T extends TypefulOpaqueRouteDefinition<
          infer _Id,
          infer _Params,
          infer State,
          infer _Data
        >
      ? State
      : never;

/** Extract the Data type from a TypefulOpaqueRouteDefinition or PartialRouteDefinition */
export type ExtractRouteData<T> =
  T extends PartialRouteDefinition<
    infer _Id,
    infer _Params,
    infer _State,
    infer Data
  >
    ? Data
    : T extends TypefulOpaqueRouteDefinition<
          infer _Id,
          infer _Params,
          infer _State,
          infer Data
        >
      ? Data
      : never;

/** Extract the component props type from a TypefulOpaqueRouteDefinition or PartialRouteDefinition */
export type RouteComponentPropsOf<
  T extends
    | TypefulOpaqueRouteDefinition<
        string,
        Record<string, string>,
        unknown,
        unknown
      >
    | PartialRouteDefinition<string, Record<string, string>, unknown, unknown>,
> =
  T extends PartialRouteDefinition<
    infer _Id,
    infer Params,
    infer State,
    infer Data
  >
    ? Data extends undefined
      ? RouteComponentProps<Params, State>
      : RouteComponentPropsWithData<Params, Data, State>
    : T extends TypefulOpaqueRouteDefinition<
          infer _Id,
          infer Params,
          infer State,
          infer Data
        >
      ? Data extends undefined
        ? RouteComponentProps<Params, State>
        : RouteComponentPropsWithData<Params, Data, State>
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
      path?: string;
      component?: ComponentType<object> | ReactNode;
      children?: RouteDefinition[];
      exact?: boolean;
      requireChildren?: boolean;
    };

/**
 * Route definition with action and loader.
 * Action result flows to loader via actionResult parameter.
 */
type RouteWithActionAndLoader<
  TPath extends string,
  TActionResult,
  TData,
  TState,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path: TPath;
  action: (args: ActionArgs<PathParams<TPath>>) => TActionResult;
  loader: (
    args: LoaderArgs<PathParams<TPath>, Awaited<TActionResult>>,
  ) => TData;
  component:
    | ComponentType<
        RouteComponentPropsWithData<PathParams<TPath>, TData, TState>
      >
    | ReactNode;
  children?: RouteDefinition[];
  exact?: boolean;
  requireChildren?: boolean;
};

/**
 * Route definition with action only (no loader).
 * Action executes as a pure side effect.
 */
type RouteWithActionOnly<
  TPath extends string,
  TState,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path: TPath;
  action: (args: ActionArgs<PathParams<TPath>>) => unknown;
  component?:
    | ComponentType<RouteComponentProps<PathParams<TPath>, TState>>
    | ReactNode;
  children?: RouteDefinition[];
  exact?: boolean;
  requireChildren?: boolean;
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
  loader: (args: LoaderArgs<PathParams<TPath>>) => TData;
  component:
    | ComponentType<
        RouteComponentPropsWithData<PathParams<TPath>, TData, TState>
      >
    | ReactNode;
  children?: RouteDefinition[];
  exact?: boolean;
  requireChildren?: boolean;
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
  exact?: boolean;
  requireChildren?: boolean;
};

/**
 * Pathless route definition with loader.
 * Pathless routes always match and don't consume any pathname.
 */
type PathlessRouteWithLoader<
  TData,
  TState,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path?: undefined;
  loader: (args: LoaderArgs<Record<string, never>>) => TData;
  component:
    | ComponentType<
        RouteComponentPropsWithData<Record<string, never>, TData, TState>
      >
    | ReactNode;
  children?: RouteDefinition[];
  requireChildren?: boolean;
};

/**
 * Pathless route definition without loader.
 * Pathless routes always match and don't consume any pathname.
 */
type PathlessRouteWithoutLoader<
  TState,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path?: undefined;
  component?:
    | ComponentType<RouteComponentProps<Record<string, never>, TState>>
    | ReactNode;
  children?: RouteDefinition[];
  requireChildren?: boolean;
};

/**
 * Partial route definition with action and loader (no component).
 * Used for two-phase route definition.
 */
type PartialRouteWithActionAndLoader<
  TPath extends string,
  TActionResult,
  TData,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path: TPath;
  action: (args: ActionArgs<PathParams<TPath>>) => TActionResult;
  loader: (
    args: LoaderArgs<PathParams<TPath>, Awaited<TActionResult>>,
  ) => TData;
  component?: never;
  children?: never;
  exact?: never;
  requireChildren?: never;
};

/**
 * Partial route definition with action only (no component, no loader).
 */
type PartialRouteWithActionOnly<
  TPath extends string,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path: TPath;
  action: (args: ActionArgs<PathParams<TPath>>) => unknown;
  component?: never;
  children?: never;
  exact?: never;
  requireChildren?: never;
};

/**
 * Partial route definition with loader (no component).
 */
type PartialRouteWithLoader<
  TPath extends string,
  TData,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path: TPath;
  loader: (args: LoaderArgs<PathParams<TPath>>) => TData;
  component?: never;
  children?: never;
  exact?: never;
  requireChildren?: never;
};

/**
 * Partial route definition without loader or component.
 */
type PartialRouteWithoutLoader<
  TPath extends string,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path: TPath;
  component?: never;
  children?: never;
  exact?: never;
  requireChildren?: never;
};

/**
 * Partial pathless route definition with loader (no component).
 */
type PartialPathlessRouteWithLoader<
  TData,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path?: undefined;
  loader: (args: LoaderArgs<Record<string, never>>) => TData;
  component?: never;
  children?: never;
  exact?: never;
  requireChildren?: never;
};

/**
 * Partial pathless route definition without loader or component.
 */
type PartialPathlessRouteWithoutLoader<
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path?: undefined;
  component?: never;
  children?: never;
  exact?: never;
  requireChildren?: never;
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
// Partial overload: id + action + loader (no component) → PartialRouteDefinition
export function route<
  TId extends string,
  const TPath extends string,
  TActionResult,
  TData,
>(
  definition: PartialRouteWithActionAndLoader<
    TPath,
    TActionResult,
    TData,
    TId
  > & {
    id: TId;
  },
): PartialRouteDefinition<TId, PathParams<TPath>, undefined, TData>;
// Partial overload: id + action only (no component) → PartialRouteDefinition
export function route<TId extends string, const TPath extends string>(
  definition: PartialRouteWithActionOnly<TPath, TId> & { id: TId },
): PartialRouteDefinition<TId, PathParams<TPath>, undefined, undefined>;
// Partial overload: id + pathless + loader (no component) → PartialRouteDefinition
export function route<TId extends string, TData>(
  definition: PartialPathlessRouteWithLoader<TData, TId> & { id: TId },
): PartialRouteDefinition<TId, Record<string, never>, undefined, TData>;
// Partial overload: id + pathless + no loader (no component) → PartialRouteDefinition
export function route<TId extends string>(
  definition: PartialPathlessRouteWithoutLoader<TId> & { id: TId },
): PartialRouteDefinition<TId, Record<string, never>, undefined, undefined>;
// Partial overload: id + loader (no component) → PartialRouteDefinition
export function route<TId extends string, const TPath extends string, TData>(
  definition: PartialRouteWithLoader<TPath, TData, TId> & { id: TId },
): PartialRouteDefinition<TId, PathParams<TPath>, undefined, TData>;
// Partial overload: id + no loader (no component) → PartialRouteDefinition
export function route<TId extends string, const TPath extends string>(
  definition: PartialRouteWithoutLoader<TPath, TId> & { id: TId },
): PartialRouteDefinition<TId, PathParams<TPath>, undefined, undefined>;
// Overload with id + action + loader → TypefulOpaqueRouteDefinition
export function route<
  TId extends string,
  const TPath extends string,
  TActionResult,
  TData,
>(
  definition: RouteWithActionAndLoader<
    TPath,
    TActionResult,
    TData,
    undefined,
    TId
  > & { id: TId },
): TypefulOpaqueRouteDefinition<TId, PathParams<TPath>, undefined, TData>;
// Overload with id + action only → TypefulOpaqueRouteDefinition
export function route<TId extends string, const TPath extends string>(
  definition: RouteWithActionOnly<TPath, undefined, TId> & { id: TId },
): TypefulOpaqueRouteDefinition<TId, PathParams<TPath>, undefined, undefined>;
// Overload with action + loader (no id)
export function route<const TPath extends string, TActionResult, TData>(
  definition: RouteWithActionAndLoader<TPath, TActionResult, TData, undefined>,
): OpaqueRouteDefinition;
// Overload with action only (no id)
export function route<const TPath extends string>(
  definition: RouteWithActionOnly<TPath, undefined>,
): OpaqueRouteDefinition;
// Pathless overload with id + loader → TypefulOpaqueRouteDefinition
export function route<TId extends string, TData>(
  definition: PathlessRouteWithLoader<TData, undefined, TId> & { id: TId },
): TypefulOpaqueRouteDefinition<TId, Record<string, never>, undefined, TData>;
// Pathless overload with id + no loader → TypefulOpaqueRouteDefinition
export function route<TId extends string>(
  definition: PathlessRouteWithoutLoader<undefined, TId> & { id: TId },
): TypefulOpaqueRouteDefinition<
  TId,
  Record<string, never>,
  undefined,
  undefined
>;
// Pathless overload with loader (no id)
export function route<TData>(
  definition: PathlessRouteWithLoader<TData, undefined>,
): OpaqueRouteDefinition;
// Pathless overload without loader (no id)
export function route(
  definition: PathlessRouteWithoutLoader<undefined>,
): OpaqueRouteDefinition;
// Overload with id + loader → TypefulOpaqueRouteDefinition
export function route<TId extends string, const TPath extends string, TData>(
  definition: RouteWithLoader<TPath, TData, undefined, TId> & { id: TId },
): TypefulOpaqueRouteDefinition<TId, PathParams<TPath>, undefined, TData>;
// Overload with id + no loader → TypefulOpaqueRouteDefinition
export function route<TId extends string, const TPath extends string>(
  definition: RouteWithoutLoader<TPath, undefined, TId> & { id: TId },
): TypefulOpaqueRouteDefinition<TId, PathParams<TPath>, undefined, undefined>;
// Overload with loader (no id)
export function route<const TPath extends string, TData>(
  definition: RouteWithLoader<TPath, TData, undefined>,
): OpaqueRouteDefinition;
// Overload without loader (no id)
export function route<const TPath extends string>(
  definition: RouteWithoutLoader<TPath, undefined>,
): OpaqueRouteDefinition;
// Implementation
export function route(
  definition: object,
):
  | OpaqueRouteDefinition
  | PartialRouteDefinition<string, Record<string, string>, unknown, unknown> {
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
  // Partial overload: id + action + loader (no component) → PartialRouteDefinition
  <TId extends string, TPath extends string, TActionResult, TData>(
    definition: PartialRouteWithActionAndLoader<
      TPath,
      TActionResult,
      TData,
      TId
    > & { id: TId },
  ): PartialRouteDefinition<TId, PathParams<TPath>, TState, TData>;
  // Partial overload: id + action only (no component) → PartialRouteDefinition
  <TId extends string, TPath extends string>(
    definition: PartialRouteWithActionOnly<TPath, TId> & { id: TId },
  ): PartialRouteDefinition<TId, PathParams<TPath>, TState, undefined>;
  // Partial overload: id + pathless + loader (no component) → PartialRouteDefinition
  <TId extends string, TData>(
    definition: PartialPathlessRouteWithLoader<TData, TId> & { id: TId },
  ): PartialRouteDefinition<TId, Record<string, never>, TState, TData>;
  // Partial overload: id + pathless + no loader (no component) → PartialRouteDefinition
  <TId extends string>(
    definition: PartialPathlessRouteWithoutLoader<TId> & { id: TId },
  ): PartialRouteDefinition<TId, Record<string, never>, TState, undefined>;
  // Partial overload: id + loader (no component) → PartialRouteDefinition
  <TId extends string, TPath extends string, TData>(
    definition: PartialRouteWithLoader<TPath, TData, TId> & { id: TId },
  ): PartialRouteDefinition<TId, PathParams<TPath>, TState, TData>;
  // Partial overload: id + no loader (no component) → PartialRouteDefinition
  <TId extends string, TPath extends string>(
    definition: PartialRouteWithoutLoader<TPath, TId> & { id: TId },
  ): PartialRouteDefinition<TId, PathParams<TPath>, TState, undefined>;
  // Overload with id + action + loader → TypefulOpaqueRouteDefinition
  <TId extends string, TPath extends string, TActionResult, TData>(
    definition: RouteWithActionAndLoader<
      TPath,
      TActionResult,
      TData,
      TState,
      TId
    > & { id: TId },
  ): TypefulOpaqueRouteDefinition<TId, PathParams<TPath>, TState, TData>;
  // Overload with id + action only → TypefulOpaqueRouteDefinition
  <TId extends string, TPath extends string>(
    definition: RouteWithActionOnly<TPath, TState, TId> & { id: TId },
  ): TypefulOpaqueRouteDefinition<TId, PathParams<TPath>, TState, undefined>;
  // Overload with action + loader (no id)
  <TPath extends string, TActionResult, TData>(
    definition: RouteWithActionAndLoader<TPath, TActionResult, TData, TState>,
  ): OpaqueRouteDefinition;
  // Overload with action only (no id)
  <TPath extends string>(
    definition: RouteWithActionOnly<TPath, TState>,
  ): OpaqueRouteDefinition;
  // Pathless overload with id + loader → TypefulOpaqueRouteDefinition
  <TId extends string, TData>(
    definition: PathlessRouteWithLoader<TData, TState, TId> & { id: TId },
  ): TypefulOpaqueRouteDefinition<TId, Record<string, never>, TState, TData>;
  // Pathless overload with id + no loader → TypefulOpaqueRouteDefinition
  <TId extends string>(
    definition: PathlessRouteWithoutLoader<TState, TId> & { id: TId },
  ): TypefulOpaqueRouteDefinition<
    TId,
    Record<string, never>,
    TState,
    undefined
  >;
  // Pathless overload with loader (no id)
  <TData>(
    definition: PathlessRouteWithLoader<TData, TState>,
  ): OpaqueRouteDefinition;
  // Pathless overload without loader (no id)
  (definition: PathlessRouteWithoutLoader<TState>): OpaqueRouteDefinition;
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
