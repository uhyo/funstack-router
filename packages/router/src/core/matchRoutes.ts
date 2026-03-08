import type { LazyRouteCache } from "../Router/LazyRouteCache.js";
import type { InternalRouteDefinition, MatchedRoute } from "../types.js";

const SKIPPED = Symbol("skipped");
type MatchRouteInternalResult = [
  matches: MatchedRoute[] | typeof SKIPPED | null,
  pendingPromise: Promise<unknown> | null,
];

export type MatchRoutesOptions = {
  /**
   * When true, routes with loaders are skipped during matching.
   * Used during SSR where loaders cannot be executed.
   */
  skipLoaders?: boolean;
};

export type MatchRoutesInput = {
  routes: InternalRouteDefinition[];
  lazyRouteCache: LazyRouteCache;
};

/**
 * Match a pathname against a route tree, returning the matched route stack.
 * Returns null if no match is found.
 */
export function matchRoutes(
  input: MatchRoutesInput,
  pathname: string | null,
  options?: MatchRoutesOptions,
): [matches: MatchedRoute[] | null, pendingPromise: Promise<unknown> | null] {
  const { routes, lazyRouteCache } = input;
  let pendingPromise = null;
  for (const route of routes) {
    const [matched, p] = matchRoute(route, lazyRouteCache, pathname, options);
    pendingPromise ??= p;
    if (matched === SKIPPED) return [null, pendingPromise];
    if (matched) {
      return [matched, pendingPromise];
    }
  }
  return [null, pendingPromise];
}

/**
 * Match a single route and its children recursively.
 */
function matchRoute(
  route: InternalRouteDefinition,
  lazyRouteCache: LazyRouteCache,
  pathname: string | null,
  options?: MatchRoutesOptions,
): MatchRouteInternalResult {
  const children = (() => {
    if (route.children === undefined || Array.isArray(route.children)) {
      return route.children;
    }
    const cacheEntry = lazyRouteCache.get(route.children);
    if (cacheEntry) {
      if (cacheEntry.status === "loaded") {
        return cacheEntry.children;
      }
      return cacheEntry.promise;
    }
    // This is the first time we've hit this lazy route - call the function and cache the promise
    const result = route.children();
    // TODO: update the cache
    return result;
  })();

  if (children instanceof Promise) {
    // For now, treat pending promise as having children to allow matching to continue and show loading states
    return [[], children];
  }

  // Promise (not yet loaded) is treated as having children, to allow matching to continue and show loading states
  const hasChildren = Boolean(children?.length);
  const skipLoaders = options?.skipLoaders ?? false;

  // Routes with loaders can't render during SSR (no request context)
  if ((pathname === null || skipLoaders) && route.loader) {
    if (skipLoaders && pathname !== null) {
      // This route can't render (loader skipped), but check if it would match.
      // If it would, return SKIPPED to prevent fallback routes from matching.
      if (route.path === undefined) {
        return [SKIPPED, null]; // pathless always matches
      }
      const isExact = route.exact ?? !hasChildren;
      const { matched } = matchPath(route.path, pathname, isExact);
      if (matched) return [SKIPPED, null];
    }
    return [null, null];
  }

  // Handle pathless routes - always match, consume nothing
  if (route.path === undefined) {
    const result: MatchedRoute = {
      route,
      params: {},
      pathname: "",
    };

    if (hasChildren) {
      let anySkipped = false;
      for (const child of children!) {
        const [childMatch, pendingPromise] = matchRoute(
          child,
          lazyRouteCache,
          pathname,
          options,
        );
        if (childMatch === SKIPPED) {
          anySkipped = true;
          break;
        }
        if (childMatch) {
          return [[result, ...childMatch], pendingPromise];
        }
      }
      if (anySkipped) {
        if (route.component) return [[result], null]; // render as shell
        return [SKIPPED, null]; // propagate
      }
      // No children matched - only valid if requireChildren is false and route has a component
      if (route.component && route.requireChildren === false) {
        return [[result], null];
      }
      // During SSR, pathless route with component matches alone (SSR shell)
      if ((pathname === null || skipLoaders) && route.component) {
        return [[result], null];
      }
      return [null, null];
    }

    return [[result], null];
  }

  // Path-based routes cannot match when pathname is null
  if (pathname === null) {
    return [null, null];
  }

  const isExact = route.exact ?? !hasChildren;

  const { matched, params, consumedPathname } = matchPath(
    route.path,
    pathname,
    isExact,
  );

  if (!matched) {
    return [null, null];
  }

  const result: MatchedRoute = {
    route,
    params,
    pathname: consumedPathname,
  };

  // If this route has children, try to match them
  if (hasChildren) {
    // Calculate remaining pathname, ensuring it starts with /
    let remainingPathname = pathname.slice(consumedPathname.length);
    if (!remainingPathname.startsWith("/")) {
      remainingPathname = "/" + remainingPathname;
    }
    if (remainingPathname === "") {
      remainingPathname = "/";
    }

    let anyChildSkipped = false;
    for (const child of children!) {
      const [childMatch, pendingPromise] = matchRoute(
        child,
        lazyRouteCache,
        remainingPathname,
        options,
      );
      if (childMatch === SKIPPED) {
        anyChildSkipped = true;
        break;
      }
      if (childMatch) {
        // Merge params from parent into children
        return [
          [
            result,
            ...childMatch.map((m) => ({
              ...m,
              params: { ...params, ...m.params },
            })),
          ],
          pendingPromise,
        ];
      }
    }

    if (anyChildSkipped) {
      if (route.component) return [[result], null]; // render as shell
      return [SKIPPED, null]; // propagate
    }

    // If no children matched - only valid if requireChildren is false and route has a component
    if (route.component && route.requireChildren === false) {
      return [[result], null];
    }

    // During SSR, path-based route with component matches alone (SSR shell)
    if (skipLoaders && route.component) {
      return [[result], null];
    }

    return [null, null];
  }

  return [[result], null];
}

/**
 * Match a path pattern against a pathname.
 */
function matchPath(
  pattern: string,
  pathname: string,
  exact: boolean,
): {
  matched: boolean;
  params: Record<string, string>;
  consumedPathname: string;
} {
  // Normalize pattern
  const normalizedPattern = pattern.startsWith("/") ? pattern : `/${pattern}`;

  // Build URLPattern
  let urlPatternPath: string;
  if (exact) {
    urlPatternPath = normalizedPattern;
  } else if (normalizedPattern === "/") {
    // Special case: root path as prefix matches anything
    urlPatternPath = "/*";
  } else {
    // For other prefix matches, add optional wildcard suffix
    urlPatternPath = `${normalizedPattern}{/*}?`;
  }

  const urlPattern = new URLPattern({ pathname: urlPatternPath });

  const match = urlPattern.exec({ pathname });
  if (!match) {
    return { matched: false, params: {}, consumedPathname: "" };
  }

  // Extract params (excluding the wildcard group "0")
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(match.pathname.groups)) {
    if (value !== undefined && key !== "0") {
      params[key] = value;
    }
  }

  // Calculate consumed pathname
  let consumedPathname: string;
  if (exact) {
    consumedPathname = pathname;
  } else if (normalizedPattern === "/") {
    // Root pattern consumes just "/"
    consumedPathname = "/";
  } else {
    // For prefix matches, calculate based on pattern segments
    const patternSegments = normalizedPattern.split("/").filter(Boolean);
    const pathnameSegments = pathname.split("/").filter(Boolean);
    consumedPathname =
      "/" + pathnameSegments.slice(0, patternSegments.length).join("/");
  }

  return { matched: true, params, consumedPathname };
}
