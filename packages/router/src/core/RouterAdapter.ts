import type {
  InternalRouteDefinition,
  NavigateOptions,
  OnNavigateCallback,
} from "../types.js";

/**
 * Represents the current location state.
 * Abstracts NavigationHistoryEntry for static mode compatibility.
 */
export type LocationEntry = {
  /** Current URL */
  url: URL;
  /** Unique key identifying this entry (used for loader caching) */
  key: string;
  /** State associated with this entry */
  state: unknown;
};

/**
 * Interface for navigation adapters.
 * Implementations handle mode-specific navigation behavior.
 */
export interface RouterAdapter {
  /**
   * Get the current location entry.
   * Returns null during SSR or if unavailable.
   */
  getSnapshot(): LocationEntry | null;

  /**
   * Subscribe to location changes.
   * Returns an unsubscribe function.
   */
  subscribe(callback: () => void): () => void;

  /**
   * Perform programmatic navigation.
   */
  navigate(to: string, options?: NavigateOptions): void;

  /**
   * Set up navigation interception for route matching.
   * Returns a cleanup function, or undefined if not supported.
   */
  setupInterception(
    routes: InternalRouteDefinition[],
    onNavigate?: OnNavigateCallback,
  ): (() => void) | undefined;
}
