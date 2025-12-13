import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { Suspense } from "react";
import { Router } from "../Router.js";
import { useLoaderData } from "../hooks/useLoaderData.js";
import { clearLoaderCache } from "../core/loaderCache.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import type { RouteDefinition, LoaderArgs } from "../types.js";

describe("Data Loader", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    clearLoaderCache();
    mockNavigation = setupNavigationMock("http://localhost/");
  });

  afterEach(() => {
    cleanupNavigationMock();
    clearLoaderCache();
  });

  it("renders route with loader data", async () => {
    const loader = vi.fn().mockResolvedValue({ message: "Hello from loader" });

    function Page() {
      const data = useLoaderData<{ message: string }>();
      return <div>{data.message}</div>;
    }

    const routes: RouteDefinition[] = [{ path: "/", component: Page, loader }];

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <Router routes={routes} />
      </Suspense>,
    );

    // Should show loading initially
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Wait for loader to resolve
    await waitFor(() => {
      expect(screen.getByText("Hello from loader")).toBeInTheDocument();
    });

    expect(loader).toHaveBeenCalled();
  });

  it("passes params to loader", async () => {
    mockNavigation = setupNavigationMock("http://localhost/users/42");

    const loader = vi
      .fn()
      .mockImplementation(async ({ params }: LoaderArgs) => {
        return { userId: params.id };
      });

    function UserPage() {
      const data = useLoaderData<{ userId: string }>();
      return <div>User: {data.userId}</div>;
    }

    const routes: RouteDefinition[] = [
      { path: "/users/:id", component: UserPage, loader },
    ];

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <Router routes={routes} />
      </Suspense>,
    );

    await waitFor(() => {
      expect(screen.getByText("User: 42")).toBeInTheDocument();
    });

    expect(loader).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { id: "42" },
      }),
    );
  });

  it("passes request to loader", async () => {
    mockNavigation = setupNavigationMock("http://localhost/page?foo=bar");

    const loader = vi
      .fn()
      .mockImplementation(async ({ request }: LoaderArgs) => {
        const url = new URL(request.url);
        return { search: url.search };
      });

    function Page() {
      const data = useLoaderData<{ search: string }>();
      return <div>Search: {data.search}</div>;
    }

    const routes: RouteDefinition[] = [
      { path: "/page", component: Page, loader },
    ];

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <Router routes={routes} />
      </Suspense>,
    );

    await waitFor(() => {
      expect(screen.getByText("Search: ?foo=bar")).toBeInTheDocument();
    });
  });

  it("supports synchronous loaders", async () => {
    const loader = vi.fn().mockReturnValue({ sync: true });

    function Page() {
      const data = useLoaderData<{ sync: boolean }>();
      return <div>Sync: {data.sync ? "yes" : "no"}</div>;
    }

    const routes: RouteDefinition[] = [{ path: "/", component: Page, loader }];

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <Router routes={routes} />
      </Suspense>,
    );

    await waitFor(() => {
      expect(screen.getByText("Sync: yes")).toBeInTheDocument();
    });
  });

  it("caches loader results for same URL", async () => {
    mockNavigation = setupNavigationMock("http://localhost/");

    let callCount = 0;
    const loader = vi.fn().mockImplementation(async () => {
      callCount++;
      return { count: callCount };
    });

    function Page() {
      const data = useLoaderData<{ count: number }>();
      return <div>Count: {data.count}</div>;
    }

    const routes: RouteDefinition[] = [{ path: "/", component: Page, loader }];

    const { rerender } = render(
      <Suspense fallback={<div>Loading...</div>}>
        <Router routes={routes} />
      </Suspense>,
    );

    await waitFor(() => {
      expect(screen.getByText("Count: 1")).toBeInTheDocument();
    });

    // Rerender - should use cached data
    rerender(
      <Suspense fallback={<div>Loading...</div>}>
        <Router routes={routes} />
      </Suspense>,
    );

    // Should still show cached result
    expect(screen.getByText("Count: 1")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("routes without loaders work normally", () => {
    function Page() {
      return <div>No loader here</div>;
    }

    const routes: RouteDefinition[] = [{ path: "/", component: Page }];

    render(<Router routes={routes} />);
    expect(screen.getByText("No loader here")).toBeInTheDocument();
  });

  it("useLoaderData returns undefined when no loader is defined", () => {
    function Page() {
      const data = useLoaderData();
      return <div>Data: {data === undefined ? "undefined" : "defined"}</div>;
    }

    const routes: RouteDefinition[] = [{ path: "/", component: Page }];

    render(<Router routes={routes} />);
    expect(screen.getByText("Data: undefined")).toBeInTheDocument();
  });

  it("handles loader errors with error boundary", async () => {
    const loader = vi.fn().mockRejectedValue(new Error("Loader failed"));

    function Page() {
      const data = useLoaderData();
      return <div>Data: {JSON.stringify(data)}</div>;
    }

    const routes: RouteDefinition[] = [{ path: "/", component: Page, loader }];

    // Create a simple error boundary for testing
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state: { error: Error | null } = { error: null };

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

    render(
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <Router routes={routes} />
        </Suspense>
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(screen.getByText("Error: Loader failed")).toBeInTheDocument();
    });
  });
});

// Need to import React for ErrorBoundary class
import React from "react";
