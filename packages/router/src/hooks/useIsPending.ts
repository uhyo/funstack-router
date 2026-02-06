import { useContext } from "react";
import { RouterContext } from "../context/RouterContext.js";

/**
 * Returns whether a navigation transition is currently pending.
 */
export function useIsPending(): boolean {
  const context = useContext(RouterContext);

  if (!context) {
    throw new Error("useIsPending must be used within a Router");
  }

  return context.isPending;
}
