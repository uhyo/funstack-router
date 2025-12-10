import type { RouteDefinition, MatchedRoute } from "../types.js";

/**
 * Match a pathname against a route tree, returning the matched route stack.
 * Returns null if no match is found.
 */
export function matchRoutes(
  routes: RouteDefinition[],
  pathname: string
): MatchedRoute[] | null {
  for (const route of routes) {
    const matched = matchRoute(route, pathname);
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
  route: RouteDefinition,
  pathname: string
): MatchedRoute[] | null {
  const hasChildren = Boolean(route.children?.length);

  // For parent routes (with children), we need to match as a prefix
  // For leaf routes (no children), we need an exact match
  const { matched, params, consumedPathname } = matchPath(
    route.path,
    pathname,
    !hasChildren
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

    for (const child of route.children!) {
      const childMatch = matchRoute(child, remainingPathname);
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

    // If no children matched but this route has a component, it's still a valid match
    if (route.component) {
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
  exact: boolean
): { matched: boolean; params: Record<string, string>; consumedPathname: string } {
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
