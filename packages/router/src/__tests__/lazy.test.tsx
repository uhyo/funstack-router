import { Suspense } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Router } from "../Router/index.js";
import { Outlet } from "../Outlet.js";
import {
  lazyRouteChildren,
  route,
  type RouteDefinition,
  type LazyRouteChildren,
} from "../route.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";

describe("lazy route definitions", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    mockNavigation = setupNavigationMock("http://localhost/");
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  function Layout() {
    return (
      <div>
        <h1>Layout</h1>
        <Suspense fallback={<div>Loading route...</div>}>
          <Outlet />
        </Suspense>
      </div>
    );
  }

  it("shows suspense fallback on initial load until lazy children resolve", async () => {
    mockNavigation = setupNavigationMock("http://localhost/admin/settings");

    let resolveChildren: ((value: RouteDefinition[]) => void) | undefined;
    const children: LazyRouteChildren = lazyRouteChildren(
      () =>
        new Promise<RouteDefinition[]>((resolve) => {
          resolveChildren = resolve;
        }),
    );

    render(
      <Router
        routes={[
          route({
            path: "/admin",
            component: Layout,
            children,
          }),
        ]}
      />,
    );

    expect(screen.getByText("Layout")).toBeInTheDocument();
    expect(screen.getByText("Loading route...")).toBeInTheDocument();

    await act(async () => {
      resolveChildren?.([route({ path: "settings", component: () => <div>Settings</div> })]);
    });

    expect(await screen.findByText("Settings")).toBeInTheDocument();
  });

  it("loads lazy children when navigating to a lazy route", async () => {
    let resolveChildren: ((value: RouteDefinition[]) => void) | undefined;
    const children = lazyRouteChildren(
      () =>
        new Promise<RouteDefinition[]>((resolve) => {
          resolveChildren = resolve;
        }),
    );

    render(
      <Router
        routes={[
          route({
            path: "/",
            component: Layout,
            children: [
              route({ path: "", component: () => <div>Home</div> }),
              route({
                path: "admin",
                component: () => <Outlet />,
                children,
              }),
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText("Home")).toBeInTheDocument();

    await act(async () => {
      mockNavigation.__simulateNavigation("http://localhost/admin/settings");
    });

    expect(screen.getByText("Home")).toBeInTheDocument();
    await act(async () => {
      resolveChildren?.([route({ path: "settings", component: () => <div>Settings</div> })]);
    });
    expect(await screen.findByText("Settings")).toBeInTheDocument();
  });

  it("reuses cached lazy children between navigations", async () => {
    let resolveChildren: ((value: RouteDefinition[]) => void) | undefined;
    const loadChildren = vi.fn(
      () =>
        new Promise<RouteDefinition[]>((resolve) => {
          resolveChildren = resolve;
        }),
    );
    const children = lazyRouteChildren(loadChildren);

    render(
      <Router
        routes={[
          route({
            path: "/",
            component: Layout,
            children: [
              route({ path: "", component: () => <div>Home</div> }),
              route({
                path: "admin",
                component: () => <Outlet />,
                children,
              }),
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      mockNavigation.__simulateNavigation("http://localhost/admin/settings");
    });
    await act(async () => {
      resolveChildren?.([route({ path: "settings", component: () => <div>Settings</div> })]);
    });
    expect(await screen.findByText("Settings")).toBeInTheDocument();

    await act(async () => {
      mockNavigation.__simulateNavigation("http://localhost/");
    });
    expect(await screen.findByText("Home")).toBeInTheDocument();

    await act(async () => {
      mockNavigation.__simulateNavigation("http://localhost/admin/settings");
    });
    expect(await screen.findByText("Settings")).toBeInTheDocument();
    expect(loadChildren).toHaveBeenCalledTimes(1);
  });
});
