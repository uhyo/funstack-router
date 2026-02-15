import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Router } from "../Router.js";
import { Outlet } from "../Outlet.js";
import { route } from "../route.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { internalRoutes } from "../types.js";
import { clearLoaderCache } from "../core/loaderCache.js";
import { NavigationAPIAdapter } from "../core/NavigationAPIAdapter.js";

describe("Form Submission / Action", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    mockNavigation = setupNavigationMock("http://localhost/");
    clearLoaderCache();
  });

  afterEach(() => {
    cleanupNavigationMock();
    vi.restoreAllMocks();
  });

  describe("NavigationAPIAdapter form submission interception", () => {
    it("does not intercept POST form submission when route has no action", () => {
      const adapter = new NavigationAPIAdapter();
      const routes = internalRoutes([
        { path: "/submit", component: () => null },
      ]);

      adapter.setupInterception(routes);

      const formData = new FormData();
      formData.set("name", "Alice");

      const { event } = mockNavigation.__simulateNavigationWithEvent(
        "http://localhost/submit",
        { formData },
      );

      // Should NOT intercept — no action defined on the route
      expect(event.intercept).not.toHaveBeenCalled();
    });

    it("intercepts POST form submission when route has an action", () => {
      const adapter = new NavigationAPIAdapter();
      const actionFn = vi.fn(async () => "action result");
      const routes = internalRoutes([
        route({
          path: "/submit",
          action: actionFn,
          component: () => null,
        }),
      ]);

      adapter.setupInterception(routes);

      const formData = new FormData();
      formData.set("name", "Alice");

      const { event } = mockNavigation.__simulateNavigationWithEvent(
        "http://localhost/submit",
        { formData },
      );

      // Should intercept — route has an action
      expect(event.intercept).toHaveBeenCalledTimes(1);
    });

    it("calls onNavigate with formData for POST form submissions", () => {
      const adapter = new NavigationAPIAdapter();
      const onNavigate = vi.fn();
      const routes = internalRoutes([
        route({
          path: "/submit",
          action: async () => "ok",
          component: () => null,
        }),
      ]);

      adapter.setupInterception(routes, onNavigate);

      const formData = new FormData();
      formData.set("name", "Alice");

      mockNavigation.__simulateNavigationWithEvent("http://localhost/submit", {
        formData,
      });

      expect(onNavigate).toHaveBeenCalledTimes(1);
      const [, info] = onNavigate.mock.calls[0];
      expect(info.formData).toBe(formData);
      expect(info.intercepting).toBe(true);
    });

    it("calls onNavigate with formData: null for non-POST navigations", () => {
      const adapter = new NavigationAPIAdapter();
      const onNavigate = vi.fn();
      const routes = internalRoutes([
        route({
          path: "/about",
          component: () => null,
        }),
      ]);

      adapter.setupInterception(routes, onNavigate);

      mockNavigation.__simulateNavigationWithEvent("http://localhost/about");

      expect(onNavigate).toHaveBeenCalledTimes(1);
      const [, info] = onNavigate.mock.calls[0];
      expect(info.formData).toBeNull();
    });

    it("calls onNavigate with intercepting: false when POST route has no action", () => {
      const adapter = new NavigationAPIAdapter();
      const onNavigate = vi.fn();
      const routes = internalRoutes([
        { path: "/submit", component: () => null },
      ]);

      adapter.setupInterception(routes, onNavigate);

      const formData = new FormData();
      formData.set("name", "Alice");

      mockNavigation.__simulateNavigationWithEvent("http://localhost/submit", {
        formData,
      });

      expect(onNavigate).toHaveBeenCalledTimes(1);
      const [, info] = onNavigate.mock.calls[0];
      expect(info.intercepting).toBe(false);
      expect(info.formData).toBe(formData);
    });

    it("executes deepest route action for nested routes", () => {
      const adapter = new NavigationAPIAdapter();
      const parentAction = vi.fn(async () => "parent");
      const childAction = vi.fn(async () => "child");

      const routes = internalRoutes([
        route({
          path: "/users",
          action: parentAction,
          component: () => null,
          children: [
            route({
              path: ":id/edit",
              action: childAction,
              component: () => null,
            }),
          ],
        }),
      ]);

      adapter.setupInterception(routes);

      const formData = new FormData();

      const { event } = mockNavigation.__simulateNavigationWithEvent(
        "http://localhost/users/123/edit",
        { formData },
      );

      // Should intercept
      expect(event.intercept).toHaveBeenCalledTimes(1);

      // Execute the intercept handler
      const interceptCall = (event.intercept as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const handler = interceptCall.handler as () => Promise<void>;

      // Simulate proceeding (creates the new entry so navigation.currentEntry is set)
      mockNavigation.__simulateNavigation("http://localhost/users/123/edit");

      return handler().then(() => {
        // Only the deepest action should be called
        expect(childAction).toHaveBeenCalledTimes(1);
        expect(parentAction).not.toHaveBeenCalled();

        // Verify params were passed
        expect(childAction).toHaveBeenCalledWith(
          expect.objectContaining({
            params: { id: "123" },
          }),
        );
      });
    });
  });

  describe("action result flows to loader via actionResult", () => {
    it("passes action return value to loader as actionResult", () => {
      const adapter = new NavigationAPIAdapter();
      const actionResult = { success: true, message: "Updated" };
      const actionFn = vi.fn(async () => actionResult);
      const loaderFn = vi.fn(({ actionResult }: { actionResult: unknown }) => ({
        result: actionResult,
      }));

      const routes = internalRoutes([
        route({
          path: "/submit",
          action: actionFn,
          loader: loaderFn,
          component: () => null,
        }),
      ]);

      adapter.setupInterception(routes);

      const formData = new FormData();

      const { event } = mockNavigation.__simulateNavigationWithEvent(
        "http://localhost/submit",
        { formData },
      );

      const interceptCall = (event.intercept as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const handler = interceptCall.handler as () => Promise<void>;

      // Simulate proceeding
      mockNavigation.__simulateNavigation("http://localhost/submit");

      return handler().then(() => {
        expect(actionFn).toHaveBeenCalledTimes(1);
        expect(loaderFn).toHaveBeenCalledWith(
          expect.objectContaining({
            actionResult,
          }),
        );
      });
    });

    it("passes undefined actionResult on normal navigation", () => {
      mockNavigation = setupNavigationMock("http://localhost/page");

      const loaderFn = vi.fn(({ actionResult }: { actionResult: unknown }) => ({
        result: actionResult,
      }));

      function Page({ data }: { data: { result: unknown } }) {
        return <div>Result: {String(data.result)}</div>;
      }

      const routes = [
        route({
          path: "/page",
          loader: loaderFn,
          component: Page,
        }),
      ];

      render(<Router routes={routes} />);

      expect(loaderFn).toHaveBeenCalledWith(
        expect.objectContaining({
          actionResult: undefined,
        }),
      );
      expect(screen.getByText("Result: undefined")).toBeInTheDocument();
    });
  });

  describe("action request", () => {
    it("creates POST request with FormData body", () => {
      const adapter = new NavigationAPIAdapter();
      let receivedRequest: Request | undefined;

      const actionFn = vi.fn(async ({ request }: { request: Request }) => {
        receivedRequest = request;
        return "ok";
      });

      const routes = internalRoutes([
        route({
          path: "/submit",
          action: actionFn,
          component: () => null,
        }),
      ]);

      adapter.setupInterception(routes);

      const formData = new FormData();
      formData.set("name", "Alice");
      formData.set("email", "alice@example.com");

      const { event } = mockNavigation.__simulateNavigationWithEvent(
        "http://localhost/submit",
        { formData },
      );

      const interceptCall = (event.intercept as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const handler = interceptCall.handler as () => Promise<void>;

      mockNavigation.__simulateNavigation("http://localhost/submit");

      return handler().then(async () => {
        expect(receivedRequest).toBeDefined();
        expect(receivedRequest!.method).toBe("POST");
        expect(receivedRequest!.url).toBe("http://localhost/submit");
        // Body should contain the form data
        const body = await receivedRequest!.formData();
        expect(body.get("name")).toBe("Alice");
        expect(body.get("email")).toBe("alice@example.com");
      });
    });

    it("passes AbortSignal from navigate event to action", () => {
      const adapter = new NavigationAPIAdapter();
      let receivedSignal: AbortSignal | undefined;

      const actionFn = vi.fn(async ({ signal }: { signal: AbortSignal }) => {
        receivedSignal = signal;
        return "ok";
      });

      const routes = internalRoutes([
        route({
          path: "/submit",
          action: actionFn,
          component: () => null,
        }),
      ]);

      adapter.setupInterception(routes);

      const formData = new FormData();

      const { event } = mockNavigation.__simulateNavigationWithEvent(
        "http://localhost/submit",
        { formData },
      );

      const interceptCall = (event.intercept as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const handler = interceptCall.handler as () => Promise<void>;

      mockNavigation.__simulateNavigation("http://localhost/submit");

      return handler().then(() => {
        expect(receivedSignal).toBeInstanceOf(AbortSignal);
      });
    });
  });

  describe("loader revalidation after action", () => {
    it("clears loader cache and re-executes loaders after action", () => {
      const adapter = new NavigationAPIAdapter();
      let loaderCallCount = 0;
      const actionFn = vi.fn(async () => "action done");
      const loaderFn = vi.fn(() => {
        loaderCallCount++;
        return { count: loaderCallCount };
      });

      const routes = internalRoutes([
        route({
          path: "/page",
          action: actionFn,
          loader: loaderFn,
          component: () => null,
        }),
      ]);

      // Set up initial navigation to /page
      mockNavigation.__simulateNavigation("http://localhost/page");
      adapter.setupInterception(routes);

      // First load — simulate the initial loader execution
      // (In a real scenario, Router.tsx would trigger this)

      // Now simulate a form submission to the same route
      const formData = new FormData();
      const { event } = mockNavigation.__simulateNavigationWithEvent(
        "http://localhost/page",
        { formData },
      );

      const interceptCall = (event.intercept as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const handler = interceptCall.handler as () => Promise<void>;

      return handler().then(() => {
        // Action should have been called
        expect(actionFn).toHaveBeenCalledTimes(1);
        // Loader should have been called (fresh due to cache clear)
        expect(loaderFn).toHaveBeenCalled();
      });
    });
  });

  describe("routes with action but no loader", () => {
    it("executes action without loader", () => {
      const adapter = new NavigationAPIAdapter();
      const actionFn = vi.fn(async () => "side effect done");

      const routes = internalRoutes([
        route({
          path: "/delete",
          action: actionFn,
          component: () => null,
        }),
      ]);

      adapter.setupInterception(routes);

      const formData = new FormData();

      const { event } = mockNavigation.__simulateNavigationWithEvent(
        "http://localhost/delete",
        { formData },
      );

      expect(event.intercept).toHaveBeenCalledTimes(1);

      const interceptCall = (event.intercept as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const handler = interceptCall.handler as () => Promise<void>;

      mockNavigation.__simulateNavigation("http://localhost/delete");

      return handler().then(() => {
        expect(actionFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("action errors", () => {
    it("lets action errors propagate (approach 1)", () => {
      const adapter = new NavigationAPIAdapter();
      const actionFn = vi.fn(async () => {
        throw new Error("Action failed!");
      });

      const routes = internalRoutes([
        route({
          path: "/submit",
          action: actionFn,
          component: () => null,
        }),
      ]);

      adapter.setupInterception(routes);

      const formData = new FormData();

      const { event } = mockNavigation.__simulateNavigationWithEvent(
        "http://localhost/submit",
        { formData },
      );

      const interceptCall = (event.intercept as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const handler = interceptCall.handler as () => Promise<void>;

      mockNavigation.__simulateNavigation("http://localhost/submit");

      return expect(handler()).rejects.toThrow("Action failed!");
    });
  });
});
