import { useCallback, useContext } from "react";
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

  if (context.url === null) {
    throw new Error("useSearchParams: URL is not available during SSR.");
  }

  const currentUrl = context.url;
  const { navigateAsync } = context;
  const searchParams = currentUrl.searchParams;

  const setSearchParams = useCallback<SetSearchParams>(
    (params) => {
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
      void navigateAsync(url.pathname + url.search + url.hash, {
        replace: true,
      });
    },
    [currentUrl, navigateAsync],
  );

  return [searchParams, setSearchParams];
}
