import { useContext } from "react";
import { RouteContext } from "../context/RouteContext.js";
import type {
  TypefulOpaqueRouteDefinition,
  ExtractRouteParams,
} from "../route.js";

/**
 * Returns typed route parameters for the given route definition.
 * Throws an error if called outside a matching route or if route IDs don't match.
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
  T extends TypefulOpaqueRouteDefinition<
    string,
    Record<string, string>,
    unknown,
    unknown
  >,
>(route: T): ExtractRouteParams<T> {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRouteParams must be used within a route component");
  }

  const expectedId = (route as { id?: string }).id;
  if (expectedId !== undefined && context.id !== expectedId) {
    throw new Error(
      `useRouteParams: Route ID mismatch. Expected "${expectedId}" but current route is "${context.id ?? "(no id)"}"`,
    );
  }

  return context.params as ExtractRouteParams<T>;
}
