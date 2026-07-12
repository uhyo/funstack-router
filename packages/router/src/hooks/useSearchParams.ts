import { useCallback, useContext } from "react";
import { RouterContext } from "../context/RouterContext.js";

/**
 * Options for the setter returned by `useSearchParams`.
 */
export type SetSearchParamsOptions = {
  /**
   * Replace the current history entry instead of pushing a new one.
   * @default true
   */
  replace?: boolean;
  /**
   * State to associate with the navigation.
   *
   * When omitted, a replace navigation preserves the current entry's state
   * (including per-route state set via `setState`), and a push navigation
   * creates the new entry without state.
   */
  state?: unknown;
};

type SetSearchParams = (
  params:
    | URLSearchParams
    | Record<string, string>
    | ((prev: URLSearchParams) => URLSearchParams | Record<string, string>),
  options?: SetSearchParamsOptions,
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
  const { navigateAsync, locationState } = context;
  const searchParams = currentUrl.searchParams;

  const setSearchParams = useCallback<SetSearchParams>(
    (params, options) => {
      const url = new URL(currentUrl);

      let newParams: URLSearchParams;
      if (typeof params === "function") {
        const result = params(new URLSearchParams(url.search));
        newParams = result instanceof URLSearchParams ? result : new URLSearchParams(result);
      } else if (params instanceof URLSearchParams) {
        newParams = params;
      } else {
        newParams = new URLSearchParams(params);
      }

      url.search = newParams.toString();

      const replace = options?.replace ?? true;
      // Replacing the current entry keeps its state by default; pushing
      // creates a fresh entry without state, like any other push navigation.
      const state =
        options !== undefined && "state" in options
          ? options.state
          : replace
            ? locationState
            : undefined;

      void navigateAsync(url.pathname + url.search + url.hash, {
        replace,
        state,
      });
    },
    [currentUrl, navigateAsync, locationState],
  );

  return [searchParams, setSearchParams];
}
