import { vi } from "vitest";
import { resetNavigationState } from "../core/NavigationAPIAdapter.js";

// Mock Navigation API for testing
export function createMockNavigation(initialUrl = "http://localhost/") {
  let currentEntry: MockNavigationHistoryEntry;
  const entries: MockNavigationHistoryEntry[] = [];
  const listeners = new Map<string, Set<(event: Event) => void>>();
  // Counter for generating unique entry ids (id is unique per entry, even for replace)
  let nextEntryId = 0;

  class MockNavigationHistoryEntry extends EventTarget {
    url: string;
    key: string;
    id: string;
    index: number;
    sameDocument = true;
    #state: unknown;

    constructor(url: string, index: number, state?: unknown) {
      super();
      this.url = url;
      this.key = `key-${index}`;
      this.id = `id-${nextEntryId++}`;
      this.index = index;
      this.#state = state;
    }

    getState() {
      return this.#state;
    }

    /**
     * Update the state of this entry.
     * Used internally by updateCurrentEntry mock.
     */
    __updateState(state: unknown) {
      this.#state = state;
    }

    /**
     * Dispatch a dispose event on this entry.
     * Used for testing dispose event handling.
     */
    __dispose() {
      this.dispatchEvent(new Event("dispose"));
    }
  }

  currentEntry = new MockNavigationHistoryEntry(initialUrl, 0);
  entries.push(currentEntry);

  const dispatchEvent = (type: string, event: Event) => {
    const typeListeners = listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach((listener) => listener(event));
    }
  };

  // Create a mock NavigateEvent
  const createMockNavigateEvent = (
    destinationUrl: string,
    eventInfo?: unknown,
  ): NavigateEvent & { defaultPrevented: boolean } => {
    let defaultPrevented = false;
    return {
      type: "navigate",
      canIntercept: true,
      hashChange: false,
      destination: {
        url: destinationUrl,
        key: `key-${entries.length}`,
        id: `id-${entries.length}`,
        index: entries.length,
        sameDocument: true,
        getState: () => undefined,
      },
      navigationType: "push",
      userInitiated: false,
      signal: new AbortController().signal,
      formData: null,
      downloadRequest: null,
      info: eventInfo,
      hasUAVisualTransition: false,
      intercept: vi.fn(),
      scroll: vi.fn(),
      get defaultPrevented() {
        return defaultPrevented;
      },
      preventDefault: vi.fn(() => {
        defaultPrevented = true;
      }),
    } as unknown as NavigateEvent & { defaultPrevented: boolean };
  };

  const mockNavigation = {
    currentEntry,
    entries: () => [...entries],
    canGoBack: false,
    canGoForward: false,
    transition: null,

    // Store last navigation info for testing
    __lastNavigateInfo: undefined as unknown,

    navigate: vi.fn(
      (
        url: string,
        options?: { state?: unknown; history?: string; info?: unknown },
      ) => {
        const newUrl = new URL(url, currentEntry.url).href;

        // Store info for testing and dispatch navigate event with info
        mockNavigation.__lastNavigateInfo = options?.info;

        if (options?.history !== "replace") {
          // When pushing a new entry, dispose all entries after current position
          // This mimics browser behavior when navigating forward from a back state
          const currentIndex = entries.indexOf(currentEntry);
          while (entries.length > currentIndex + 1) {
            const disposedEntry = entries.pop()!;
            disposedEntry.__dispose();
          }

          const newEntry = new MockNavigationHistoryEntry(
            newUrl,
            entries.length,
            options?.state,
          );
          entries.push(newEntry);
          currentEntry = newEntry;
        } else {
          const currentIndex = entries.indexOf(currentEntry);
          const newEntry = new MockNavigationHistoryEntry(
            newUrl,
            currentIndex,
            options?.state,
          );
          newEntry.key = currentEntry.key; // Replace keeps the same key (but id is new)
          entries[currentIndex] = newEntry;
          currentEntry = newEntry;
        }

        mockNavigation.currentEntry = currentEntry;

        // Dispatch currententrychange event
        dispatchEvent("currententrychange", new Event("currententrychange"));

        return {
          committed: Promise.resolve(currentEntry),
          finished: Promise.resolve(currentEntry),
        };
      },
    ),

    updateCurrentEntry: vi.fn((options: { state: unknown }) => {
      currentEntry.__updateState(options.state);
      // Dispatch currententrychange event to notify subscribers
      dispatchEvent("currententrychange", new Event("currententrychange"));
    }),

    addEventListener: vi.fn(
      (type: string, listener: (event: Event) => void) => {
        if (!listeners.has(type)) {
          listeners.set(type, new Set());
        }
        listeners.get(type)!.add(listener);
      },
    ),

    removeEventListener: vi.fn(
      (type: string, listener: (event: Event) => void) => {
        listeners.get(type)?.delete(listener);
      },
    ),

    // Test helper to simulate navigation (bypasses navigate event)
    __simulateNavigation(url: string, state?: unknown) {
      mockNavigation.navigate(url, { state });
    },

    // Test helper to simulate navigation with navigate event dispatch
    // This allows testing of onNavigate callback behavior
    __simulateNavigationWithEvent(
      url: string,
      options?: { info?: unknown },
    ): {
      event: NavigateEvent & { defaultPrevented: boolean };
      proceed: () => void;
    } {
      const newUrl = new URL(url, currentEntry.url).href;
      const event = createMockNavigateEvent(newUrl, options?.info);

      // Dispatch navigate event first (allows onNavigate to be called)
      dispatchEvent("navigate", event);

      // Return event and a proceed function
      // If event.defaultPrevented is true, proceeding should be skipped
      return {
        event,
        proceed: () => {
          if (!event.defaultPrevented) {
            // Dispose entries after current position (browser behavior)
            const currentIndex = entries.indexOf(currentEntry);
            while (entries.length > currentIndex + 1) {
              const disposedEntry = entries.pop()!;
              disposedEntry.__dispose();
            }

            const newEntry = new MockNavigationHistoryEntry(
              newUrl,
              entries.length,
            );
            entries.push(newEntry);
            currentEntry = newEntry;
            mockNavigation.currentEntry = currentEntry;
            dispatchEvent(
              "currententrychange",
              new Event("currententrychange"),
            );
          }
        },
      };
    },

    // Test helper to simulate traverse navigation (back/forward)
    // This reuses an existing entry instead of creating a new one
    __simulateTraversal(entryIndex: number) {
      if (entryIndex < 0 || entryIndex >= entries.length) {
        throw new Error(`Invalid entry index: ${entryIndex}`);
      }
      currentEntry = entries[entryIndex];
      mockNavigation.currentEntry = currentEntry;
      dispatchEvent("currententrychange", new Event("currententrychange"));
    },

    // Test helper to get listeners
    __getListeners(type: string) {
      return listeners.get(type);
    },

    // Test helper to simulate disposing an entry (e.g., when navigating forward from a back state)
    __disposeEntry(entryIndex: number) {
      if (entryIndex < 0 || entryIndex >= entries.length) {
        throw new Error(`Invalid entry index: ${entryIndex}`);
      }
      const entry = entries[entryIndex];
      entry.__dispose();
      // Remove from entries array (simulates browser behavior)
      entries.splice(entryIndex, 1);
      // Update indices of remaining entries
      entries.forEach((e, i) => {
        e.index = i;
      });
    },

    // Test helper to get an entry by index
    __getEntry(entryIndex: number) {
      return entries[entryIndex];
    },
  };

  return mockNavigation;
}

// Setup global navigation mock
export function setupNavigationMock(initialUrl = "http://localhost/") {
  const mockNav = createMockNavigation(initialUrl);
  (globalThis as Record<string, unknown>).navigation = mockNav;
  return mockNav;
}

// Cleanup
export function cleanupNavigationMock() {
  delete (globalThis as Record<string, unknown>).navigation;
  resetNavigationState();
}
