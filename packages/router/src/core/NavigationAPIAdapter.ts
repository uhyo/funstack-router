import type {
  InternalRouteDefinition,
  NavigateOptions,
  OnNavigateCallback,
} from "../types.js";
import type { RouterAdapter, LocationEntry } from "./RouterAdapter.js";
import { matchRoutes } from "./matchRoutes.js";
import { executeLoaders, createLoaderRequest } from "./loaderCache.js";

/**
 * Fallback AbortController for data loading initialized outside of a navigation event.
 * Aborted when the next navigation occurs.
 *
 * To save resources, this controller is created only when needed.
 */
let idleController: AbortController | null = null;

/**
 * Get the current abort signal for loader cancellation.
 */
export function getIdleAbortSignal(): AbortSignal {
  idleController ??= new AbortController();
  return idleController.signal;
}

/**
 * Reset navigation state. Used for testing.
 */
export function resetNavigationState(): void {
  idleController?.abort();
  idleController = null;
}

/**
 * Check if Navigation API is available.
 */
export function hasNavigation(): boolean {
  return typeof navigation !== "undefined";
}

/**
 * Module-level cache for getSnapshot results.
 * This ensures consistent caching across adapter instances.
 */
let cachedSnapshot: LocationEntry | null = null;
let lastEntry: NavigationHistoryEntry | null = null;

/**
 * Reset snapshot cache. Used for testing.
 */
export function resetSnapshotCache(): void {
  cachedSnapshot = null;
  lastEntry = null;
}

/**
 * RouterAdapter implementation using the Navigation API.
 * This is the primary adapter for browsers that support the Navigation API.
 */
export class NavigationAPIAdapter implements RouterAdapter {
  getSnapshot(): LocationEntry | null {
    if (!hasNavigation()) {
      return null;
    }
    const entry = navigation.currentEntry;
    if (!entry?.url) return null;

    // Return cached snapshot if the entry hasn't changed (by object identity)
    // This is required for useSyncExternalStore to work correctly
    if (cachedSnapshot && lastEntry === entry) {
      return cachedSnapshot;
    }

    lastEntry = entry;
    cachedSnapshot = {
      url: new URL(entry.url),
      key: entry.id,
      state: entry.getState(),
    };
    return cachedSnapshot;
  }

  subscribe(callback: () => void): () => void {
    if (!hasNavigation()) {
      return () => {};
    }
    navigation.addEventListener("currententrychange", callback);
    return () => {
      navigation.removeEventListener("currententrychange", callback);
    };
  }

  navigate(to: string, options?: NavigateOptions): void {
    if (!hasNavigation()) {
      return;
    }
    navigation.navigate(to, {
      history: options?.replace ? "replace" : "push",
      state: options?.state,
    });
  }

  setupInterception(
    routes: InternalRouteDefinition[],
    onNavigate?: OnNavigateCallback,
  ): (() => void) | undefined {
    if (!hasNavigation()) {
      return undefined;
    }

    const handleNavigate = (event: NavigateEvent) => {
      // Only intercept same-origin navigations
      if (!event.canIntercept || event.hashChange) {
        return;
      }

      // Check if the URL matches any of our routes
      const url = new URL(event.destination.url);
      const matched = matchRoutes(routes, url.pathname);

      // Call onNavigate callback if provided (regardless of route match)
      if (onNavigate) {
        onNavigate(event, matched);
        if (event.defaultPrevented) {
          return; // Do not intercept, allow browser default
        }
      }

      if (matched) {
        // Abort initial load's loaders if this is the first navigation
        if (idleController) {
          idleController.abort();
          idleController = null;
        }

        event.intercept({
          handler: async () => {
            const request = createLoaderRequest(url);

            // Note: in response to `currententrychange` event, <Router> should already
            // have dispatched data loaders and the results should be cached.
            // Here we run executeLoader to retrieve cached results.
            const currentEntry = navigation.currentEntry;
            if (!currentEntry) {
              throw new Error(
                "Navigation currentEntry is null during navigation interception",
              );
            }

            const results = executeLoaders(
              matched,
              currentEntry.id,
              request,
              event.signal,
            );

            // Delay navigation until async loaders complete
            await Promise.all(results.map((r) => r.data));
          },
        });
      }
    };

    navigation.addEventListener("navigate", handleNavigate);
    return () => {
      navigation.removeEventListener("navigate", handleNavigate);
    };
  }
}
