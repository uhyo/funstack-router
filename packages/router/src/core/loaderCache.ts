import type { LoaderArgs } from "../route.js";
import type {
  MatchedRoute,
  MatchedRouteWithData,
  InternalRouteDefinition,
} from "../types.js";

/**
 * Cache for loader results.
 * Key format: `${entryId}:${matchIndex}`
 */
const loaderCache = new Map<string, unknown>();

/**
 * Get or create a loader result from cache.
 * If the result is not cached, executes the loader and caches the result.
 */
function getOrCreateLoaderResult(
  entryId: string,
  matchIndex: number,
  route: InternalRouteDefinition,
  args: LoaderArgs<Record<string, string>, unknown>,
): unknown | undefined {
  if (!route.loader) {
    return undefined;
  }

  const cacheKey = `${entryId}:${matchIndex}`;

  if (!loaderCache.has(cacheKey)) {
    try {
      loaderCache.set(cacheKey, route.loader(args));
    } catch (error) {
      // Convert synchronous loader errors to rejected promises
      // so they are handled uniformly via React's use() + Error Boundary
      const rejected = Promise.reject(error);
      // Prevent unhandled rejection warnings; the rejection will be
      // consumed by React's use() which surfaces it to Error Boundaries.
      rejected.catch(() => {});
      loaderCache.set(cacheKey, rejected);
    }
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
 * Create a Request object for action args (POST with FormData body).
 */
export function createActionRequest(url: URL, formData: FormData): Request {
  return new Request(url.href, {
    method: "POST",
    body: formData,
  });
}

/**
 * Execute loaders for matched routes and return routes with data.
 * Results are cached by navigation entry id to prevent duplicate execution.
 */
export function executeLoaders(
  matchedRoutes: MatchedRoute[],
  entryId: string,
  request: Request,
  signal: AbortSignal,
  actionResult?: unknown,
): MatchedRouteWithData[] {
  return matchedRoutes.map((match, index) => {
    const { route, params } = match;
    const args: LoaderArgs<Record<string, string>, unknown> = {
      params,
      request,
      signal,
      actionResult,
    };
    const data = getOrCreateLoaderResult(entryId, index, route, args);

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

/**
 * Clear loader cache entries for a specific navigation entry.
 * Called when a NavigationHistoryEntry is disposed (removed from history stack).
 */
export function clearLoaderCacheForEntry(entryId: string): void {
  const prefix = `${entryId}:`;
  for (const key of loaderCache.keys()) {
    if (key.startsWith(prefix)) {
      loaderCache.delete(key);
    }
  }
}
