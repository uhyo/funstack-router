import { useContext, useMemo } from "react";
import { RouterContext } from "../context/RouterContext.js";
import type { Location } from "../types.js";

/**
 * Returns the current location object, or `null` when the URL is not available (e.g. during SSR).
 */
export function useLocationSSR(): Location | null {
  const context = useContext(RouterContext);

  if (!context) {
    throw new Error("useLocationSSR must be used within a Router");
  }

  const { url } = context;

  return useMemo(() => {
    if (url === null) return null;
    return {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    };
  }, [url]);
}
