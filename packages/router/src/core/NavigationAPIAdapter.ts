import type { RouterAdapter, LocationEntry } from "./RouterAdapter.js";
import type {
  InternalRouteDefinition,
  NavigateOptions,
  OnNavigateCallback,
} from "../types.js";
import { matchRoutes } from "./matchRoutes.js";
import {
  executeLoaders,
  createLoaderRequest,
  clearLoaderCacheForEntry,
} from "./loaderCache.js";

/**
 * Fallback AbortController for data loading initialized outside of a navigation event.
 * Aborted when the next navigation occurs.
 *
 * To save resources, this controller is created only when needed.
 */
let idleController: AbortController | null = null;

/**
 * Reset navigation state. Used for testing.
 */
export function resetNavigationState(): void {
  idleController?.abort();
  idleController = null;
}

/**
 * Adapter that uses the Navigation API for full SPA functionality.
 */
export class NavigationAPIAdapter implements RouterAdapter {
  // Cache the snapshot to ensure referential stability for useSyncExternalStore
  #cachedSnapshot: LocationEntry | null = null;
  #cachedEntryId: string | null = null;

  getSnapshot(): LocationEntry | null {
    const entry = navigation.currentEntry;
    if (!entry?.url) {
      return null;
    }

    // Return cached snapshot if entry hasn't changed
    if (this.#cachedEntryId === entry.id && this.#cachedSnapshot) {
      return this.#cachedSnapshot;
    }

    // Create new snapshot and cache it
    this.#cachedEntryId = entry.id;
    this.#cachedSnapshot = {
      url: new URL(entry.url),
      key: entry.id,
      state: entry.getState(),
    };
    return this.#cachedSnapshot;
  }

  getServerSnapshot(): LocationEntry | null {
    return null;
  }

  subscribe(callback: () => void): () => void {
    const controller = new AbortController();
    navigation.addEventListener("currententrychange", callback, {
      signal: controller.signal,
    });

    // Subscribe to dispose events on all existing entries
    this.#subscribeToDisposeEvents(controller.signal);

    // When current entry changes, subscribe to any new entries' dispose events
    navigation.addEventListener(
      "currententrychange",
      () => this.#subscribeToDisposeEvents(controller.signal),
      { signal: controller.signal },
    );

    return () => {
      controller.abort();
    };
  }

  /**
   * Track which entries we've subscribed to dispose events for.
   */
  #subscribedEntryIds = new Set<string>();

  /**
   * Subscribe to dispose events on all navigation entries.
   * When an entry is disposed, its cached loader results are cleared.
   */
  #subscribeToDisposeEvents(signal: AbortSignal): void {
    for (const entry of navigation.entries()) {
      if (this.#subscribedEntryIds.has(entry.id)) {
        continue;
      }
      this.#subscribedEntryIds.add(entry.id);

      const entryId = entry.id;
      entry.addEventListener(
        "dispose",
        () => {
          clearLoaderCacheForEntry(entryId);
          this.#subscribedEntryIds.delete(entryId);
        },
        { signal },
      );
    }
  }

  navigate(to: string, options?: NavigateOptions): void {
    navigation.navigate(to, {
      history: options?.replace ? "replace" : "push",
      state: options?.state,
    });
  }

  setupInterception(
    routes: InternalRouteDefinition[],
    onNavigate?: OnNavigateCallback,
  ): (() => void) | undefined {
    const handleNavigate = (event: NavigateEvent) => {
      // Only intercept same-origin navigations
      if (!event.canIntercept) {
        onNavigate?.(event, []);
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

      // hash change navigations are not intercepted.
      // Also do not intercept if it is a download request.
      if (event.hashChange || event.downloadRequest !== null) {
        return;
      }

      if (!matched) {
        return;
      }

      // Route match, so intercept

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
    };

    const controller = new AbortController();
    navigation.addEventListener("navigate", handleNavigate, {
      signal: controller.signal,
    });
    return () => {
      controller.abort();
    };
  }

  getIdleAbortSignal(): AbortSignal {
    idleController ??= new AbortController();
    return idleController.signal;
  }
}
