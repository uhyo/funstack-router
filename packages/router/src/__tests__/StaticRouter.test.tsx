import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { StaticRouter } from "../StaticRouter/index.js";
import { Outlet } from "../Outlet.js";
import { useLocation } from "../hooks/useLocation.js";
import { useSearchParams } from "../hooks/useSearchParams.js";
import { useBlocker } from "../hooks/useBlocker.js";
import { route, type RouteDefinition } from "../route.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";

const originalLocation = window.location;

function setLocation(url: string) {
  const urlObj = new URL(url);
  Object.defineProperty(window, "location", {
    value: {
      href: url,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
      origin: urlObj.origin,
    },
    writable: true,
    configurable: true,
  });
}

describe("StaticRouter", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).navigation;
  });

  afterEach(() => {
    cleanupNavigationMock();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("renders the route matching the current URL without Navigation API", () => {
    setLocation("http://localhost/about");
    const routes: RouteDefinition[] = [
      { path: "/", component: () => <div>Home</div> },
      { path: "/about", component: () => <div>About</div> },
    ];

    render(<StaticRouter routes={routes} />);
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.queryByText("Home")).toBeNull();
  });

  it("renders nested routes with params", () => {
    setLocation("http://localhost/users/42");
    function Layout() {
      return (
        <div>
          Layout <Outlet />
        </div>
      );
    }
    const routes: RouteDefinition[] = [
      route({
        path: "/users",
        component: Layout,
        children: [
          route({
            path: ":id",
            component: ({ params }) => <span>User {params.id}</span>,
          }),
        ],
      }),
    ];

    render(<StaticRouter routes={routes} />);
    expect(screen.getByText("User 42")).toBeInTheDocument();
  });

  it("provides location and search params", () => {
    setLocation("http://localhost/search?q=hello#top");
    function Page() {
      const location = useLocation();
      const [searchParams] = useSearchParams();
      return (
        <div>
          {location.pathname}|{location.hash}|{searchParams.get("q")}
        </div>
      );
    }

    render(<StaticRouter routes={[{ path: "/search", component: Page }]} />);
    expect(screen.getByText("/search|#top|hello")).toBeInTheDocument();
  });

  it("does not intercept navigations even when Navigation API is available", () => {
    const mockNavigation = setupNavigationMock("http://localhost/");
    setLocation("http://localhost/");

    render(<StaticRouter routes={[{ path: "/", component: () => <div>Home</div> }]} />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(mockNavigation.addEventListener).not.toHaveBeenCalled();
  });

  it("allows useBlocker inside routes", () => {
    setLocation("http://localhost/");
    function Page() {
      useBlocker({ shouldBlock: () => true });
      return <div>Page</div>;
    }

    render(<StaticRouter routes={[{ path: "/", component: Page }]} />);
    expect(screen.getByText("Page")).toBeInTheDocument();
  });

  it("warns instead of navigating when navigation is requested", () => {
    setLocation("http://localhost/");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let setSearchParams: ReturnType<typeof useSearchParams>[1] | undefined;
    function Page() {
      setSearchParams = useSearchParams()[1];
      return <div>Page</div>;
    }

    render(<StaticRouter routes={[{ path: "/", component: Page }]} />);
    setSearchParams!({ q: "x" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("StaticRouter"));
    warn.mockRestore();
  });

  it("runs loaders and passes data to components", () => {
    setLocation("http://localhost/items/7");
    const loader = vi.fn(({ params }: { params: { id: string } }) => `item-${params.id}`);
    const routes = [
      route({
        path: "/items/:id",
        loader,
        component: ({ data }: { data: string }) => <div>{data}</div>,
      }),
    ];

    render(<StaticRouter routes={routes} />);
    expect(screen.getByText("item-7")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not share loader results between instances", () => {
    setLocation("http://localhost/a");
    const loader = vi.fn(() => "data");
    const routes = [
      route({
        path: "/a",
        loader,
        component: ({ data }: { data: string }) => <div>{data}</div>,
      }),
    ];

    render(<StaticRouter routes={routes} />).unmount();
    render(<StaticRouter routes={routes} />).unmount();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  describe("SSR", () => {
    it("renders only pathless routes without ssr prop", () => {
      const routes: RouteDefinition[] = [
        {
          component: () => (
            <div>
              Shell <Outlet />
            </div>
          ),
          children: [{ path: "/about", component: () => <span>About</span> }],
        },
      ];

      const html = renderToString(<StaticRouter routes={routes} />);
      expect(html).toContain("Shell");
      expect(html).not.toContain("About");
    });

    it("matches path-based routes with ssr.path", () => {
      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home</div> },
        { path: "/about", component: () => <div>About</div> },
      ];

      const html = renderToString(<StaticRouter routes={routes} ssr={{ path: "/about" }} />);
      expect(html).toContain("About");
      expect(html).not.toContain("Home");
    });

    it("skips routes with loaders unless runLoaders is set", () => {
      const routes = [
        route({
          path: "/data",
          loader: () => "loaded",
          component: ({ data }: { data: string }) => <div>{data}</div>,
        }),
      ];

      expect(
        renderToString(<StaticRouter routes={routes} ssr={{ path: "/data" }} />),
      ).not.toContain("loaded");
      expect(
        renderToString(<StaticRouter routes={routes} ssr={{ path: "/data", runLoaders: true }} />),
      ).toContain("loaded");
    });

    it("hydrates server output and then switches to the real URL", async () => {
      setLocation("http://localhost/about");
      const routes: RouteDefinition[] = [
        {
          component: () => (
            <div>
              Shell <Outlet />
            </div>
          ),
          children: [{ path: "/about", component: () => <span>About</span> }],
        },
      ];

      const container = document.createElement("div");
      container.innerHTML = renderToString(<StaticRouter routes={routes} />);
      document.body.appendChild(container);
      expect(container.textContent).not.toContain("About");

      const onRecoverableError = vi.fn();
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(container, <StaticRouter routes={routes} />, {
          onRecoverableError,
        });
      });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.textContent).toContain("About");

      act(() => root!.unmount());
      container.remove();
    });

    it("reuses loader results from hydration after switching to the real URL", async () => {
      setLocation("http://localhost/data");
      const loader = vi.fn(() => "loaded");
      const routes = [
        route({
          path: "/data",
          loader,
          component: ({ data }: { data: string }) => <div>{data}</div>,
        }),
      ];
      const ssr = { path: "/data", runLoaders: true };

      const container = document.createElement("div");
      container.innerHTML = renderToString(<StaticRouter routes={routes} ssr={ssr} />);
      document.body.appendChild(container);
      loader.mockClear();

      const onRecoverableError = vi.fn();
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(container, <StaticRouter routes={routes} ssr={ssr} />, {
          onRecoverableError,
        });
      });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.textContent).toBe("loaded");
      expect(loader).toHaveBeenCalledTimes(1);

      act(() => root!.unmount());
      container.remove();
    });
  });
});
