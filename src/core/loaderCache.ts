import type {
  LoaderArgs,
  MatchedRoute,
  MatchedRouteWithData,
  RouteDefinition,
} from "../types.js";

/**
 * Cache for loader results.
 * Key format: `${entryKey}:${routePath}`
 */
const loaderCache = new Map<string, unknown>();

/**
 * Get or create a loader result from cache.
 * If the result is not cached, executes the loader and caches the result.
 */
function getOrCreateLoaderResult(
  entryKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route: RouteDefinition<any>,
  args: LoaderArgs,
): unknown | undefined {
  if (!route.loader) {
    return undefined;
  }

  const cacheKey = `${entryKey}:${route.path}`;

  if (!loaderCache.has(cacheKey)) {
    loaderCache.set(cacheKey, route.loader(args));
  }

  return loaderCache.get(cacheKey);
}

/**
 * Create a Request object for loader args.
 */
export function createLoaderRequest(url: URL): Request {
  return new Request(url.href, {
    method: "GET",
  });
}

/**
 * Execute loaders for matched routes and return routes with data.
 * Results are cached by navigation entry key to prevent duplicate execution.
 */
export function executeLoaders(
  matchedRoutes: MatchedRoute[],
  entryKey: string,
  request: Request,
  signal: AbortSignal,
): MatchedRouteWithData[] {
  return matchedRoutes.map((match) => {
    const { route, params } = match;
    const args: LoaderArgs = { params, request, signal };
    const data = getOrCreateLoaderResult(entryKey, route, args);

    return { ...match, data };
  });
}

/**
 * Clear the loader cache.
 * Mainly used for testing.
 */
export function clearLoaderCache(): void {
  loaderCache.clear();
}
