import { useContext } from "react";
import { RouteContext } from "../context/RouteContext.js";
import type {
  TypefulOpaqueRouteDefinition,
  ExtractRouteData,
} from "../route.js";

/**
 * Returns typed loader data for the given route definition.
 * Throws an error if called outside a matching route or if route IDs don't match.
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
  T extends TypefulOpaqueRouteDefinition<
    string,
    Record<string, string>,
    unknown,
    unknown
  >,
>(route: T): ExtractRouteData<T> {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRouteData must be used within a route component");
  }

  const expectedId = (route as { id?: string }).id;
  if (expectedId !== undefined && context.id !== expectedId) {
    throw new Error(
      `useRouteData: Route ID mismatch. Expected "${expectedId}" but current route is "${context.id ?? "(no id)"}"`,
    );
  }

  return context.data as ExtractRouteData<T>;
}
