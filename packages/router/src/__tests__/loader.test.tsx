import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Router } from "../Router.js";
import { Outlet } from "../Outlet.js";
import { route, type LoaderArgs } from "../route.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { internalRoutes, type InternalRouteDefinition } from "../types.js";
import { clearLoaderCache } from "../core/loaderCache.js";

describe("Data Loader", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    mockNavigation = setupNavigationMock("http://localhost/");
    clearLoaderCache();
  });

  afterEach(() => {
    cleanupNavigationMock();
    vi.restoreAllMocks();
  });

  describe("sync loader", () => {
    it("passes data to component", () => {
      function UserPage({ data }: { data: { name: string } }) {
        return <div>Hello, {data.name}</div>;
      }

      const routes = [
        route({
          path: "/",
          component: UserPage,
          loader: () => ({ name: "Alice" }),
        }),
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("Hello, Alice")).toBeInTheDocument();
    });

    it("works with nested routes", () => {
      mockNavigation = setupNavigationMock("http://localhost/users/123");

      function Layout({ data }: { data: { title: string } }) {
        return (
          <div>
            <h1>{data.title}</h1>
            <Outlet />
          </div>
        );
      }

      function UserDetail({ data }: { data: { id: string } }) {
        return <div>User ID: {data.id}</div>;
      }

      const routes = [
        route({
          path: "/users",
          component: Layout,
          loader: () => ({ title: "User Management" }),
          children: [
            route({
              path: ":id",
              component: UserDetail,
              loader: ({ params }) => ({ id: params.id }),
            }),
          ],
        }),
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("User Management")).toBeInTheDocument();
      expect(screen.getByText("User ID: 123")).toBeInTheDocument();
    });
  });

  describe("async loader", () => {
    it("passes Promise to component", () => {
      let receivedData: Promise<{ name: string }> | undefined;

      function AsyncUserPage({ data }: { data: Promise<{ name: string }> }) {
        receivedData = data;
        // Don't actually use() the promise in this test
        // Just verify it's received correctly
        return <div>Received data</div>;
      }

      const expectedPromise = Promise.resolve({ name: "Bob" });
      const routesWithPromise = [
        route({
          path: "/",
          component: AsyncUserPage,
          loader: () => expectedPromise,
        }),
      ];

      render(<Router routes={routesWithPromise} />);

      // Verify the component received a Promise
      expect(receivedData).toBeInstanceOf(Promise);
      expect(screen.getByText("Received data")).toBeInTheDocument();
    });

    it("caches Promise (same Promise instance on re-render)", () => {
      const promises: Array<Promise<{ name: string }>> = [];

      function AsyncUserPage({ data }: { data: Promise<{ name: string }> }) {
        promises.push(data);
        return <div>Received data</div>;
      }

      const routesWithPromise = [
        route({
          path: "/",
          component: AsyncUserPage,
          loader: () => Promise.resolve({ name: "Bob" }),
        }),
      ];

      const { rerender } = render(<Router routes={routesWithPromise} />);
      rerender(<Router routes={routesWithPromise} />);

      // Both renders should receive the same Promise instance (from cache)
      expect(promises.length).toBeGreaterThanOrEqual(1);
      if (promises.length > 1) {
        expect(promises[0]).toBe(promises[1]);
      }
    });
  });

  describe("route without loader", () => {
    it("renders component without data prop", () => {
      function AboutPage() {
        return <div>About Page</div>;
      }

      const routes = [
        route({
          path: "/",
          component: AboutPage,
        }),
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("About Page")).toBeInTheDocument();
    });

    it("can mix routes with and without loaders", () => {
      mockNavigation = setupNavigationMock("http://localhost/about");

      function HomePage({ data }: { data: { message: string } }) {
        return <div>{data.message}</div>;
      }

      function AboutPage() {
        return <div>About Page</div>;
      }

      const routes = [
        route({
          path: "/",
          component: HomePage,
          loader: () => ({ message: "Welcome" }),
        }),
        route({
          path: "/about",
          component: AboutPage,
        }),
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("About Page")).toBeInTheDocument();
    });
  });

  describe("loader arguments", () => {
    it("receives correct params", () => {
      mockNavigation = setupNavigationMock("http://localhost/users/456");

      const loaderSpy = vi.fn((args: LoaderArgs) => ({
        receivedParams: args.params,
      }));

      function UserPage({
        data,
      }: {
        data: { receivedParams: Record<string, string> };
      }) {
        return <div>User: {data.receivedParams.id}</div>;
      }

      const routes = [
        route({
          path: "/users/:id",
          component: UserPage,
          loader: loaderSpy,
        }),
      ];

      render(<Router routes={routes} />);

      expect(loaderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { id: "456" },
        }),
      );
      expect(screen.getByText("User: 456")).toBeInTheDocument();
    });

    it("receives Request object with correct URL", () => {
      mockNavigation = setupNavigationMock(
        "http://localhost/page?foo=bar#section",
      );

      const loaderSpy = vi.fn((args: LoaderArgs) => ({
        url: args.request.url,
      }));

      function Page({ data }: { data: { url: string } }) {
        return <div>URL: {data.url}</div>;
      }

      const routes = [
        route({
          path: "/page",
          component: Page,
          loader: loaderSpy,
        }),
      ];

      render(<Router routes={routes} />);

      expect(loaderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            url: "http://localhost/page?foo=bar#section",
          }),
        }),
      );
    });

    it("receives AbortSignal", () => {
      const loaderSpy = vi.fn((args: LoaderArgs) => ({
        hasSignal: args.signal instanceof AbortSignal,
      }));

      function Page({ data }: { data: { hasSignal: boolean } }) {
        return <div>Has signal: {data.hasSignal ? "yes" : "no"}</div>;
      }

      const routes = [
        route({
          path: "/",
          component: Page,
          loader: loaderSpy,
        }),
      ];

      render(<Router routes={routes} />);

      expect(loaderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
      expect(screen.getByText("Has signal: yes")).toBeInTheDocument();
    });
  });

  describe("loader caching", () => {
    it("does not re-execute loader on re-render", () => {
      const loaderSpy = vi.fn(() => ({ count: Math.random() }));

      function Page({ data }: { data: { count: number } }) {
        return <div>Count: {data.count}</div>;
      }

      const routes = [
        route({
          path: "/",
          component: Page,
          loader: loaderSpy,
        }),
      ];

      const { rerender } = render(<Router routes={routes} />);

      expect(loaderSpy).toHaveBeenCalledTimes(1);
      const firstCount = screen.getByText(/Count:/).textContent;

      // Re-render the router
      rerender(<Router routes={routes} />);

      // Loader should not be called again
      expect(loaderSpy).toHaveBeenCalledTimes(1);
      // Data should be the same
      expect(screen.getByText(/Count:/).textContent).toBe(firstCount);
    });

    it("caches results per navigation entry id", () => {
      mockNavigation = setupNavigationMock("http://localhost/page1");

      const loaderSpy = vi.fn(({ params }: LoaderArgs) => ({
        page: params.page,
      }));

      function Page({ data }: { data: { page: string } }) {
        return <div>Page: {data.page}</div>;
      }

      const routes = [
        route({
          path: "/:page",
          component: Page,
          loader: loaderSpy,
        }),
      ];

      render(<Router routes={routes} />);
      expect(loaderSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Page: page1")).toBeInTheDocument();

      // Navigate to a different page (creates new entry at index 1)
      act(() => {
        mockNavigation.__simulateNavigation("http://localhost/page2");
      });

      // Loader should be called again for the new entry
      expect(loaderSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Page: page2")).toBeInTheDocument();

      // Traverse back to the first entry (back button behavior)
      act(() => {
        mockNavigation.__simulateTraversal(0);
      });

      // Loader should NOT be called again (cache hit - same entry id)
      expect(loaderSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Page: page1")).toBeInTheDocument();
    });

    it("calls loader again for new navigation to same URL", () => {
      mockNavigation = setupNavigationMock("http://localhost/page1");

      const loaderSpy = vi.fn(({ params }: LoaderArgs) => ({
        page: params.page,
      }));

      function Page({ data }: { data: { page: string } }) {
        return <div>Page: {data.page}</div>;
      }

      const routes = [
        route({
          path: "/:page",
          component: Page,
          loader: loaderSpy,
        }),
      ];

      render(<Router routes={routes} />);
      expect(loaderSpy).toHaveBeenCalledTimes(1);

      // Navigate to a different page
      act(() => {
        mockNavigation.__simulateNavigation("http://localhost/page2");
      });
      expect(loaderSpy).toHaveBeenCalledTimes(2);

      // Navigate forward to the same URL as the first page (creates new entry)
      act(() => {
        mockNavigation.__simulateNavigation("http://localhost/page1");
      });

      // Loader SHOULD be called again (new entry, different id)
      expect(loaderSpy).toHaveBeenCalledTimes(3);
      expect(screen.getByText("Page: page1")).toBeInTheDocument();
    });
  });

  describe("route helper type inference", () => {
    it("infers loader return type for component data prop", () => {
      // This test mainly verifies that TypeScript compiles correctly
      // The route() helper should infer TData from the loader

      type User = { id: number; name: string };

      // This should compile without errors
      const userRoute = internalRoutes([
        route({
          path: "/users/:id",
          loader: (): User => ({ id: 1, name: "Test" }),
          component: ({ data }: { data: User }) => <div>{data.name}</div>,
        }),
      ])[0];

      expect(userRoute.path).toBe("/users/:id");
      expect(userRoute.loader).toBeDefined();
    });

    it("allows routes without loader and without data prop", () => {
      // This should compile without errors
      const aboutRoute = internalRoutes([
        route({
          path: "/about",
          component: () => <div>About</div>,
        }),
      ])[0];

      expect(aboutRoute.path).toBe("/about");
      expect(aboutRoute.loader).toBeUndefined();
    });
  });
});
