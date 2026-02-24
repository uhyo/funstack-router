import type {
  TypefulOpaqueRouteDefinition,
  PartialRouteDefinition,
  ExtractRouteState,
} from "../route.js";
import { useRouteContext } from "./useRouteContext.js";

/**
 * Returns typed navigation state for the given route definition.
 * Throws an error if called outside a matching route or if the route ID is not found
 * in the current route hierarchy.
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
  T extends
    | TypefulOpaqueRouteDefinition<
        string,
        Record<string, string>,
        unknown,
        unknown
      >
    | PartialRouteDefinition<string, Record<string, string>, unknown, unknown>,
>(route: T): ExtractRouteState<T> | undefined {
  const routeId = (route as { id?: string }).id;
  const context = useRouteContext("useRouteState", routeId);
  return context.state as ExtractRouteState<T> | undefined;
}
