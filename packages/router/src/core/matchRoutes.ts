import type { InternalRouteDefinition, MatchedRoute, TrailingSlashMode } from "../types.js";

const SKIPPED = Symbol("skipped");
type MatchRouteInternalResult = MatchedRoute[] | typeof SKIPPED | null;

export type MatchRoutesOptions = {
  /**
   * When true, routes with loaders are skipped during matching.
   * Used during SSR where loaders cannot be executed.
   */
  skipLoaders?: boolean;
  /**
   * How trailing slashes are treated during matching.
   *
   * @default "ignore"
   */
  trailingSlash?: TrailingSlashMode;
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
  const normalizedPathname =
    pathname !== null && (options?.trailingSlash ?? "ignore") === "ignore"
      ? stripTrailingSlash(pathname)
      : pathname;
  for (const route of routes) {
    const matched = matchRoute(route, normalizedPathname, options);
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
      if (matchPath(route.path, pathname, isExact, options?.trailingSlash).length > 0) {
        return SKIPPED;
      }
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

  const candidates = matchPath(route.path, pathname, isExact, options?.trailingSlash);

  if (candidates.length === 0) {
    return null;
  }

  if (!hasChildren) {
    const { params, consumedPathname } = candidates[0]!;
    return [{ route, params, pathname: consumedPathname }];
  }

  // Try each candidate consumed prefix (longest first), backtracking to a
  // shorter prefix when no child matches the remaining pathname.
  let anyChildSkipped = false;
  for (const { params, consumedPathname } of candidates) {
    // Calculate remaining pathname, ensuring it starts with /
    let remainingPathname = pathname.slice(consumedPathname.length);
    if (!remainingPathname.startsWith("/")) {
      remainingPathname = "/" + remainingPathname;
    }

    for (const child of route.children!) {
      const childMatch = matchRoute(child, remainingPathname, options);
      if (childMatch === SKIPPED) {
        anyChildSkipped = true;
        break;
      }
      if (childMatch) {
        // Merge params from parent into children
        return [
          { route, params, pathname: consumedPathname },
          ...childMatch.map((m) => ({
            ...m,
            params: { ...params, ...m.params },
          })),
        ];
      }
    }

    // A skipped child would match on the client; stop here so a shorter
    // prefix cannot produce a different tree during SSR.
    if (anyChildSkipped) break;
  }

  const { params, consumedPathname } = candidates[0]!;
  const result: MatchedRoute = {
    route,
    params,
    pathname: consumedPathname,
  };

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

type PathMatchCandidate = {
  params: Record<string, string>;
  consumedPathname: string;
};

/**
 * Strip a single trailing slash from a pathname or pattern. The root `/` is
 * left untouched, and only one slash is stripped (`/users//` is not repaired
 * to `/users`).
 */
function stripTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * Matches a pattern segment that always consumes exactly one pathname
 * segment: either a literal without URLPattern syntax, or a plain `:param`.
 */
const SINGLE_SEGMENT_PATTERN = /^(?::[A-Za-z0-9_$]+|[^:*?+(){}\\]*)$/;

function consumesOneSegmentEach(pattern: string): boolean {
  return pattern.split("/").every((segment) => SINGLE_SEGMENT_PATTERN.test(segment));
}

/**
 * Match a path pattern against a pathname.
 *
 * For non-exact (prefix) matches, the pattern may consume a variable number
 * of pathname segments (e.g. with `?`, `+`, `*` modifiers), so multiple
 * candidates can be returned, ordered from longest to shortest consumed
 * prefix. Returns an empty array if the pattern doesn't match at all.
 */
function matchPath(
  pattern: string,
  pathname: string,
  exact: boolean,
  trailingSlash: TrailingSlashMode = "ignore",
): PathMatchCandidate[] {
  // Normalize pattern
  const slashPrefixedPattern = pattern.startsWith("/") ? pattern : `/${pattern}`;
  const normalizedPattern =
    trailingSlash === "ignore" ? stripTrailingSlash(slashPrefixedPattern) : slashPrefixedPattern;

  if (exact) {
    const match = new URLPattern({ pathname: normalizedPattern }).exec({
      pathname,
    });
    if (!match) {
      return [];
    }
    return [{ params: extractParams(match), consumedPathname: pathname }];
  }

  if (normalizedPattern === "/") {
    // Special case: root path as prefix matches anything, consuming just "/"
    if (!new URLPattern({ pathname: "/*" }).test({ pathname })) {
      return [];
    }
    return [{ params: {}, consumedPathname: "/" }];
  }

  // For prefix matches, add optional wildcard suffix
  const prefixMatch = new URLPattern({
    pathname: `${normalizedPattern}{/*}?`,
  }).exec({ pathname });
  if (!prefixMatch) {
    return [];
  }

  if (consumesOneSegmentEach(normalizedPattern)) {
    // Fast path: one pathname segment consumed per pattern segment
    const patternSegments = normalizedPattern.split("/").filter(Boolean);
    const pathnameSegments = pathname.split("/").filter(Boolean);
    return [
      {
        params: extractParams(prefixMatch),
        consumedPathname: "/" + pathnameSegments.slice(0, patternSegments.length).join("/"),
      },
    ];
  }

  // URLPattern syntax like `?`, `+`, `*` and regex groups can consume a
  // variable number of segments, so the consumed prefix cannot be derived
  // from segment counts. Instead, match the bare pattern against every
  // pathname prefix, longest first.
  const basePattern = new URLPattern({ pathname: normalizedPattern });
  const segments = pathname.split("/").filter(Boolean);
  const candidates: PathMatchCandidate[] = [];
  for (let count = segments.length; count >= 0; count--) {
    const prefix = count === 0 ? "/" : "/" + segments.slice(0, count).join("/");
    const match = basePattern.exec({ pathname: prefix });
    if (match) {
      candidates.push({
        params: extractParams(match),
        consumedPathname: prefix,
      });
    }
  }
  return candidates;
}

/**
 * Extract params from a URLPattern match (excluding the wildcard group "0").
 *
 * URLPattern matches against the percent-encoded pathname and returns group
 * values as-is, so param values are decoded here before being exposed.
 */
function extractParams(match: URLPatternResult): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(match.pathname.groups)) {
    if (value !== undefined && key !== "0") {
      params[key] = decodeParam(value);
    }
  }
  return params;
}

/**
 * Percent-decode a param value, falling back to the raw value for malformed
 * sequences (e.g. a lone `%`) rather than failing the whole match.
 */
function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
