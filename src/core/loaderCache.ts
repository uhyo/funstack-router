import type { LoaderFunction, LoaderArgs, MatchedRoute } from "../types.js";

/**
 * Status of a loader resource.
 */
type LoaderStatus = "pending" | "fulfilled" | "rejected";

/**
 * A Suspense-compatible resource that wraps a loader promise.
 */
export type LoaderResource<T = unknown> = {
  read(): T;
  status: LoaderStatus;
};

type LoaderCacheEntry = {
  resource: LoaderResource;
  promise: Promise<unknown>;
};

/**
 * Cache key generation for loader results.
 */
function createCacheKey(url: string, routePath: string): string {
  return `${url}::${routePath}`;
}

/**
 * Global cache for loader results.
 * Maps cache key to loader resource.
 */
const loaderCache = new Map<string, LoaderCacheEntry>();

/**
 * Create a Suspense-compatible resource from a promise.
 */
function createResource<T>(promise: Promise<T>): LoaderResource<T> {
  let status: LoaderStatus = "pending";
  let result: T;
  let error: unknown;

  const suspender = promise.then(
    (value) => {
      status = "fulfilled";
      result = value;
    },
    (err) => {
      status = "rejected";
      error = err;
    },
  );

  return {
    read(): T {
      switch (status) {
        case "pending":
          throw suspender;
        case "rejected":
          throw error;
        case "fulfilled":
          return result;
      }
    },
    get status() {
      return status;
    },
  };
}

/**
 * Execute a loader and return a Suspense-compatible resource.
 */
export function executeLoader(
  loader: LoaderFunction,
  args: LoaderArgs,
  url: string,
  routePath: string,
): LoaderResource {
  const cacheKey = createCacheKey(url, routePath);

  // Return cached resource if available
  const cached = loaderCache.get(cacheKey);
  if (cached) {
    return cached.resource;
  }

  // Execute the loader
  const result = loader(args);
  const promise = Promise.resolve(result);
  const resource = createResource(promise);

  // Cache the resource
  loaderCache.set(cacheKey, { resource, promise });

  return resource;
}

/**
 * Preload loaders for matched routes.
 * Returns a promise that resolves when all loaders are complete.
 */
export function preloadRouteLoaders(
  matchedRoutes: MatchedRoute[],
  url: string,
): Promise<void> {
  const promises: Promise<unknown>[] = [];

  for (const match of matchedRoutes) {
    const { route, params } = match;
    if (!route.loader) continue;

    const cacheKey = createCacheKey(url, route.path);

    // Skip if already cached
    const cached = loaderCache.get(cacheKey);
    if (cached) {
      promises.push(cached.promise);
      continue;
    }

    // Execute loader
    const args: LoaderArgs = {
      params,
      request: new Request(url),
    };

    const result = route.loader(args);
    const promise = Promise.resolve(result);
    const resource = createResource(promise);

    loaderCache.set(cacheKey, { resource, promise });
    promises.push(promise);
  }

  return Promise.all(promises).then(() => undefined);
}

/**
 * Get a loader resource for a matched route.
 * If the loader hasn't been executed yet, it will be executed.
 */
export function getLoaderResource(
  match: MatchedRoute,
  url: string,
): LoaderResource | null {
  const { route, params } = match;
  if (!route.loader) return null;

  const cacheKey = createCacheKey(url, route.path);

  // Return cached resource if available
  const cached = loaderCache.get(cacheKey);
  if (cached) {
    return cached.resource;
  }

  // Execute loader if not cached
  const args: LoaderArgs = {
    params,
    request: new Request(url),
  };

  return executeLoader(route.loader, args, url, route.path);
}

/**
 * Invalidate cached loader data for a specific URL.
 */
export function invalidateLoader(url: string, routePath?: string): void {
  if (routePath) {
    const cacheKey = createCacheKey(url, routePath);
    loaderCache.delete(cacheKey);
  } else {
    // Invalidate all loaders for this URL
    for (const key of loaderCache.keys()) {
      if (key.startsWith(`${url}::`)) {
        loaderCache.delete(key);
      }
    }
  }
}

/**
 * Clear all cached loader data.
 */
export function clearLoaderCache(): void {
  loaderCache.clear();
}
