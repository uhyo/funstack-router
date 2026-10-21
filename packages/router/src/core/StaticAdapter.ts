import type { RouterAdapter, LocationEntry, EntryChange } from "./RouterAdapter.js";
import type { InternalRouteDefinition, NavigateOptions, OnNavigateCallback } from "../types.js";

export type StaticAdapterOptions = {
  /**
   * When true, programmatic navigations are performed as full page loads
   * via `location.assign()` / `location.replace()`. State and info cannot be
   * carried over. When false (default), they are ignored with a warning.
   */
  fullPageNavigation?: boolean;
};

/**
 * Static adapter for when Navigation API is unavailable.
 * Provides read-only location access with no SPA navigation capabilities.
 * Links will cause full page loads (MPA behavior).
 */
export class StaticAdapter implements RouterAdapter {
  #cachedSnapshot: LocationEntry | null = null;
  #idleController: AbortController | null = null;
  #fullPageNavigation: boolean;

  constructor(options?: StaticAdapterOptions) {
    this.#fullPageNavigation = options?.fullPageNavigation ?? false;
  }

  getSnapshot(): LocationEntry | null {
    if (typeof window === "undefined") {
      return null;
    }

    // Cache the snapshot - it never changes in static mode
    if (!this.#cachedSnapshot) {
      this.#cachedSnapshot = {
        url: new URL(window.location.href),
        key: "__static__",
        entryId: null,
        entryKey: null,
        state: undefined,
        info: undefined,
      };
    }
    return this.#cachedSnapshot;
  }

  subscribe(_callback: (change: EntryChange) => void): () => void {
    // Static mode never fires location change events
    return () => {};
  }

  navigate(to: string, options?: NavigateOptions): void {
    if (this.#fullPageNavigation) {
      if (options?.replace) {
        window.location.replace(to);
      } else {
        window.location.assign(to);
      }
      return;
    }
    console.warn(
      "FUNSTACK Router: navigate() called in static fallback mode. " +
        "Navigation API is not available in this browser. " +
        "Links will cause full page loads.",
    );
    // Note: We intentionally do NOT do window.location.href = to
    // as that would mask bugs where developers expect SPA behavior.
    // If needed in the future, we could add a "static-reload" mode.
  }

  async navigateAsync(to: string, options?: NavigateOptions): Promise<void> {
    this.navigate(to, options);
  }

  setupInterception(
    _getRoutes: () => InternalRouteDefinition[],
    _onNavigate?: OnNavigateCallback,
    _checkBlockers?: () => boolean,
  ): (() => void) | undefined {
    // No interception in static mode - links cause full page loads
    return undefined;
  }

  getIdleAbortSignal(): AbortSignal {
    this.#idleController ??= new AbortController();
    return this.#idleController.signal;
  }

  updateCurrentEntryState(_state: unknown): void {
    // No-op in static mode - state updates require Navigation API
  }
}
