import { useContext } from "react";
import { RouterContext } from "../context/RouterContext.js";
import type { NavigateOptions } from "../types.js";

/**
 * Returns a function for programmatic navigation.
 */
export function useNavigate(): (to: string, options?: NavigateOptions) => void {
  const context = useContext(RouterContext);

  if (!context) {
    throw new Error("useNavigate must be used within a Router");
  }

  return context.navigate;
}
