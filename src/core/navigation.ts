import type { RouteDefinition, NavigateOptions } from "../types.js";
import { matchRoutes } from "./matchRoutes.js";
import { preloadRouteLoaders } from "./loaderCache.js";

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
      event.intercept({
        handler: async () => {
          // Preload all route loaders before completing navigation
          await preloadRouteLoaders(matched, event.destination.url);
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
