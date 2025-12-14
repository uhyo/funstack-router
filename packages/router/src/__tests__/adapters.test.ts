import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NavigationAPIAdapter } from "../core/NavigationAPIAdapter.js";
import { StaticAdapter } from "../core/StaticAdapter.js";
import { createAdapter } from "../core/createAdapter.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";

describe("NavigationAPIAdapter", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    mockNavigation = setupNavigationMock("http://localhost/test");
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  describe("getSnapshot", () => {
    it("returns LocationEntry with URL, key, and state", () => {
      const adapter = new NavigationAPIAdapter();
      const snapshot = adapter.getSnapshot();

      expect(snapshot).not.toBeNull();
      expect(snapshot!.url.href).toBe("http://localhost/test");
      expect(snapshot!.key).toBe("id-0");
      expect(snapshot!.state).toBeUndefined();
    });

    it("returns null when Navigation API is unavailable", () => {
      cleanupNavigationMock();

      const adapter = new NavigationAPIAdapter();
      const snapshot = adapter.getSnapshot();

      expect(snapshot).toBeNull();
    });
  });

  describe("subscribe", () => {
    it("subscribes to currententrychange events", () => {
      const adapter = new NavigationAPIAdapter();
      const callback = vi.fn();

      const unsubscribe = adapter.subscribe(callback);

      expect(mockNavigation.addEventListener).toHaveBeenCalledWith(
        "currententrychange",
        callback,
      );

      unsubscribe();
      expect(mockNavigation.removeEventListener).toHaveBeenCalledWith(
        "currententrychange",
        callback,
      );
    });

    it("returns no-op when Navigation API is unavailable", () => {
      cleanupNavigationMock();

      const adapter = new NavigationAPIAdapter();
      const callback = vi.fn();

      const unsubscribe = adapter.subscribe(callback);
      expect(typeof unsubscribe).toBe("function");
      unsubscribe(); // Should not throw
    });
  });

  describe("navigate", () => {
    it("calls navigation.navigate with correct options", () => {
      const adapter = new NavigationAPIAdapter();

      adapter.navigate("/new-path");
      expect(mockNavigation.navigate).toHaveBeenCalledWith("/new-path", {
        history: "push",
        state: undefined,
      });
    });

    it("passes replace option correctly", () => {
      const adapter = new NavigationAPIAdapter();

      adapter.navigate("/new-path", { replace: true });
      expect(mockNavigation.navigate).toHaveBeenCalledWith("/new-path", {
        history: "replace",
        state: undefined,
      });
    });

    it("passes state option correctly", () => {
      const adapter = new NavigationAPIAdapter();
      const state = { foo: "bar" };

      adapter.navigate("/new-path", { state });
      expect(mockNavigation.navigate).toHaveBeenCalledWith("/new-path", {
        history: "push",
        state,
      });
    });
  });
});

describe("StaticAdapter", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // Clean up any navigation mock
    cleanupNavigationMock();

    // Mock window.location
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          href: "http://localhost/static-test?query=value#hash",
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    }
  });

  describe("getSnapshot", () => {
    it("returns LocationEntry from window.location", () => {
      const adapter = new StaticAdapter();
      const snapshot = adapter.getSnapshot();

      expect(snapshot).not.toBeNull();
      expect(snapshot!.url.href).toBe(
        "http://localhost/static-test?query=value#hash",
      );
      expect(snapshot!.key).toBe("__static__");
      expect(snapshot!.state).toBeUndefined();
    });

    it("caches the snapshot", () => {
      const adapter = new StaticAdapter();
      const snapshot1 = adapter.getSnapshot();
      const snapshot2 = adapter.getSnapshot();

      expect(snapshot1).toBe(snapshot2);
    });
  });

  describe("subscribe", () => {
    it("returns no-op function (never fires)", () => {
      const adapter = new StaticAdapter();
      const callback = vi.fn();

      const unsubscribe = adapter.subscribe(callback);
      expect(typeof unsubscribe).toBe("function");

      // Callback should never be called in static mode
      unsubscribe();
    });
  });

  describe("navigate", () => {
    it("warns when called", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const adapter = new StaticAdapter();
      adapter.navigate("/new-path");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "FUNSTACK Router: navigate() called in static fallback mode",
        ),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("/new-path"),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("setupInterception", () => {
    it("returns undefined (no interception in static mode)", () => {
      const adapter = new StaticAdapter();
      const result = adapter.setupInterception([]);

      expect(result).toBeUndefined();
    });
  });
});

describe("createAdapter", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    cleanupNavigationMock();
    // Restore window to original jsdom window before each test
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    }
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  it("returns NavigationAPIAdapter when Navigation API is available", () => {
    setupNavigationMock("http://localhost/");

    const adapter = createAdapter("none");
    expect(adapter).toBeInstanceOf(NavigationAPIAdapter);
  });

  it("returns null when Navigation API unavailable and fallback='none'", () => {
    // Ensure no navigation mock
    cleanupNavigationMock();

    const adapter = createAdapter("none");
    expect(adapter).toBeNull();
  });

  it("returns StaticAdapter when Navigation API unavailable and fallback='static'", () => {
    // Ensure no navigation mock but window exists
    cleanupNavigationMock();
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          href: "http://localhost/",
        },
      },
      writable: true,
      configurable: true,
    });

    const adapter = createAdapter("static");
    expect(adapter).toBeInstanceOf(StaticAdapter);
  });

  it("prefers NavigationAPIAdapter even when fallback='static'", () => {
    // Restore original window first, then setup navigation mock
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    }
    setupNavigationMock("http://localhost/");

    const adapter = createAdapter("static");
    expect(adapter).toBeInstanceOf(NavigationAPIAdapter);
  });
});
