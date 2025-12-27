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
  /** The current URL */
  url: URL;
  /** Unique key for this entry (used for loader caching) */
  key: string;
  /** State associated with this entry */
  state: unknown;
  /** Ephemeral info from current navigation (undefined if not from navigation event) */
  info: unknown;
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
   * Get the server snapshot for SSR.
   * Returns null as location is not available on server.
   */
  getServerSnapshot(): LocationEntry | null;

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
   * Perform programmatic navigation and wait for completion.
   * Returns a Promise that resolves when the navigation finishes.
   */
  navigateAsync(to: string, options?: NavigateOptions): Promise<void>;

  /**
   * Set up navigation interception for route matching.
   * Returns a cleanup function, or undefined if not supported.
   *
   * @param routes - Route definitions to match against
   * @param onNavigate - Optional callback invoked before navigation is intercepted
   * @param checkBlockers - Optional function to check if any blockers are active.
   *                        If this function returns true, navigation is prevented.
   */
  setupInterception(
    routes: InternalRouteDefinition[],
    onNavigate?: OnNavigateCallback,
    checkBlockers?: () => boolean,
  ): (() => void) | undefined;

  /**
   * Get an abort signal for loader cancellation.
   * The signal is aborted when a new navigation starts.
   */
  getIdleAbortSignal(): AbortSignal;

  /**
   * Update the state of the current navigation entry without navigation.
   * Uses navigation.updateCurrentEntry() internally.
   */
  updateCurrentEntryState(state: unknown): void;
}
