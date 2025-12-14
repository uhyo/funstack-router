import { useContext, useMemo } from "react";
import { RouterContext } from "../context/RouterContext.js";
import type { Location } from "../types.js";

/**
 * Returns the current location object.
 */
export function useLocation(): Location {
  const context = useContext(RouterContext);

  if (!context) {
    throw new Error("useLocation must be used within a Router");
  }

  return useMemo(() => {
    if (!context.currentEntry.url) {
      return { pathname: "/", search: "", hash: "" };
    }

    const url = new URL(context.currentEntry.url);
    return {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    };
  }, [context.currentEntry.url]);
}
