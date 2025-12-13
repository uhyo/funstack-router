import { useContext } from "react";
import { RouteContext } from "../context/RouteContext.js";

/**
 * Returns the data from the route's loader function.
 * Must be used within a route that has a loader defined.
 *
 * @example
 * ```tsx
 * const loader = async ({ params }) => {
 *   const user = await fetchUser(params.id);
 *   return { user };
 * };
 *
 * function UserProfile() {
 *   const { user } = useLoaderData<{ user: User }>();
 *   return <div>{user.name}</div>;
 * }
 * ```
 */
export function useLoaderData<T = unknown>(): T {
  const context = useContext(RouteContext);

  if (!context) {
    throw new Error("useLoaderData must be used within a Router");
  }

  return context.loaderData as T;
}
