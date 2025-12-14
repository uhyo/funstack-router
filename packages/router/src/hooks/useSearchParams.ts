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

  const searchParams = context.url.searchParams;

  const setSearchParams = useCallback<SetSearchParams>(
    (params) => {
      const url = new URL(context.url);

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
