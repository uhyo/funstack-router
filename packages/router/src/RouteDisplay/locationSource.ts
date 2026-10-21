import type { NavigateOptions } from "../types.js";

/**
 * The location a RouteDisplay renders.
 */
export type DisplayLocation = {
  url: URL;
  /** NavigationHistoryEntry.id, or null when Navigation API is unavailable */
  entryId: string | null;
  /** NavigationHistoryEntry.key, or null when Navigation API is unavailable */
  entryKey: string | null;
  /** State of the current entry, or undefined when Navigation API is unavailable */
  state: unknown;
};

/**
 * Source of the current location for RouteDisplay.
 *
 * Unlike RouterAdapter, it never intercepts navigations: navigations
 * requested through it are regular (usually cross-document) navigations.
 * Methods are bound so they can be passed around directly.
 */
export type DisplayLocationSource = {
  /** Returns the current location, or null when unavailable (SSR). */
  getSnapshot: () => DisplayLocation | null;
  /** Subscribes to changes of the current entry (e.g. state updates, fragment navigations). */
  subscribe: (callback: () => void) => () => void;
  /** Performs a full page navigation. */
  navigateAsync: (to: string, options?: NavigateOptions) => Promise<void>;
  /** Updates the state of the current entry without navigation. */
  updateCurrentEntryState: (state: unknown) => void;
};

/**
 * Create a location source based on the environment:
 * - Navigation API available: reads entries from `navigation.currentEntry`
 * - Browser without Navigation API: reads the URL from `window.location`
 * - No window (SSR): no location
 */
export function createDisplayLocationSource(): DisplayLocationSource {
  if (typeof window === "undefined") {
    return createServerSource();
  }
  if ("navigation" in window) {
    return createNavigationAPISource();
  }
  return createWindowLocationSource();
}

function createNavigationAPISource(): DisplayLocationSource {
  const nav = navigation;
  let cachedSnapshot: DisplayLocation | null = null;

  const getSnapshot = () => {
    const entry = nav.currentEntry;
    if (!entry?.url) {
      return null;
    }
    // getState() returns a fresh copy on each call, so the snapshot is cached
    // until currententrychange fires. Entry id and URL are checked as well in
    // case the event is missed.
    if (
      cachedSnapshot === null ||
      cachedSnapshot.entryId !== entry.id ||
      cachedSnapshot.url.href !== entry.url
    ) {
      cachedSnapshot = {
        url: new URL(entry.url),
        entryId: entry.id,
        entryKey: entry.key,
        state: entry.getState(),
      };
    }
    return cachedSnapshot;
  };

  return {
    getSnapshot,
    subscribe: (callback) => {
      const listener = () => {
        cachedSnapshot = null;
        callback();
      };
      nav.addEventListener("currententrychange", listener);
      return () => {
        nav.removeEventListener("currententrychange", listener);
      };
    },
    navigateAsync: async (to, options) => {
      // Nothing intercepts this navigation, so the browser performs a regular
      // navigation (a full page load unless only the fragment changes).
      // `state` is carried over to the new entry; `info` is not, for
      // cross-document navigations.
      const result = nav.navigate(to, {
        history: options?.replace ? "replace" : "push",
        state: options?.state,
        info: options?.info,
      });
      await result.finished;
    },
    updateCurrentEntryState: (state) => {
      nav.updateCurrentEntry({ state });
    },
  };
}

function createWindowLocationSource(): DisplayLocationSource {
  let cachedSnapshot: DisplayLocation | null = null;

  return {
    getSnapshot: () =>
      (cachedSnapshot ??= {
        url: new URL(window.location.href),
        entryId: null,
        entryKey: null,
        state: undefined,
      }),
    subscribe: () => () => {},
    navigateAsync: async (to, options) => {
      // Without Navigation API, `state` and `info` cannot be carried over.
      if (options?.replace) {
        window.location.replace(to);
      } else {
        window.location.assign(to);
      }
    },
    updateCurrentEntryState: () => {
      // No-op: entry state requires Navigation API
    },
  };
}

function createServerSource(): DisplayLocationSource {
  return {
    getSnapshot: () => null,
    subscribe: () => () => {},
    navigateAsync: async () => {},
    updateCurrentEntryState: () => {},
  };
}
