import type { ComponentType, ReactNode } from "react";
import type {
  OpaqueRouteDefinition,
  PartialRouteDefinition,
  RouteDefinition,
  TypefulOpaqueRouteDefinition,
} from "./route.js";

type BindRouteOptions = {
  component: ComponentType<any> | ReactNode;
  children?: RouteDefinition[];
  exact?: boolean;
  requireChildren?: boolean;
};

/**
 * Binds a component (and optionally children) to a partial route definition,
 * producing a full route definition for use with `<Router />`.
 *
 * This is the Phase 2 of two-phase route definition for RSC:
 * - Phase 1: `route()` without component → `PartialRouteDefinition` (shared module)
 * - Phase 2: `bindRoute()` with component → full route definition (server module)
 *
 * @example
 * ```tsx
 * // Phase 1 (shared module)
 * export const userRoute = route({
 *   id: "user",
 *   path: "/:userId",
 *   loader: fetchUser,
 * });
 *
 * // Phase 2 (server module)
 * const routes = [
 *   bindRoute(userRoute, { component: <UserProfile /> }),
 * ];
 * ```
 */
export function bindRoute<
  TId extends string,
  TParams extends Record<string, string>,
  TState,
  TData,
>(
  partialRoute: PartialRouteDefinition<TId, TParams, TState, TData>,
  binding: BindRouteOptions,
): TypefulOpaqueRouteDefinition<TId, TParams, TState, TData>;
export function bindRoute(
  partialRoute: OpaqueRouteDefinition,
  binding: BindRouteOptions,
): OpaqueRouteDefinition;
export function bindRoute(
  partialRoute: object,
  binding: BindRouteOptions,
): object {
  return { ...partialRoute, ...binding };
}
