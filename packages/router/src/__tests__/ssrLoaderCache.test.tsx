import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "../Router/index.js";
import { route } from "../route.js";
import { clearLoaderCache } from "../core/loaderCache.js";

// No navigation mock is set up in this file: the Router falls back to
// NullAdapter, and the `ssr` prop drives route matching — the same code path
// as server-side rendering. Multiple <Router> mounts in one process simulate
// multiple SSR requests (or SSG pages) rendered by the same server process.
describe("SSR loader cache isolation", () => {
  beforeEach(() => {
    clearLoaderCache();
  });

  function makeRoutes(loaderA: () => string, loaderB: () => string) {
    return [
      route({
        path: "/a",
        loader: loaderA,
        component: ({ data }: { data: string }) => <div data-testid="out">{data}</div>,
      }),
      route({
        path: "/b",
        loader: loaderB,
        component: ({ data }: { data: string }) => <div data-testid="out">{data}</div>,
      }),
    ];
  }

  it("does not leak loader data across Router instances rendering different paths", () => {
    const loaderA = vi.fn(() => "data-for-A");
    const loaderB = vi.fn(() => "data-for-B");

    const first = render(
      <Router routes={makeRoutes(loaderA, loaderB)} ssr={{ path: "/a", runLoaders: true }} />,
    );
    expect(screen.getByTestId("out")).toHaveTextContent("data-for-A");
    first.unmount();

    const second = render(
      <Router routes={makeRoutes(loaderA, loaderB)} ssr={{ path: "/b", runLoaders: true }} />,
    );
    expect(screen.getByTestId("out")).toHaveTextContent("data-for-B");
    expect(loaderB).toHaveBeenCalledTimes(1);
    second.unmount();
  });

  it("re-executes loaders for each Router instance rendering the same path", () => {
    // Each SSR render is a separate request: loader results must not be
    // shared between them even for the same URL.
    const loader = vi.fn(() => "data");
    const routes = [
      route({
        path: "/a",
        loader,
        component: ({ data }: { data: string }) => <div data-testid="out">{data}</div>,
      }),
    ];

    const first = render(<Router routes={routes} ssr={{ path: "/a", runLoaders: true }} />);
    first.unmount();
    const second = render(<Router routes={routes} ssr={{ path: "/a", runLoaders: true }} />);
    second.unmount();

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("still memoizes loader results within a single Router instance", () => {
    const loader = vi.fn(() => "data");
    const mkRoutes = () => [
      route({
        path: "/a",
        loader,
        component: ({ data }: { data: string }) => <div data-testid="out">{data}</div>,
      }),
    ];

    const view = render(<Router routes={mkRoutes()} ssr={{ path: "/a", runLoaders: true }} />);
    // New routes array identity forces the matching memo to recompute;
    // the instance cache must still prevent a second loader execution.
    view.rerender(<Router routes={mkRoutes()} ssr={{ path: "/a", runLoaders: true }} />);

    expect(screen.getByTestId("out")).toHaveTextContent("data");
    expect(loader).toHaveBeenCalledTimes(1);
    view.unmount();
  });
});
