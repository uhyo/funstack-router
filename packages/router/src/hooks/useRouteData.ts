import type {
  TypefulOpaqueRouteDefinition,
  PartialRouteDefinition,
  ExtractRouteData,
} from "../route.js";
import { useRouteContext } from "./useRouteContext.js";

/**
 * Returns typed loader data for the given route definition.
 * Throws an error if called outside a matching route or if the route ID is not found
 * in the current route hierarchy.
 *
 * @example
 * ```typescript
 * const userRoute = route({
 *   id: "user",
 *   path: "/users/:userId",
 *   loader: async ({ params }) => {
 *     const res = await fetch(`/api/users/${params.userId}`);
 *     return res.json() as Promise<{ name: string; age: number }>;
 *   },
 *   component: UserPage,
 * });
 *
 * function UserPage() {
 *   const data = useRouteData(userRoute);
 *   // data is typed as Promise<{ name: string; age: number }>
 *   return <div>User: {data.name}</div>;
 * }
 * ```
 */
export function useRouteData<
  T extends
    | TypefulOpaqueRouteDefinition<
        string,
        Record<string, string>,
        unknown,
        unknown
      >
    | PartialRouteDefinition<string, Record<string, string>, unknown, unknown>,
>(route: T): ExtractRouteData<T> {
  const routeId = (route as { id?: string }).id;
  const context = useRouteContext("useRouteData", routeId);
  return context.data as ExtractRouteData<T>;
}
