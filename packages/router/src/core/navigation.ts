import type { InternalRouteDefinition, NavigateOptions } from "../types.js";
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
 * Subscribe to Navigation API's currententrychange event.
 * Returns a cleanup function.
 */
export function subscribeToNavigation(callback: () => void): () => void {
  if (!hasNavigation()) {
    return () => {};
  }
  navigation.addEventListener("currententrychange", callback);
  return () => {
    if (hasNavigation()) {
      navigation.removeEventListener("currententrychange", callback);
    }
  };
}

/**
 * Get current navigation entry snapshot.
 */
export function getNavigationSnapshot(): NavigationHistoryEntry | null {
  if (!hasNavigation()) {
    return null;
  }
  return navigation.currentEntry;
}

/**
 * Server snapshot - Navigation API not available on server.
 */
export function getServerSnapshot(): null {
  return null;
}

/**
 * Set up navigation interception for client-side routing.
 * Returns a cleanup function.
 */
export function setupNavigationInterception(
  routes: InternalRouteDefinition[],
): () => void {
  if (!hasNavigation()) {
    return () => {};
  }

  const handleNavigate = (event: NavigateEvent) => {
    // Only intercept same-origin navigations
    if (!event.canIntercept || event.hashChange) {
      return;
    }

    // Check if the URL matches any of our routes
    const url = new URL(event.destination.url);
    const matched = matchRoutes(routes, url.pathname);

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
    if (hasNavigation()) {
      navigation.removeEventListener("navigate", handleNavigate);
    }
  };
}

/**
 * Navigate to a new URL programmatically.
 */
export function performNavigation(to: string, options?: NavigateOptions): void {
  if (!hasNavigation()) {
    return;
  }
  navigation.navigate(to, {
    history: options?.replace ? "replace" : "push",
    state: options?.state,
  });
}
