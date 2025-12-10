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
    const matched = matchRoute(route, pathname, "");
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
  pathname: string,
  parentPath: string
): MatchedRoute[] | null {
  const fullPattern = joinPaths(parentPath, route.path);
  const pattern = createPattern(fullPattern, !route.children?.length);

  const match = pattern.exec({ pathname });
  if (!match) {
    return null;
  }

  const params = extractParams(match.pathname.groups);
  const matchedPathname = match.pathname.input;

  const result: MatchedRoute = {
    route,
    params,
    pathname: matchedPathname,
  };

  // If this route has children, try to match them
  if (route.children?.length) {
    // Get the remaining pathname after this match
    const remainingPathname = getRemainingPathname(pathname, fullPattern);

    for (const child of route.children) {
      const childMatch = matchRoute(child, remainingPathname, "");
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
    // (allows for layout routes with optional children)
    if (route.component) {
      return [result];
    }

    return null;
  }

  return [result];
}

/**
 * Create a URLPattern for a path pattern.
 */
function createPattern(path: string, exact: boolean): URLPattern {
  // Normalize path to always start with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // For non-exact matches (parent routes), allow any suffix
  const patternPath = exact ? normalizedPath : `${normalizedPath}*`;

  return new URLPattern({ pathname: patternPath });
}

/**
 * Join parent and child paths, handling leading/trailing slashes.
 */
function joinPaths(parent: string, child: string): string {
  if (!parent && !child) return "/";
  if (!parent) return child.startsWith("/") ? child : `/${child}`;
  if (!child) return parent;

  const normalizedParent = parent.endsWith("/") ? parent.slice(0, -1) : parent;
  const normalizedChild = child.startsWith("/") ? child : `/${child}`;

  return `${normalizedParent}${normalizedChild}`;
}

/**
 * Extract params from URLPattern groups, filtering out undefined values.
 */
function extractParams(
  groups: Record<string, string | undefined>
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(groups)) {
    if (value !== undefined && key !== "0") {
      params[key] = value;
    }
  }
  return params;
}

/**
 * Get the remaining pathname after matching a pattern.
 */
function getRemainingPathname(pathname: string, matchedPattern: string): string {
  // Count the segments in the matched pattern (excluding param placeholders)
  const patternSegments = matchedPattern
    .split("/")
    .filter((s) => s && !s.startsWith("*"));
  const pathnameSegments = pathname.split("/").filter(Boolean);

  const remaining = pathnameSegments.slice(patternSegments.length);
  return "/" + remaining.join("/");
}
