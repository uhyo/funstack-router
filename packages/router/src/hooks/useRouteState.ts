import { useContext } from "react";
import { RouteContext } from "../context/RouteContext.js";
import type {
  TypefulOpaqueRouteDefinition,
  ExtractRouteState,
} from "../route.js";

/**
 * Returns typed navigation state for the given route definition.
 * Throws an error if called outside a matching route or if route IDs don't match.
 *
 * @example
 * ```typescript
 * type ScrollState = { scrollPos: number };
 * const scrollRoute = routeState<ScrollState>()({
 *   id: "scroll",
 *   path: "/scroll",
 *   component: ScrollPage,
 * });
 *
 * function ScrollPage() {
 *   const state = useRouteState(scrollRoute);
 *   // state is typed as ScrollState | undefined
 *   return <div>Scroll position: {state?.scrollPos ?? 0}</div>;
 * }
 * ```
 */
export function useRouteState<
  T extends TypefulOpaqueRouteDefinition<
    string,
    Record<string, string>,
    unknown,
    unknown
  >,
>(route: T): ExtractRouteState<T> | undefined {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRouteState must be used within a route component");
  }

  const expectedId = (route as { id?: string }).id;
  if (expectedId !== undefined && context.id !== expectedId) {
    throw new Error(
      `useRouteState: Route ID mismatch. Expected "${expectedId}" but current route is "${context.id ?? "(no id)"}"`,
    );
  }

  return context.state as ExtractRouteState<T> | undefined;
}
