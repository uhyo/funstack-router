import { vi } from "vitest";
import { resetNavigationState } from "../core/navigation.js";

// Mock Navigation API for testing
export function createMockNavigation(initialUrl = "http://localhost/") {
  let currentEntry: MockNavigationHistoryEntry;
  const entries: MockNavigationHistoryEntry[] = [];
  const listeners = new Map<string, Set<(event: Event) => void>>();

  class MockNavigationHistoryEntry {
    url: string;
    key: string;
    id: string;
    index: number;
    sameDocument = true;
    #state: unknown;

    constructor(url: string, index: number, state?: unknown) {
      this.url = url;
      this.key = `key-${index}`;
      this.id = `id-${index}`;
      this.index = index;
      this.#state = state;
    }

    getState() {
      return this.#state;
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

  const mockNavigation = {
    currentEntry,
    entries: () => [...entries],
    canGoBack: false,
    canGoForward: false,
    transition: null,

    navigate: vi.fn(
      (url: string, options?: { state?: unknown; history?: string }) => {
        const newUrl = new URL(url, currentEntry.url).href;
        const newEntry = new MockNavigationHistoryEntry(
          newUrl,
          entries.length,
          options?.state,
        );

        if (options?.history !== "replace") {
          entries.push(newEntry);
        } else {
          entries[entries.length - 1] = newEntry;
        }

        currentEntry = newEntry;
        mockNavigation.currentEntry = currentEntry;

        // Dispatch currententrychange event
        dispatchEvent("currententrychange", new Event("currententrychange"));

        return {
          committed: Promise.resolve(currentEntry),
          finished: Promise.resolve(currentEntry),
        };
      },
    ),

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

    // Test helper to simulate navigation
    __simulateNavigation(url: string, state?: unknown) {
      mockNavigation.navigate(url, { state });
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
