import { useCallback, useContext, useMemo } from "react";
import { RouterContext } from "../context/RouterContext.js";

type SetSearchParams = (
  params:
    | URLSearchParams
    | Record<string, string>
    | ((prev: URLSearchParams) => URLSearchParams | Record<string, string>),
) => void;

/**
 * Returns and allows manipulation of URL search parameters.
 */
export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  const context = useContext(RouterContext);

  if (!context) {
    throw new Error("useSearchParams must be used within a Router");
  }

  const searchParams = useMemo(() => {
    if (!context.currentEntry?.url) {
      return new URLSearchParams();
    }
    const url = new URL(context.currentEntry.url);
    return url.searchParams;
  }, [context.currentEntry?.url]);

  const setSearchParams = useCallback<SetSearchParams>(
    (params) => {
      const currentUrl = context.currentEntry?.url;
      if (!currentUrl) return;

      const url = new URL(currentUrl);

      let newParams: URLSearchParams;
      if (typeof params === "function") {
        const result = params(new URLSearchParams(url.search));
        newParams =
          result instanceof URLSearchParams
            ? result
            : new URLSearchParams(result);
      } else if (params instanceof URLSearchParams) {
        newParams = params;
      } else {
        newParams = new URLSearchParams(params);
      }

      url.search = newParams.toString();
      context.navigate(url.pathname + url.search + url.hash, { replace: true });
    },
    [context],
  );

  return [searchParams, setSearchParams];
}
