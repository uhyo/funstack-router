import type {
  TypefulOpaqueRouteDefinition,
  PartialRouteDefinition,
  ExtractRouteParams,
} from "../route.js";
import { useRouteContext } from "./useRouteContext.js";

/**
 * Returns typed route parameters for the given route definition.
 * Throws an error if called outside a matching route or if the route ID is not found
 * in the current route hierarchy.
 *
 * @example
 * ```typescript
 * const userRoute = route({
 *   id: "user",
 *   path: "/users/:userId",
 *   component: UserPage,
 * });
 *
 * function UserPage() {
 *   const params = useRouteParams(userRoute);
 *   // params is typed as { userId: string }
 *   return <div>User ID: {params.userId}</div>;
 * }
 * ```
 */
export function useRouteParams<
  T extends
    | TypefulOpaqueRouteDefinition<
        string,
        Record<string, string>,
        unknown,
        unknown
      >
    | PartialRouteDefinition<string, Record<string, string>, unknown, unknown>,
>(route: T): ExtractRouteParams<T> {
  const routeId = (route as { id?: string }).id;
  const context = useRouteContext("useRouteParams", routeId);
  return context.params as ExtractRouteParams<T>;
}
