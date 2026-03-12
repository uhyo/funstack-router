import type {
  RouterAdapter,
  LocationEntry,
  EntryChangeType,
} from "./RouterAdapter.js";
import type {
  InternalRouteDefinition,
  MatchedRoute,
  NavigateOptions,
  OnNavigateCallback,
} from "../types.js";
import { matchRoutes } from "./matchRoutes.js";
import { isBypassInterception } from "../bypassInterception.js";
import {
  executeLoaders,
  createLoaderRequest,
  createActionRequest,
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
  // Ephemeral info from the current navigation event (not persisted in history)
  #currentNavigationInfo: unknown = undefined;
  // Per-entry reload counters, used to generate unique cache keys
  // so that loaders re-execute on reload instead of returning cached results.
  // Keyed by NavigationHistoryEntry.id.
  #reloadCounts = new Map<string, number>();

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
      key: this.#effectiveKey(entry.id),
      entryId: entry.id,
      entryKey: entry.key,
      state: entry.getState(),
      info: this.#currentNavigationInfo,
    };
    return this.#cachedSnapshot;
  }

  subscribe(callback: (changeType: EntryChangeType) => void): () => void {
    const controller = new AbortController();
    navigation.addEventListener(
      "currententrychange",
      (event) => {
        // NavigationCurrentEntryChangeEvent.navigationType is null
        // when the change was caused by updateCurrentEntry()
        const changeType: EntryChangeType =
          (event as NavigationCurrentEntryChangeEvent).navigationType === null
            ? "state"
            : "navigation";
        callback(changeType);
      },
      { signal: controller.signal },
    );

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
          // clearLoaderCacheForEntry uses prefix matching, so it also clears
          // reload-keyed caches (e.g., entryId:r1:0, entryId:r2:0, etc.)
          clearLoaderCacheForEntry(entryId);
          this.#subscribedEntryIds.delete(entryId);
          this.#reloadCounts.delete(entryId);
        },
        { signal },
      );
    }
  }

  /**
   * Compute the effective cache key for a given entry.
   * Includes a reload suffix when the entry has been reloaded,
   * so loaders get a fresh cache key and re-execute.
   */
  #effectiveKey(entryId: string): string {
    const count = this.#reloadCounts.get(entryId) ?? 0;
    return count > 0 ? `${entryId}:r${count}` : entryId;
  }

  navigate(to: string, options?: NavigateOptions): void {
    navigation.navigate(to, {
      history: options?.replace ? "replace" : "push",
      state: options?.state,
      info: options?.info,
    });
  }

  async navigateAsync(to: string, options?: NavigateOptions): Promise<void> {
    const result = navigation.navigate(to, {
      history: options?.replace ? "replace" : "push",
      state: options?.state,
      info: options?.info,
    });
    await result.finished;
  }

  setupInterception(
    getRoutes: () => InternalRouteDefinition[],
    onNavigate?: OnNavigateCallback,
    checkBlockers?: () => boolean,
  ): (() => void) | undefined {
    const handleNavigate = (event: NavigateEvent) => {
      // If the navigation was triggered by hardReload/hardNavigate, skip blockers and interception
      if (isBypassInterception(event.info)) {
        onNavigate?.(event, {
          matches: [],
          intercepting: false,
          formData: event.formData,
        });
        return;
      }

      // Capture ephemeral info from the navigate event
      // This info is only available during this navigation and resets on the next one
      this.#currentNavigationInfo = event.info;
      // Invalidate cached snapshot to pick up new info
      this.#cachedSnapshot = null;

      // Check blockers first - if any blocker returns true, prevent navigation
      if (checkBlockers?.()) {
        event.preventDefault();
        return;
      }

      // Only intercept same-origin navigations
      if (!event.canIntercept) {
        onNavigate?.(event, {
          matches: [],
          intercepting: false,
          formData: event.formData,
        });
        return;
      }

      // Check if the URL matches any of our routes
      const url = new URL(event.destination.url);
      const matched = matchRoutes(getRoutes(), url.pathname);

      const isFormSubmission = event.formData !== null;

      // For POST form submissions, don't intercept if no matched route has an action
      if (isFormSubmission && matched !== null) {
        const hasAction = matched.some((m) => m.route.action);
        if (!hasAction) {
          // Don't intercept — let browser submit the form normally
          onNavigate?.(event, {
            matches: matched,
            intercepting: false,
            formData: event.formData,
          });
          return;
        }
      }

      // Compute whether we will intercept this navigation (before user's preventDefault)
      const willIntercept =
        matched !== null && !event.hashChange && event.downloadRequest === null;

      // Call onNavigate callback if provided (regardless of route match)
      if (onNavigate) {
        onNavigate(event, {
          matches: matched,
          intercepting: willIntercept,
          formData: event.formData,
        });
        if (event.defaultPrevented) {
          return; // Do not intercept, allow browser default
        }
      }

      if (!willIntercept) {
        return;
      }

      // Route match, so intercept

      // On reload, increment the per-entry reload count so loaders get a
      // fresh cache key and re-execute.  The old cache (under the previous
      // key) remains intact for the pending UI shown during the React
      // transition.  Stale reload caches (2+ generations old) are pruned.
      if (event.navigationType === "reload") {
        const entryId = navigation.currentEntry!.id;
        const oldCount = this.#reloadCounts.get(entryId) ?? 0;
        // Prune reload cache from 2 generations ago.  The immediately
        // previous generation is kept because it may be the committed
        // state shown as pending UI during the new transition.
        if (oldCount >= 2) {
          clearLoaderCacheForEntry(`${entryId}:r${oldCount - 1}`);
        }
        this.#reloadCounts.set(entryId, oldCount + 1);
        // Invalidate snapshot so getSnapshot() picks up the new reload key
        this.#cachedSnapshot = null;
      }

      // Abort initial load's loaders if this is the first navigation
      if (idleController) {
        idleController.abort();
        idleController = null;
      }

      event.intercept({
        handler: async () => {
          const currentEntry = navigation.currentEntry;
          if (!currentEntry) {
            throw new Error(
              "Navigation currentEntry is null during navigation interception",
            );
          }

          // Compute effective cache key inside the handler where
          // currentEntry already points to the correct (possibly new) entry.
          const effectiveKey = this.#effectiveKey(currentEntry.id);

          let actionResult: unknown = undefined;

          if (isFormSubmission) {
            // Find the deepest matched route with an action
            const actionRoute = findActionRoute(matched);
            if (actionRoute) {
              const actionRequest = createActionRequest(url, event.formData!);
              actionResult = await actionRoute.route.action!({
                params: actionRoute.params,
                request: actionRequest,
                signal: event.signal,
              });
            }
            // Revalidate loaders after action — clear cache so loaders re-execute
            clearLoaderCacheForEntry(currentEntry.id);
          }

          const request = createLoaderRequest(url);

          // Note: in response to `currententrychange` event, <Router> should already
          // have dispatched data loaders and the results should be cached.
          // Here we run executeLoader to retrieve cached results.
          // For form submissions, cache was cleared above so loaders re-execute with actionResult.
          const results = executeLoaders(
            matched,
            effectiveKey,
            request,
            event.signal,
            actionResult,
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

  updateCurrentEntryState(state: unknown): void {
    // Invalidate cached snapshot BEFORE updating, so the subscriber gets fresh state
    this.#cachedSnapshot = null;
    navigation.updateCurrentEntry({ state });
    // Note: updateCurrentEntry fires currententrychange, so subscribers are notified automatically
  }
}

/**
 * Find the deepest matched route that has an action defined.
 * Iterates from deepest to shallowest.
 */
function findActionRoute(matched: MatchedRoute[]): MatchedRoute | undefined {
  for (let i = matched.length - 1; i >= 0; i--) {
    if (matched[i].route.action) {
      return matched[i];
    }
  }
  return undefined;
}
