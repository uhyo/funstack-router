import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NavigationAPIAdapter } from "../core/NavigationAPIAdapter.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { internalRoutes } from "../types.js";

let mockNav: ReturnType<typeof setupNavigationMock>;
let adapter: NavigationAPIAdapter;

beforeEach(() => {
  mockNav = setupNavigationMock("http://localhost/");
  adapter = new NavigationAPIAdapter();
});

afterEach(() => {
  cleanupNavigationMock();
});

describe("setupInterception", () => {
  const routes = internalRoutes([
    { path: "/", component: () => null },
    { path: "/about", component: () => null },
    { path: "/users/:id", component: () => null },
  ]);

  describe("canIntercept is false", () => {
    it("calls onNavigate with empty matched routes when canIntercept is false", () => {
      const onNavigate = vi.fn();
      adapter.setupInterception(routes, onNavigate);

      // Create a navigate event with canIntercept = false
      const event = createNavigateEvent("http://localhost/about", {
        canIntercept: false,
      });

      // Dispatch the navigate event
      dispatchNavigateEvent(mockNav, event);

      // onNavigate should be called with empty matched routes
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith(event, []);
    });

    it("does not call event.intercept when canIntercept is false", () => {
      const onNavigate = vi.fn();
      adapter.setupInterception(routes, onNavigate);

      const event = createNavigateEvent("http://localhost/about", {
        canIntercept: false,
      });

      dispatchNavigateEvent(mockNav, event);

      expect(event.intercept).not.toHaveBeenCalled();
    });
  });

  describe("hash change navigations", () => {
    it("calls onNavigate with matched routes for hash change navigations", () => {
      const onNavigate = vi.fn();
      adapter.setupInterception(routes, onNavigate);

      const event = createNavigateEvent("http://localhost/about#section", {
        hashChange: true,
      });

      dispatchNavigateEvent(mockNav, event);

      expect(onNavigate).toHaveBeenCalledTimes(1);
      // Should receive matched routes (not empty)
      const [, matchedRoutes] = onNavigate.mock.calls[0];
      expect(matchedRoutes).toHaveLength(1);
      expect(matchedRoutes[0].route.path).toBe("/about");
    });

    it("does not intercept hash change navigations", () => {
      adapter.setupInterception(routes);

      const event = createNavigateEvent("http://localhost/about#section", {
        hashChange: true,
      });

      dispatchNavigateEvent(mockNav, event);

      // Should not intercept hash changes
      expect(event.intercept).not.toHaveBeenCalled();
    });
  });

  describe("download requests", () => {
    it("calls onNavigate with matched routes for download requests", () => {
      const onNavigate = vi.fn();
      adapter.setupInterception(routes, onNavigate);

      const event = createNavigateEvent("http://localhost/about", {
        downloadRequest: "file.pdf",
      });

      dispatchNavigateEvent(mockNav, event);

      expect(onNavigate).toHaveBeenCalledTimes(1);
      // Should receive matched routes (not empty)
      const [, matchedRoutes] = onNavigate.mock.calls[0];
      expect(matchedRoutes).toHaveLength(1);
      expect(matchedRoutes[0].route.path).toBe("/about");
    });

    it("does not intercept download requests", () => {
      adapter.setupInterception(routes);

      const event = createNavigateEvent("http://localhost/about", {
        downloadRequest: "file.pdf",
      });

      dispatchNavigateEvent(mockNav, event);

      // Should not intercept downloads
      expect(event.intercept).not.toHaveBeenCalled();
    });
  });

  describe("normal navigation", () => {
    it("intercepts matching routes", () => {
      adapter.setupInterception(routes);

      const event = createNavigateEvent("http://localhost/about");

      dispatchNavigateEvent(mockNav, event);

      expect(event.intercept).toHaveBeenCalledTimes(1);
    });

    it("does not intercept non-matching routes", () => {
      adapter.setupInterception(routes);

      const event = createNavigateEvent("http://localhost/nonexistent");

      dispatchNavigateEvent(mockNav, event);

      expect(event.intercept).not.toHaveBeenCalled();
    });

    it("calls onNavigate with matched routes", () => {
      const onNavigate = vi.fn();
      adapter.setupInterception(routes, onNavigate);

      const event = createNavigateEvent("http://localhost/users/123");

      dispatchNavigateEvent(mockNav, event);

      expect(onNavigate).toHaveBeenCalledTimes(1);
      const [, matchedRoutes] = onNavigate.mock.calls[0];
      expect(matchedRoutes).toHaveLength(1);
      expect(matchedRoutes[0].route.path).toBe("/users/:id");
      expect(matchedRoutes[0].params).toEqual({ id: "123" });
    });

    it("does not intercept when onNavigate calls preventDefault", () => {
      const onNavigate = vi.fn((event: NavigateEvent) => {
        event.preventDefault();
      });
      adapter.setupInterception(routes, onNavigate);

      const event = createNavigateEvent("http://localhost/about");

      dispatchNavigateEvent(mockNav, event);

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(event.intercept).not.toHaveBeenCalled();
    });
  });
});

// Helper to create a mock NavigateEvent with customizable properties
function createNavigateEvent(
  destinationUrl: string,
  options: {
    canIntercept?: boolean;
    hashChange?: boolean;
    downloadRequest?: string | null;
  } = {},
): NavigateEvent {
  const {
    canIntercept = true,
    hashChange = false,
    downloadRequest = null,
  } = options;

  let defaultPrevented = false;

  return {
    type: "navigate",
    canIntercept,
    hashChange,
    destination: {
      url: destinationUrl,
      key: "key-1",
      id: "id-1",
      index: 1,
      sameDocument: true,
      getState: () => undefined,
    },
    navigationType: "push",
    userInitiated: false,
    signal: new AbortController().signal,
    formData: null,
    downloadRequest,
    info: undefined,
    hasUAVisualTransition: false,
    intercept: vi.fn(),
    scroll: vi.fn(),
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault: vi.fn(() => {
      defaultPrevented = true;
    }),
  } as unknown as NavigateEvent;
}

// Helper to dispatch a navigate event on the mock navigation
function dispatchNavigateEvent(
  mockNav: ReturnType<typeof setupNavigationMock>,
  event: NavigateEvent,
): void {
  const listeners = mockNav.__getListeners("navigate");
  if (listeners) {
    listeners.forEach((listener) => listener(event));
  }
}
