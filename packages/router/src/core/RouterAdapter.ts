import type {
  InternalRouteDefinition,
  NavigateOptions,
  OnNavigateCallback,
} from "../types.js";

/**
 * The type of change that caused a location entry update.
 * - "navigation": A URL navigation (push, replace, reload, traverse)
 * - "state": A state-only update via updateCurrentEntry()
 */
export type EntryChangeType = "navigation" | "state";

/**
 * Represents the current location state.
 * Abstracts NavigationHistoryEntry for static mode compatibility.
 */
export type LocationEntry = {
  /** The current URL */
  url: URL;
  /** Unique key for this entry (used for loader caching) */
  key: string;
  /** NavigationHistoryEntry.id — unique identifier for this entry. A new id is assigned when the entry is replaced. */
  entryId: string | null;
  /** NavigationHistoryEntry.key — represents the slot in the entry list. Stable across replacements. */
  entryKey: string | null;
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
   * Subscribe to location changes.
   * The callback receives the type of change that occurred.
   * Returns an unsubscribe function.
   */
  subscribe(callback: (changeType: EntryChangeType) => void): () => void;

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
   * @param getRoutes - Function that returns current route definitions to match against
   * @param onNavigate - Optional callback invoked before navigation is intercepted
   * @param checkBlockers - Optional function to check if any blockers are active.
   *                        If this function returns true, navigation is prevented.
   */
  setupInterception(
    getRoutes: () => InternalRouteDefinition[],
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
