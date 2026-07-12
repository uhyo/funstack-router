import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "../Router/index.js";
import { Outlet } from "../Outlet.js";
import { route } from "../route.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { clearLoaderCache } from "../core/loaderCache.js";

describe("Dynamic routes prop", () => {
  beforeEach(() => {
    setupNavigationMock("http://localhost/");
    clearLoaderCache();
  });

  afterEach(() => {
    cleanupNavigationMock();
    vi.restoreAllMocks();
  });

  function Page({ data }: { data: { label: string } }) {
    return <div>Label: {data.label}</div>;
  }

  it("re-executes loaders when the routes prop changes on the same entry", () => {
    const loaderA = vi.fn(() => ({ label: "variant A" }));
    const loaderB = vi.fn(() => ({ label: "variant B" }));

    const routesA = [route({ path: "/", component: Page, loader: loaderA })];
    const routesB = [route({ path: "/", component: Page, loader: loaderB })];

    const { rerender } = render(<Router routes={routesA} />);
    expect(screen.getByText("Label: variant A")).toBeInTheDocument();

    // Same URL, same navigation entry — only the routes prop changes,
    // as with feature flags or permission-dependent routes.
    rerender(<Router routes={routesB} />);
    expect(screen.getByText("Label: variant B")).toBeInTheDocument();
    expect(loaderB).toHaveBeenCalledTimes(1);
  });

  it("serves cached results again when switching back to previous routes", () => {
    const loaderA = vi.fn(() => ({ label: "variant A" }));
    const loaderB = vi.fn(() => ({ label: "variant B" }));

    const routesA = [route({ path: "/", component: Page, loader: loaderA })];
    const routesB = [route({ path: "/", component: Page, loader: loaderB })];

    const { rerender } = render(<Router routes={routesA} />);
    rerender(<Router routes={routesB} />);
    rerender(<Router routes={routesA} />);

    expect(screen.getByText("Label: variant A")).toBeInTheDocument();
    // Both variants' results stay cached for this entry, so flipping the
    // flag back does not refetch.
    expect(loaderA).toHaveBeenCalledTimes(1);
    expect(loaderB).toHaveBeenCalledTimes(1);
  });

  it("does not re-execute loaders when the same routes array is re-rendered", () => {
    const loader = vi.fn(() => ({ label: "stable" }));
    const routes = [route({ path: "/", component: Page, loader })];

    const { rerender } = render(<Router routes={routes} />);
    rerender(<Router routes={routes} />);
    rerender(<Router routes={routes} />);

    expect(screen.getByText("Label: stable")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not re-execute loaders when route objects are recreated with the same loader", () => {
    const loader = vi.fn(() => ({ label: "stable loader" }));
    const makeRoutes = () => [route({ path: "/", component: Page, loader })];

    const { rerender } = render(<Router routes={makeRoutes()} />);
    // Route objects are recreated, but they reference the same loader
    // function, so the cached result is reused.
    rerender(<Router routes={makeRoutes()} />);

    expect(screen.getByText("Label: stable loader")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("re-executes a shared loader when a routes change gives it different params", () => {
    cleanupNavigationMock();
    setupNavigationMock("http://localhost/home");
    clearLoaderCache();

    const loader = vi.fn(({ params }: { params: Record<string, string> }) => ({
      label: Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(","),
    }));

    const routesA = [route({ path: "/:page", component: Page, loader })];
    const routesB = [route({ path: "/:section", component: Page, loader })];

    const { rerender } = render(<Router routes={routesA} />);
    expect(screen.getByText("Label: page=home")).toBeInTheDocument();

    // Same loader function, but the new pattern extracts different params,
    // so the cached result must not be served.
    rerender(<Router routes={routesB} />);
    expect(screen.getByText("Label: section=home")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does not serve one Router's loader data to another Router on the same page", () => {
    const loaderA = vi.fn(() => ({ label: "router A" }));
    const loaderB = vi.fn(() => ({ label: "router B" }));

    const routesA = [route({ path: "/", component: Page, loader: loaderA })];
    const routesB = [route({ path: "/", component: Page, loader: loaderB })];

    // Both Routers observe the same navigation entry, so without route
    // identity in the cache key their loader results would collide.
    render(
      <>
        <Router routes={routesA} />
        <Router routes={routesB} />
      </>,
    );

    expect(screen.getByText("Label: router A")).toBeInTheDocument();
    expect(screen.getByText("Label: router B")).toBeInTheDocument();
    expect(loaderA).toHaveBeenCalledTimes(1);
    expect(loaderB).toHaveBeenCalledTimes(1);
  });

  it("keeps cached results of route objects shared between route trees", () => {
    const parentLoaderA = vi.fn(() => ({ label: "layout A" }));
    const parentLoaderB = vi.fn(() => ({ label: "layout B" }));
    const childLoader = vi.fn(() => ({ label: "dashboard" }));

    cleanupNavigationMock();
    setupNavigationMock("http://localhost/dashboard");
    clearLoaderCache();

    function Layout({ data }: { data: { label: string } }) {
      return (
        <div>
          <div>Layout: {data.label}</div>
          <Outlet />
        </div>
      );
    }

    // The same child route object is shared by both route trees.
    const child = route({
      path: "dashboard",
      component: Page,
      loader: childLoader,
    });
    const routesA = [
      route({
        path: "/",
        component: Layout,
        loader: parentLoaderA,
        children: [child],
      }),
    ];
    const routesB = [
      route({
        path: "/",
        component: Layout,
        loader: parentLoaderB,
        children: [child],
      }),
    ];

    const { rerender } = render(<Router routes={routesA} />);
    expect(screen.getByText("Layout: layout A")).toBeInTheDocument();
    expect(screen.getByText("Label: dashboard")).toBeInTheDocument();

    rerender(<Router routes={routesB} />);
    expect(screen.getByText("Layout: layout B")).toBeInTheDocument();
    expect(screen.getByText("Label: dashboard")).toBeInTheDocument();

    // Only the parent route changed identity; the shared child route keeps
    // its cached result and does not re-execute.
    expect(parentLoaderA).toHaveBeenCalledTimes(1);
    expect(parentLoaderB).toHaveBeenCalledTimes(1);
    expect(childLoader).toHaveBeenCalledTimes(1);
  });
});
