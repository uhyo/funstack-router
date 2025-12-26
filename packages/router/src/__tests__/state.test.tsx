import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { Router } from "../Router.js";
import { Outlet } from "../Outlet.js";
import { route, routeState, type RouteComponentProps } from "../route.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { clearLoaderCache } from "../core/loaderCache.js";

describe("Navigation State Management", () => {
  beforeEach(() => {
    setupNavigationMock("http://localhost/");
    clearLoaderCache();
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  describe("state prop", () => {
    it("receives undefined state on first visit", () => {
      type PageState = { count: number };

      function Page({
        state,
      }: RouteComponentProps<Record<string, never>, PageState>) {
        return (
          <div>State: {state === undefined ? "undefined" : state.count}</div>
        );
      }

      const routes = [
        routeState<PageState>()({
          path: "/",
          component: Page,
        }),
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("State: undefined")).toBeInTheDocument();
    });
  });

  describe("setState (async)", () => {
    it("updates state with object value", async () => {
      type PageState = { count: number };

      function Page({
        state,
        setState,
      }: RouteComponentProps<Record<string, never>, PageState>) {
        return (
          <div>
            <span>Count: {state?.count ?? 0}</span>
            <button onClick={() => void setState({ count: 5 })}>Set 5</button>
          </div>
        );
      }

      const routes = [
        routeState<PageState>()({
          path: "/",
          component: Page,
        }),
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("Count: 0")).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
      });
      expect(screen.getByText("Count: 5")).toBeInTheDocument();
    });

    it("updates state with function updater", async () => {
      type PageState = { count: number };

      function Page({
        state,
        setState,
      }: RouteComponentProps<Record<string, never>, PageState>) {
        return (
          <div>
            <span>Count: {state?.count ?? 0}</span>
            <button
              onClick={() =>
                void setState((prev) => ({ count: (prev?.count ?? 0) + 1 }))
              }
            >
              Increment
            </button>
          </div>
        );
      }

      const routes = [
        routeState<PageState>()({
          path: "/",
          component: Page,
        }),
      ];

      render(<Router routes={routes} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
      });
      expect(screen.getByText("Count: 1")).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
      });
      expect(screen.getByText("Count: 2")).toBeInTheDocument();
    });

    it("returns a Promise", async () => {
      type PageState = { count: number };
      let setStatePromise: Promise<void> | undefined;

      function Page({
        state,
        setState,
      }: RouteComponentProps<Record<string, never>, PageState>) {
        return (
          <div>
            <span>Count: {state?.count ?? 0}</span>
            <button
              onClick={() => {
                setStatePromise = setState({ count: 5 });
              }}
            >
              Set 5
            </button>
          </div>
        );
      }

      const routes = [
        routeState<PageState>()({
          path: "/",
          component: Page,
        }),
      ];

      render(<Router routes={routes} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
        // setState returns a Promise
        expect(setStatePromise).toBeInstanceOf(Promise);
        await setStatePromise;
      });

      expect(screen.getByText("Count: 5")).toBeInTheDocument();
    });
  });

  describe("setStateSync", () => {
    it("updates state synchronously with object value", () => {
      type PageState = { count: number };

      function Page({
        state,
        setStateSync,
      }: RouteComponentProps<Record<string, never>, PageState>) {
        return (
          <div>
            <span>Count: {state?.count ?? 0}</span>
            <button onClick={() => setStateSync({ count: 5 })}>Set 5</button>
          </div>
        );
      }

      const routes = [
        routeState<PageState>()({
          path: "/",
          component: Page,
        }),
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("Count: 0")).toBeInTheDocument();

      act(() => {
        fireEvent.click(screen.getByRole("button"));
      });
      expect(screen.getByText("Count: 5")).toBeInTheDocument();
    });

    it("updates state synchronously with function updater", () => {
      type PageState = { count: number };

      function Page({
        state,
        setStateSync,
      }: RouteComponentProps<Record<string, never>, PageState>) {
        return (
          <div>
            <span>Count: {state?.count ?? 0}</span>
            <button
              onClick={() =>
                setStateSync((prev) => ({ count: (prev?.count ?? 0) + 1 }))
              }
            >
              Increment
            </button>
          </div>
        );
      }

      const routes = [
        routeState<PageState>()({
          path: "/",
          component: Page,
        }),
      ];

      render(<Router routes={routes} />);

      act(() => {
        fireEvent.click(screen.getByRole("button"));
      });
      expect(screen.getByText("Count: 1")).toBeInTheDocument();

      act(() => {
        fireEvent.click(screen.getByRole("button"));
      });
      expect(screen.getByText("Count: 2")).toBeInTheDocument();
    });
  });

  describe("resetState", () => {
    it("clears state to undefined", () => {
      type PageState = { count: number };

      function Page({
        state,
        setStateSync,
        resetState,
      }: RouteComponentProps<Record<string, never>, PageState>) {
        return (
          <div>
            <span>Count: {state?.count ?? "none"}</span>
            <button onClick={() => setStateSync({ count: 10 })}>Set</button>
            <button onClick={resetState}>Reset</button>
          </div>
        );
      }

      const routes = [
        routeState<PageState>()({
          path: "/",
          component: Page,
        }),
      ];

      render(<Router routes={routes} />);

      act(() => {
        fireEvent.click(screen.getByText("Set"));
      });
      expect(screen.getByText("Count: 10")).toBeInTheDocument();

      act(() => {
        fireEvent.click(screen.getByText("Reset"));
      });
      expect(screen.getByText("Count: none")).toBeInTheDocument();
    });
  });

  describe("per-route state isolation", () => {
    it("each nested route maintains independent state", () => {
      type LayoutState = { sidebar: boolean };
      type PageState = { tab: string };

      function Layout({
        state,
        setStateSync,
      }: RouteComponentProps<Record<string, never>, LayoutState>) {
        return (
          <div>
            <span>Sidebar: {state?.sidebar ? "open" : "closed"}</span>
            <button onClick={() => setStateSync({ sidebar: true })}>
              Open Sidebar
            </button>
            <Outlet />
          </div>
        );
      }

      function Page({
        state,
        setStateSync,
      }: RouteComponentProps<Record<string, never>, PageState>) {
        return (
          <div>
            <span>Tab: {state?.tab ?? "default"}</span>
            <button onClick={() => setStateSync({ tab: "settings" })}>
              Settings Tab
            </button>
          </div>
        );
      }

      const routes = [
        routeState<LayoutState>()({
          path: "/",
          component: Layout,
          children: [
            routeState<PageState>()({
              path: "",
              component: Page,
            }),
          ],
        }),
      ];

      render(<Router routes={routes} />);

      // Initial state
      expect(screen.getByText("Sidebar: closed")).toBeInTheDocument();
      expect(screen.getByText("Tab: default")).toBeInTheDocument();

      // Update layout state
      act(() => {
        fireEvent.click(screen.getByText("Open Sidebar"));
      });
      expect(screen.getByText("Sidebar: open")).toBeInTheDocument();
      expect(screen.getByText("Tab: default")).toBeInTheDocument(); // Page state unchanged

      // Update page state
      act(() => {
        fireEvent.click(screen.getByText("Settings Tab"));
      });
      expect(screen.getByText("Sidebar: open")).toBeInTheDocument(); // Layout state unchanged
      expect(screen.getByText("Tab: settings")).toBeInTheDocument();
    });
  });

  describe("state persistence across navigation", () => {
    it("preserves state when navigating back to same entry", () => {
      type PageState = { count: number };

      function Page({
        params,
        state,
        setStateSync,
      }: RouteComponentProps<{ id: string }, PageState>) {
        return (
          <div>
            <span data-testid="page-id">Page: {params.id}</span>
            <span data-testid="count">Count: {state?.count ?? 0}</span>
            <button onClick={() => setStateSync({ count: 42 })}>Set</button>
          </div>
        );
      }

      const routes = [
        routeState<PageState>()({
          path: "/:id",
          component: Page,
        }),
      ];

      cleanupNavigationMock();
      const mockNav = setupNavigationMock("http://localhost/page1");

      render(<Router routes={routes} />);
      expect(screen.getByTestId("page-id")).toHaveTextContent("Page: page1");

      // Set state on page1
      act(() => {
        fireEvent.click(screen.getByRole("button"));
      });
      expect(screen.getByTestId("count")).toHaveTextContent("Count: 42");

      // Navigate to page2
      act(() => {
        mockNav.__simulateNavigation("http://localhost/page2");
      });
      expect(screen.getByTestId("page-id")).toHaveTextContent("Page: page2");
      expect(screen.getByTestId("count")).toHaveTextContent("Count: 0");

      // Navigate back to page1
      act(() => {
        mockNav.__simulateTraversal(0);
      });

      // State should be preserved
      expect(screen.getByTestId("page-id")).toHaveTextContent("Page: page1");
      expect(screen.getByTestId("count")).toHaveTextContent("Count: 42");
    });
  });

  describe("backward compatibility", () => {
    it("routes without state type still work", () => {
      function Page({ params }: { params: { id: string } }) {
        return <div>ID: {params.id}</div>;
      }

      cleanupNavigationMock();
      setupNavigationMock("http://localhost/users/123");

      const routes = [
        route({
          path: "/users/:id",
          component: Page,
        }),
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("ID: 123")).toBeInTheDocument();
    });

    it("routes with loader but no state type work", () => {
      function Page({
        data,
      }: {
        data: { name: string };
        params: Record<string, never>;
      }) {
        return <div>Hello, {data.name}</div>;
      }

      const routes = [
        route({
          path: "/",
          component: Page,
          loader: () => ({ name: "World" }),
        }),
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("Hello, World")).toBeInTheDocument();
    });
  });

  describe("with loader", () => {
    it("receives both data and state props", () => {
      // Test that routes with loaders correctly pass both data and state props
      type FilterState = { filter: string };

      function Page({
        data,
        state,
        setStateSync,
      }: RouteComponentProps<Record<string, never>, FilterState> & {
        data: { items: string[] };
      }) {
        const filter = state?.filter ?? "";
        const filtered = data.items.filter((i) => i.includes(filter));

        return (
          <div>
            <input
              value={filter}
              onChange={(e) => setStateSync({ filter: e.target.value })}
              placeholder="Filter"
            />
            <ul>
              {filtered.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        );
      }

      // Use curried form to specify state type
      const routes = [
        routeState<FilterState>()({
          path: "/",
          component: Page,
          loader: () => ({ items: ["apple", "banana", "cherry"] }),
        }),
      ];

      render(<Router routes={routes} />);

      expect(screen.getByText("apple")).toBeInTheDocument();
      expect(screen.getByText("banana")).toBeInTheDocument();

      act(() => {
        fireEvent.change(screen.getByPlaceholderText("Filter"), {
          target: { value: "an" },
        });
      });

      expect(screen.queryByText("apple")).not.toBeInTheDocument();
      expect(screen.getByText("banana")).toBeInTheDocument();
    });
  });
});
