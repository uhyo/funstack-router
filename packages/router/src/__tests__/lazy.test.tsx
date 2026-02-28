import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { Router } from "../Router/index.js";
import { Outlet } from "../Outlet.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { route, type RouteDefinition } from "../route.js";
import type { InternalRouteDefinition } from "../types.js";
import { matchRoutes } from "../core/matchRoutes.js";

describe("Lazy Route Definitions", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    mockNavigation = setupNavigationMock("http://localhost/");
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  describe("matchRoutes", () => {
    it("handles sync return from lazy children function", () => {
      const childRoutes = [
        { path: "settings", component: () => <div>Settings</div> },
      ] as unknown as InternalRouteDefinition[];

      const routes = [
        {
          path: "admin",
          component: () => <div>Admin</div>,
          children: () => childRoutes,
        },
      ] as unknown as InternalRouteDefinition[];

      const result = matchRoutes(routes, "/admin/settings");
      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0].pathname).toBe("/admin");
      expect(result![1].pathname).toBe("/settings");
    });

    it("returns partial match for async lazy children", () => {
      const routes = [
        {
          path: "admin",
          component: () => <div>Admin</div>,
          children: () =>
            Promise.resolve([
              {
                path: "settings",
                component: () => <div>Settings</div>,
              },
            ]),
        },
      ] as unknown as InternalRouteDefinition[];

      const result = matchRoutes(routes, "/admin/settings");
      expect(result).not.toBeNull();
      // Only parent match since children are async
      expect(result).toHaveLength(1);
      expect(result![0].pathname).toBe("/admin");
    });

    it("does not mutate route.children (stays a function)", () => {
      const childRoutes = [
        { path: "settings", component: () => <div>Settings</div> },
      ] as unknown as InternalRouteDefinition[];

      const childrenFn = () => childRoutes;
      const routes = [
        {
          path: "admin",
          component: () => <div>Admin</div>,
          children: childrenFn,
        },
      ] as unknown as InternalRouteDefinition[];

      matchRoutes(routes, "/admin/settings");
      // children is still the function, not mutated to array
      expect(typeof routes[0].children).toBe("function");
    });

    it("matches parent as prefix with unresolved lazy children", () => {
      const routes = [
        {
          path: "admin",
          component: () => <div>Admin</div>,
          children: () =>
            Promise.resolve([
              {
                path: "settings",
                component: () => <div>Settings</div>,
              },
            ]),
        },
      ] as unknown as InternalRouteDefinition[];

      // Should match /admin as prefix even though children aren't loaded
      const result = matchRoutes(routes, "/admin/anything");
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].pathname).toBe("/admin");
    });

    it("pathless route with lazy children returns parent match", () => {
      const routes = [
        {
          component: () => <div>Layout</div>,
          children: () =>
            Promise.resolve([
              {
                path: "settings",
                component: () => <div>Settings</div>,
              },
            ]),
        },
      ] as unknown as InternalRouteDefinition[];

      const result = matchRoutes(routes, "/settings");
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].pathname).toBe("");
    });

    it("does not affect static sibling routes", () => {
      const routes = [
        { path: "about", component: () => <div>About</div> },
        {
          path: "admin",
          component: () => <div>Admin</div>,
          children: () =>
            Promise.resolve([
              {
                path: "settings",
                component: () => <div>Settings</div>,
              },
            ]),
        },
      ] as unknown as InternalRouteDefinition[];

      // Static route should match normally
      const result = matchRoutes(routes, "/about");
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].pathname).toBe("/about");
    });

    it("sync lazy children with no match returns null when requireChildren is not false", () => {
      const routes = [
        {
          path: "admin",
          component: () => <div>Admin</div>,
          children: () =>
            [
              { path: "settings", component: () => <div>Settings</div> },
            ] as unknown as InternalRouteDefinition[],
        },
      ] as unknown as InternalRouteDefinition[];

      const result = matchRoutes(routes, "/admin/nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("Router integration", () => {
    it("lazy children resolve on initial load with Suspense fallback", async () => {
      cleanupNavigationMock();
      mockNavigation = setupNavigationMock("http://localhost/admin/settings");

      let resolveChildren!: (value: RouteDefinition[]) => void;
      const childrenPromise = new Promise<RouteDefinition[]>((resolve) => {
        resolveChildren = resolve;
      });

      // Use caching pattern
      let cached: RouteDefinition[] | undefined;
      let cachedPromise: Promise<RouteDefinition[]> | undefined;
      const lazyFn = () => {
        if (cached) return cached;
        if (!cachedPromise) {
          cachedPromise = childrenPromise.then((result) => {
            cached = result;
            return result;
          });
        }
        return cachedPromise;
      };

      function AdminLayout() {
        return (
          <div>
            <div>Admin Layout</div>
            <Suspense fallback={<div>Loading...</div>}>
              <Outlet />
            </Suspense>
          </div>
        );
      }

      const routes: RouteDefinition[] = [
        {
          path: "admin",
          component: AdminLayout,
          children: lazyFn,
        },
      ];

      render(<Router routes={routes} />);

      // Admin layout should render immediately
      expect(screen.getByText("Admin Layout")).toBeInTheDocument();

      // Suspense fallback should be shown
      expect(screen.getByText("Loading...")).toBeInTheDocument();

      // Resolve lazy children
      await act(async () => {
        resolveChildren([
          route({
            path: "settings",
            component: () => <div>Settings Page</div>,
          }),
        ]);
        // Wait for promise to propagate
        await cachedPromise;
      });

      // After resolution, settings page should render
      await waitFor(() => {
        expect(screen.getByText("Settings Page")).toBeInTheDocument();
      });
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("lazy children resolve on navigation (old page stays visible)", async () => {
      const childRoutes = [
        route({
          path: "settings",
          component: () => <div>Settings Page</div>,
        }),
      ];

      // Use a micro-delay to simulate async resolution that resolves quickly
      let cached: RouteDefinition[] | undefined;
      let cachedPromise: Promise<RouteDefinition[]> | undefined;
      const lazyFn = () => {
        if (cached) return cached;
        if (!cachedPromise) {
          cachedPromise = Promise.resolve(childRoutes).then((result) => {
            cached = result;
            return result;
          });
        }
        return cachedPromise;
      };

      function AdminLayout() {
        return (
          <div>
            <div>Admin Layout</div>
            <Suspense fallback={<div>Loading admin...</div>}>
              <Outlet />
            </Suspense>
          </div>
        );
      }

      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home Page</div> },
        {
          path: "admin",
          component: AdminLayout,
          children: lazyFn,
        },
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("Home Page")).toBeInTheDocument();

      // Navigate to admin/settings and resolve
      await act(async () => {
        mockNavigation.__simulateNavigation("http://localhost/admin/settings");
        await cachedPromise;
      });

      // After resolution, settings page should render
      await waitFor(() => {
        expect(screen.getByText("Settings Page")).toBeInTheDocument();
      });
      expect(screen.queryByText("Home Page")).not.toBeInTheDocument();
    });

    it("resolution is cached — lazy function called but returns sync on revisit", async () => {
      const childRoutes = [
        route({
          path: "settings",
          component: () => <div>Settings Page</div>,
        }),
      ];

      let callCount = 0;
      let cached: RouteDefinition[] | undefined;
      let cachedPromise: Promise<RouteDefinition[]> | undefined;
      const lazyFn = () => {
        callCount++;
        if (cached) return cached;
        if (!cachedPromise) {
          cachedPromise = Promise.resolve(childRoutes).then((result) => {
            cached = result;
            return result;
          });
        }
        return cachedPromise;
      };

      function AdminLayout() {
        return (
          <div>
            <div>Admin Layout</div>
            <Suspense fallback={<div>Loading...</div>}>
              <Outlet />
            </Suspense>
          </div>
        );
      }

      const routes: RouteDefinition[] = [
        {
          path: "/",
          component: () => <Outlet />,
          children: [
            { path: "", component: () => <div>Home</div> },
            {
              path: "admin",
              component: AdminLayout,
              children: lazyFn,
            },
          ],
        },
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("Home")).toBeInTheDocument();

      // Navigate to admin/settings
      await act(async () => {
        mockNavigation.__simulateNavigation("http://localhost/admin/settings");
        await cachedPromise;
      });

      await waitFor(() => {
        expect(screen.getByText("Settings Page")).toBeInTheDocument();
      });

      // Navigate back to home
      act(() => {
        mockNavigation.__simulateNavigation("http://localhost/");
      });

      await waitFor(() => {
        expect(screen.getByText("Home")).toBeInTheDocument();
      });

      const countBeforeRevisit = callCount;

      // Navigate back to admin/settings (should use cached result)
      act(() => {
        mockNavigation.__simulateNavigation("http://localhost/admin/settings");
      });

      await waitFor(() => {
        expect(screen.getByText("Settings Page")).toBeInTheDocument();
      });

      // The function is called again, but returns sync (cached)
      expect(callCount).toBeGreaterThan(countBeforeRevisit);
      // The important thing is that it returns sync — no Suspense fallback shown
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("nested lazy children resolve sequentially", async () => {
      let resolveAdminChildren!: (value: RouteDefinition[]) => void;
      const adminPromise = new Promise<RouteDefinition[]>((resolve) => {
        resolveAdminChildren = resolve;
      });

      let cachedAdmin: RouteDefinition[] | undefined;
      let cachedAdminPromise: Promise<RouteDefinition[]> | undefined;
      const adminLazy = () => {
        if (cachedAdmin) return cachedAdmin;
        if (!cachedAdminPromise) {
          cachedAdminPromise = adminPromise.then((result) => {
            cachedAdmin = result;
            return result;
          });
        }
        return cachedAdminPromise;
      };

      let resolveAdvancedChildren!: (value: RouteDefinition[]) => void;
      const advancedPromise = new Promise<RouteDefinition[]>((resolve) => {
        resolveAdvancedChildren = resolve;
      });

      let cachedAdvanced: RouteDefinition[] | undefined;
      let cachedAdvancedPromise: Promise<RouteDefinition[]> | undefined;
      const advancedLazy = () => {
        if (cachedAdvanced) return cachedAdvanced;
        if (!cachedAdvancedPromise) {
          cachedAdvancedPromise = advancedPromise.then((result) => {
            cachedAdvanced = result;
            return result;
          });
        }
        return cachedAdvancedPromise;
      };

      function AdminLayout() {
        return (
          <div>
            <div>Admin</div>
            <Suspense fallback={<div>Loading admin...</div>}>
              <Outlet />
            </Suspense>
          </div>
        );
      }

      function AdvancedLayout() {
        return (
          <div>
            <div>Advanced</div>
            <Suspense fallback={<div>Loading advanced...</div>}>
              <Outlet />
            </Suspense>
          </div>
        );
      }

      cleanupNavigationMock();
      mockNavigation = setupNavigationMock(
        "http://localhost/admin/advanced/audit",
      );

      const routes: RouteDefinition[] = [
        {
          path: "admin",
          component: AdminLayout,
          children: adminLazy,
        },
      ];

      render(<Router routes={routes} />);

      // Admin renders with loading fallback
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Loading admin...")).toBeInTheDocument();

      // Resolve admin children (which include a nested lazy route)
      await act(async () => {
        resolveAdminChildren([
          route({
            path: "advanced",
            component: AdvancedLayout,
            children: advancedLazy,
          }),
        ]);
        await cachedAdminPromise;
      });

      // Admin children resolved, but advanced children still loading
      await waitFor(() => {
        expect(screen.getByText("Advanced")).toBeInTheDocument();
      });
      expect(screen.getByText("Loading advanced...")).toBeInTheDocument();

      // Resolve advanced children
      await act(async () => {
        resolveAdvancedChildren([
          route({
            path: "audit",
            component: () => <div>Audit Page</div>,
          }),
        ]);
        await cachedAdvancedPromise;
      });

      // Full tree rendered
      await waitFor(() => {
        expect(screen.getByText("Audit Page")).toBeInTheDocument();
      });
      expect(screen.queryByText("Loading admin...")).not.toBeInTheDocument();
      expect(screen.queryByText("Loading advanced...")).not.toBeInTheDocument();
    });

    it("pathless route with lazy children works", async () => {
      cleanupNavigationMock();
      mockNavigation = setupNavigationMock("http://localhost/dashboard");

      const childRoutes = [
        route({
          path: "dashboard",
          component: () => <div>Dashboard</div>,
        }),
      ];

      let cached: RouteDefinition[] | undefined;
      let cachedPromise: Promise<RouteDefinition[]> | undefined;
      const lazyFn = () => {
        if (cached) return cached;
        if (!cachedPromise) {
          cachedPromise = Promise.resolve(childRoutes).then((result) => {
            cached = result;
            return result;
          });
        }
        return cachedPromise;
      };

      function Layout() {
        return (
          <div>
            <div>Layout</div>
            <Suspense fallback={<div>Loading...</div>}>
              <Outlet />
            </Suspense>
          </div>
        );
      }

      const routes: RouteDefinition[] = [
        {
          component: Layout,
          children: lazyFn,
        },
      ];

      render(<Router routes={routes} />);

      expect(screen.getByText("Layout")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();

      await act(async () => {
        await cachedPromise;
      });

      await waitFor(() => {
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
      });
    });

    it("lazy children with loaders work after resolution", async () => {
      cleanupNavigationMock();
      mockNavigation = setupNavigationMock("http://localhost/admin/settings");

      const childRoutes = [
        route({
          path: "settings",
          loader: () => "loaded-data",
          component: ({ data }: { data: string }) => (
            <div>Settings: {data}</div>
          ),
        }),
      ];

      let cached: RouteDefinition[] | undefined;
      let cachedPromise: Promise<RouteDefinition[]> | undefined;
      const lazyFn = () => {
        if (cached) return cached;
        if (!cachedPromise) {
          cachedPromise = Promise.resolve(childRoutes).then((result) => {
            cached = result;
            return result;
          });
        }
        return cachedPromise;
      };

      function AdminLayout() {
        return (
          <div>
            <div>Admin</div>
            <Suspense fallback={<div>Loading...</div>}>
              <Outlet />
            </Suspense>
          </div>
        );
      }

      const routes: RouteDefinition[] = [
        {
          path: "admin",
          component: AdminLayout,
          children: lazyFn,
        },
      ];

      render(<Router routes={routes} />);

      await act(async () => {
        await cachedPromise;
      });

      await waitFor(() => {
        expect(screen.getByText("Settings: loaded-data")).toBeInTheDocument();
      });
    });

    it("lazy resolution failure propagates to error boundary", async () => {
      cleanupNavigationMock();
      mockNavigation = setupNavigationMock("http://localhost/admin/settings");

      // Suppress React error boundary console errors in test output
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      let rejectChildren!: (error: Error) => void;
      const childrenPromise = new Promise<RouteDefinition[]>((_, reject) => {
        rejectChildren = reject;
      });

      // Use caching pattern (same promise reference)
      const lazyFn = () => childrenPromise;

      const { Component: ReactComponent } = await import("react");

      class ErrorBoundary extends ReactComponent<
        { children: React.ReactNode },
        { error: Error | null }
      > {
        state = { error: null as Error | null };
        static getDerivedStateFromError(error: Error) {
          return { error };
        }
        render() {
          if (this.state.error) {
            return <div>Error: {this.state.error.message}</div>;
          }
          return this.props.children;
        }
      }

      function AdminLayout() {
        return (
          <div>
            <div>Admin</div>
            <ErrorBoundary>
              <Suspense fallback={<div>Loading...</div>}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      }

      const routes: RouteDefinition[] = [
        {
          path: "admin",
          component: AdminLayout,
          children: lazyFn,
        },
      ];

      const { unmount } = render(<Router routes={routes} />);

      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();

      // Reject the lazy children promise
      await act(async () => {
        rejectChildren(new Error("Network error"));
        // Wait for rejection to propagate
        await new Promise((r) => setTimeout(r, 0));
      });

      // Error boundary should catch the error
      await waitFor(() => {
        expect(screen.getByText("Error: Network error")).toBeInTheDocument();
      });

      unmount();
      consoleSpy.mockRestore();
    });

    it("sync resolution works without Suspense", () => {
      cleanupNavigationMock();
      mockNavigation = setupNavigationMock("http://localhost/admin/settings");

      const childRoutes: RouteDefinition[] = [
        route({
          path: "settings",
          component: () => <div>Settings Page</div>,
        }),
      ];

      // Returns sync immediately (already cached)
      const lazyFn = () => childRoutes;

      function AdminLayout() {
        return (
          <div>
            <div>Admin Layout</div>
            <Outlet />
          </div>
        );
      }

      const routes: RouteDefinition[] = [
        {
          path: "admin",
          component: AdminLayout,
          children: lazyFn,
        },
      ];

      render(<Router routes={routes} />);

      // Should render immediately with no Suspense needed
      expect(screen.getByText("Admin Layout")).toBeInTheDocument();
      expect(screen.getByText("Settings Page")).toBeInTheDocument();
    });
  });
});
