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

  const { url } = context;

  if (url === null) {
    throw new Error("useLocation: URL is not available during SSR.");
  }

  return useMemo(() => {
    return {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    };
  }, [url]);
}
