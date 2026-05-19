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
  #cachedHref: string | null = null;
  #cachedEntryId: string | null = null;
  // Destination URL captured from the most recent intercepted navigation,
  // scoped to the entry.id observed at the time of intercept. Honored only
  // when the current entry.id still matches, so it cannot leak across
  // unrelated traversals or non-intercepted entry changes.
  //
  // WebKit Private Browsing workaround: after an intercepted navigation,
  // `currentEntry.url` stays stale while `event.destination.url` reflects
  // the real URL. Upstream bug: https://bugs.webkit.org/show_bug.cgi?id=314976
  #committedDestination: { entryId: string; href: string } | null = null;
  // Ephemeral info from the current navigation event (not persisted in history)
  #currentNavigationInfo: unknown = undefined;
  // Per-(entry, URL) reload counters, used to generate unique cache keys
  // so that loaders re-execute on reload instead of returning cached results.
  #reloadCounts = new Map<string, number>();

  getSnapshot(): LocationEntry | null {
    const entry = navigation.currentEntry;
    if (!entry) {
      return null;
    }

    const stickyHref =
      this.#committedDestination?.entryId === entry.id
        ? this.#committedDestination.href
        : null;
    const actualHref = stickyHref ?? entry.url;
    if (!actualHref) {
      return null;
    }

    // Return cached snapshot if neither URL nor entry identity changed
    if (
      this.#cachedHref === actualHref &&
      this.#cachedEntryId === entry.id &&
      this.#cachedSnapshot
    ) {
      return this.#cachedSnapshot;
    }

    // Composite key changes when either entry identity (replace) or URL
    // (Private Browsing where entry.id is stale) changes, so loaders for
    // a fresh navigation are not served from a stale slot.
    this.#cachedHref = actualHref;
    this.#cachedEntryId = entry.id;
    const composite = `${entry.id}|${actualHref}`;
    this.#cachedSnapshot = {
      url: new URL(actualHref),
      key: this.#effectiveKey(composite),
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

    // Fallback notifier for WebKit Private Browsing where currententrychange
    // does not fire after an intercepted navigation.
    navigation.addEventListener(
      "navigatesuccess",
      () => {
        callback("navigation");
        // currententrychange may have been skipped; ensure new entries
        // still get dispose subscriptions.
        this.#subscribeToDisposeEvents(controller.signal);
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
      const entryUrl = entry.url;
      entry.addEventListener(
        "dispose",
        () => {
          // clearLoaderCacheForEntry uses prefix matching, so it also clears
          // reload-keyed caches (e.g., composite:r1, composite:r2, etc.)
          if (entryUrl) {
            const composite = `${entryId}|${entryUrl}`;
            clearLoaderCacheForEntry(composite);
            this.#reloadCounts.delete(composite);
          }
          this.#subscribedEntryIds.delete(entryId);
        },
        { signal },
      );
    }
  }

  /**
   * Compute the effective cache key for a composite (`${entry.id}|${url}`),
   * appending a reload suffix so loaders re-execute on reload.
   */
  #effectiveKey(composite: string): string {
    const count = this.#reloadCounts.get(composite) ?? 0;
    return count > 0 ? `${composite}:r${count}` : composite;
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

      // On reload, increment the per-(entry, URL) reload count so loaders
      // get a fresh cache key and re-execute.  The immediately previous
      // generation is kept because it may be the committed state shown as
      // pending UI during the React transition; older ones are pruned.
      if (event.navigationType === "reload") {
        const reloadKey = `${navigation.currentEntry!.id}|${event.destination.url}`;
        const oldCount = this.#reloadCounts.get(reloadKey) ?? 0;
        if (oldCount >= 2) {
          clearLoaderCacheForEntry(`${reloadKey}:r${oldCount - 1}`);
        }
        this.#reloadCounts.set(reloadKey, oldCount + 1);
        this.#cachedSnapshot = null;
        this.#cachedHref = null;
        this.#cachedEntryId = null;
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

          // Don't invalidate the cache here: getSnapshot's cache check
          // already returns the same reference when the resolved URL is
          // unchanged (normal mode), avoiding an extra render when
          // navigatesuccess fires after currententrychange.
          this.#committedDestination = {
            entryId: currentEntry.id,
            href: event.destination.url,
          };

          const composite = `${currentEntry.id}|${event.destination.url}`;
          const effectiveKey = this.#effectiveKey(composite);

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
            clearLoaderCacheForEntry(composite);
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
    this.#cachedHref = null;
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
