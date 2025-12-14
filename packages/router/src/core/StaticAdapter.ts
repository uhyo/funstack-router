import type {
  InternalRouteDefinition,
  NavigateOptions,
  OnNavigateCallback,
} from "../types.js";
import type { RouterAdapter, LocationEntry } from "./RouterAdapter.js";

/**
 * RouterAdapter implementation for static fallback mode.
 * Used when the Navigation API is unavailable and fallback="static" is enabled.
 *
 * This adapter:
 * - Reads the current URL from window.location once
 * - Does not subscribe to location changes (links cause full page loads)
 * - Warns when navigate() is called
 * - Does not intercept navigation events
 */
export class StaticAdapter implements RouterAdapter {
  private cachedSnapshot: LocationEntry | null = null;

  getSnapshot(): LocationEntry | null {
    if (typeof window === "undefined") {
      return null;
    }

    // Cache the snapshot - it never changes in static mode
    if (!this.cachedSnapshot) {
      this.cachedSnapshot = {
        url: new URL(window.location.href),
        key: "__static__",
        state: undefined,
      };
    }
    return this.cachedSnapshot;
  }

  subscribe(_callback: () => void): () => void {
    // Static mode never fires location change events
    return () => {};
  }

  navigate(to: string, _options?: NavigateOptions): void {
    console.warn(
      "FUNSTACK Router: navigate() called in static fallback mode. " +
        "Navigation API is not available in this browser. " +
        `Attempted to navigate to: ${to}`,
    );
    // Note: We intentionally do NOT navigate via window.location.href
    // to make the behavior explicit and not mask potential issues
  }

  setupInterception(
    _routes: InternalRouteDefinition[],
    _onNavigate?: OnNavigateCallback,
  ): (() => void) | undefined {
    // No interception in static mode - links cause full page loads
    return undefined;
  }
}
