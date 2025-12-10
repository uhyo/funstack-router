import { useContext } from "react";
import { RouteContext } from "../context/RouteContext.js";

/**
 * Returns route parameters from the matched path.
 */
export function useParams<
  T extends Record<string, string> = Record<string, string>,
>(): T {
  const context = useContext(RouteContext);

  if (!context) {
    throw new Error("useParams must be used within a Router");
  }

  return context.params as T;
}
