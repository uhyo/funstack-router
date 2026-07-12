import type { LoaderArgs } from "../route.js";
import type { MatchedRoute, MatchedRouteWithData, InternalRouteDefinition } from "../types.js";

/**
 * Wrapper for synchronous errors thrown by loaders.
 * Cached instead of the raw error so the Router's useMemo doesn't throw.
 * RouteRenderer checks for this class and re-throws the original error
 * during rendering, where Error Boundaries can catch it.
 */
export class LoaderError {
  constructor(public readonly error: unknown) {}
}

/**
 * Cache for loader results.
 * Key format: `${entryId}:${matchIndex}:${loaderId}:${paramsKey}`
 */
const loaderCache = new Map<string, unknown>();

/**
 * Identity of each loader function, issued lazily.
 *
 * Included in cache keys so that a cached result is only ever served for the
 * loader that produced it. Without it, swapping the `routes` prop (feature
 * flags, permission-dependent routes) or rendering two `<Router>`s would let
 * a different route matching at the same index pick up another route's
 * cached data.
 *
 * The loader function is used as the identity — rather than the route
 * definition object — because a cached result is fully determined by the
 * loader and its args. Route definitions recreated across renders keep their
 * cached results as long as they reference the same loader function.
 */
type LoaderFunction = NonNullable<InternalRouteDefinition["loader"]>;

const loaderIds = new WeakMap<LoaderFunction, number>();
let nextLoaderId = 0;

function getLoaderId(loader: LoaderFunction): number {
  let id = loaderIds.get(loader);
  if (id === undefined) {
    id = nextLoaderId++;
    loaderIds.set(loader, id);
  }
  return id;
}

/**
 * Serialize matched params into a stable cache key component.
 *
 * Params are part of the loader's input: the same loader function reached
 * via a different path pattern (e.g. `/:page` vs `/:section`) receives
 * different params for the same URL and must not share a cached result.
 */
function getParamsKey(params: Record<string, string>): string {
  return JSON.stringify(Object.entries(params).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/**
 * Get or create a loader result from cache.
 * If the result is not cached, executes the loader and caches the result.
 */
function getOrCreateLoaderResult(
  cache: Map<string, unknown>,
  entryId: string,
  matchIndex: number,
  route: InternalRouteDefinition,
  args: LoaderArgs<Record<string, string>, unknown>,
): unknown | undefined {
  if (!route.loader) {
    return undefined;
  }

  const cacheKey = `${entryId}:${matchIndex}:${getLoaderId(route.loader)}:${getParamsKey(args.params)}`;

  if (!cache.has(cacheKey)) {
    try {
      cache.set(cacheKey, route.loader(args));
    } catch (error) {
      // Wrap synchronous loader errors so they don't crash the Router
      // during useMemo. RouteRenderer will unwrap and re-throw during
      // rendering, where Error Boundaries can catch them.
      cache.set(cacheKey, new LoaderError(error));
    }
  }

  return cache.get(cacheKey);
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
 *
 * By default, results are stored in the module-level cache, which is keyed
 * by navigation entry and cleaned up via dispose events. Callers that have
 * no navigation entry (SSR, Navigation API unavailable) must pass their own
 * `cache` so results are scoped to that render instead of shared globally.
 */
export function executeLoaders(
  matchedRoutes: MatchedRoute[],
  entryId: string,
  request: Request,
  signal: AbortSignal,
  actionResult?: unknown,
  cache: Map<string, unknown> = loaderCache,
): MatchedRouteWithData[] {
  return matchedRoutes.map((match, index) => {
    const { route, params } = match;
    const args: LoaderArgs<Record<string, string>, unknown> = {
      params,
      request,
      signal,
      actionResult,
    };
    const data = getOrCreateLoaderResult(cache, entryId, index, route, args);

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
 * Copy cached loader results from one entry key to another.
 *
 * Used to preserve results across same-URL replace navigations (notably the
 * async `setState`/`resetState`), where the new entry id would otherwise
 * change the cache key and re-execute every loader for the same URL.
 */
export function carryOverLoaderCacheForEntry(fromEntryKey: string, toEntryKey: string): void {
  const fromPrefix = `${fromEntryKey}:`;
  const carried: [suffix: string, value: unknown][] = [];
  for (const [key, value] of loaderCache) {
    if (key.startsWith(fromPrefix)) {
      carried.push([key.slice(fromPrefix.length), value]);
    }
  }
  for (const [suffix, value] of carried) {
    loaderCache.set(`${toEntryKey}:${suffix}`, value);
  }
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
