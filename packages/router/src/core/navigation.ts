import type { RouteDefinition, NavigateOptions } from "../types.js";
import { matchRoutes } from "./matchRoutes.js";
import { executeLoaders, createLoaderRequest } from "./loaderCache.js";

/**
 * Fallback AbortController for initial page load (no NavigateEvent).
 * Aborted when the first real navigation occurs.
 */
let initialLoadController: AbortController | null = new AbortController();

/**
 * Current abort signal from the active NavigateEvent.
 * null during initial page load (before first navigation).
 */
let currentNavigationSignal: AbortSignal | null = null;

/**
 * Get the current abort signal for loader cancellation.
 */
export function getCurrentAbortSignal(): AbortSignal {
  // During navigation: use the NavigateEvent's signal
  if (currentNavigationSignal) {
    return currentNavigationSignal;
  }
  // Initial load: use fallback controller
  if (!initialLoadController) {
    initialLoadController = new AbortController();
  }
  return initialLoadController.signal;
}

/**
 * Reset navigation state. Used for testing.
 */
export function resetNavigationState(): void {
  initialLoadController?.abort();
  initialLoadController = new AbortController();
  currentNavigationSignal = null;
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
  routes: RouteDefinition[],
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
      if (initialLoadController) {
        initialLoadController.abort();
        initialLoadController = null;
      }

      // Use the NavigateEvent's signal directly -
      // browser will abort it automatically on new navigation
      currentNavigationSignal = event.signal;

      const request = createLoaderRequest(url);

      // Execute loaders immediately (before React re-renders)
      // Results are cached, so React render will hit the cache
      executeLoaders(matched, url.pathname, request, event.signal);

      event.intercept({
        handler: async () => {
          // Navigation will complete and currententrychange will fire
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
