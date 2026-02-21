import type { InternalRouteDefinition, MatchedRoute } from "../types.js";

const SKIPPED = Symbol("skipped");
type MatchRouteInternalResult = MatchedRoute[] | typeof SKIPPED | null;

export type MatchRoutesOptions = {
  /**
   * When true, routes with loaders are skipped during matching.
   * Used during SSR where loaders cannot be executed.
   */
  skipLoaders?: boolean;
};

/**
 * Match a pathname against a route tree, returning the matched route stack.
 * Returns null if no match is found.
 */
export function matchRoutes(
  routes: InternalRouteDefinition[],
  pathname: string | null,
  options?: MatchRoutesOptions,
): MatchedRoute[] | null {
  for (const route of routes) {
    const matched = matchRoute(route, pathname, options);
    if (matched === SKIPPED) return null;
    if (matched) {
      return matched;
    }
  }
  return null;
}

/**
 * Match a single route and its children recursively.
 */
function matchRoute(
  route: InternalRouteDefinition,
  pathname: string | null,
  options?: MatchRoutesOptions,
): MatchRouteInternalResult {
  const hasChildren = Boolean(route.children?.length);
  const skipLoaders = options?.skipLoaders ?? false;

  // Routes with loaders can't render during SSR (no request context)
  if ((pathname === null || skipLoaders) && route.loader) {
    if (skipLoaders && pathname !== null) {
      // This route can't render (loader skipped), but check if it would match.
      // If it would, return SKIPPED to prevent fallback routes from matching.
      if (route.path === undefined) {
        return SKIPPED; // pathless always matches
      }
      const isExact = route.exact ?? !hasChildren;
      const { matched } = matchPath(route.path, pathname, isExact);
      if (matched) return SKIPPED;
    }
    return null;
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
      for (const child of route.children!) {
        const childMatch = matchRoute(child, pathname, options);
        if (childMatch === SKIPPED) {
          anySkipped = true;
          break;
        }
        if (childMatch) {
          return [result, ...childMatch];
        }
      }
      if (anySkipped) {
        if (route.component) return [result]; // render as shell
        return SKIPPED; // propagate
      }
      // No children matched - only valid if requireChildren is false and route has a component
      if (route.component && route.requireChildren === false) {
        return [result];
      }
      // During SSR, pathless route with component matches alone (SSR shell)
      if ((pathname === null || skipLoaders) && route.component) {
        return [result];
      }
      return null;
    }

    return [result];
  }

  // Path-based routes cannot match when pathname is null
  if (pathname === null) {
    return null;
  }

  const isExact = route.exact ?? !hasChildren;

  const { matched, params, consumedPathname } = matchPath(
    route.path,
    pathname,
    isExact,
  );

  if (!matched) {
    return null;
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
    for (const child of route.children!) {
      const childMatch = matchRoute(child, remainingPathname, options);
      if (childMatch === SKIPPED) {
        anyChildSkipped = true;
        break;
      }
      if (childMatch) {
        // Merge params from parent into children
        return [
          result,
          ...childMatch.map((m) => ({
            ...m,
            params: { ...params, ...m.params },
          })),
        ];
      }
    }

    if (anyChildSkipped) {
      if (route.component) return [result]; // render as shell
      return SKIPPED; // propagate
    }

    // If no children matched - only valid if requireChildren is false and route has a component
    if (route.component && route.requireChildren === false) {
      return [result];
    }

    // During SSR, path-based route with component matches alone (SSR shell)
    if (skipLoaders && route.component) {
      return [result];
    }

    return null;
  }

  return [result];
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
