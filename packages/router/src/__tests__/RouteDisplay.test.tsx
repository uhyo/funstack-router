import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { RouteDisplay } from "../RouteDisplay/index.js";
import { Outlet } from "../Outlet.js";
import { useLocation } from "../hooks/useLocation.js";
import { useSearchParams } from "../hooks/useSearchParams.js";
import { useBlocker } from "../hooks/useBlocker.js";
import { route, routeState, type RouteComponentProps, type RouteDefinition } from "../route.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { clearLoaderCache } from "../core/loaderCache.js";

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
      assign: vi.fn(),
      replace: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
}

type CountState = { count: number };
type CountProps = RouteComponentProps<Record<string, never>, CountState>;

describe("RouteDisplay", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).navigation;
    clearLoaderCache();
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

    render(<RouteDisplay routes={routes} />);
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

    render(<RouteDisplay routes={routes} />);
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

    render(<RouteDisplay routes={[{ path: "/search", component: Page }]} />);
    expect(screen.getByText("/search|#top|hello")).toBeInTheDocument();
  });

  it("allows useBlocker inside routes", () => {
    setLocation("http://localhost/");
    function Page() {
      useBlocker({ shouldBlock: () => true });
      return <div>Page</div>;
    }

    render(<RouteDisplay routes={[{ path: "/", component: Page }]} />);
    expect(screen.getByText("Page")).toBeInTheDocument();
  });

  it("performs full page navigations from setters without Navigation API", () => {
    setLocation("http://localhost/?a=1");
    const receiveSetSearchParams = vi.fn<(setter: ReturnType<typeof useSearchParams>[1]) => void>();
    function Page({ setState }: CountProps) {
      receiveSetSearchParams(useSearchParams()[1]);
      return <button onClick={() => void setState({ count: 1 })}>Set</button>;
    }
    const routes = [routeState<CountState>()({ path: "/", component: Page })];

    render(<RouteDisplay routes={routes} />);
    const setSearchParams = receiveSetSearchParams.mock.lastCall![0];

    setSearchParams({ q: "x" }, { replace: false });
    expect(window.location.assign).toHaveBeenCalledWith("/?q=x");

    setSearchParams({ q: "y" });
    expect(window.location.replace).toHaveBeenCalledWith("/?q=y");

    fireEvent.click(screen.getByText("Set"));
    expect(window.location.replace).toHaveBeenCalledWith("http://localhost/?a=1");
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

    render(<RouteDisplay routes={routes} />);
    expect(screen.getByText("item-7")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  describe("with Navigation API", () => {
    it("does not intercept navigations", () => {
      const mockNavigation = setupNavigationMock("http://localhost/");

      render(<RouteDisplay routes={[{ path: "/", component: () => <div>Home</div> }]} />);
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(mockNavigation.addEventListener).not.toHaveBeenCalledWith(
        "navigate",
        expect.anything(),
      );
    });

    it("exposes the entry id and key", () => {
      const mockNavigation = setupNavigationMock("http://localhost/");
      function Page() {
        const location = useLocation();
        return (
          <div>
            {location.entryId}|{location.entryKey}
          </div>
        );
      }

      render(<RouteDisplay routes={[{ path: "/", component: Page }]} />);
      const entry = mockNavigation.currentEntry;
      expect(screen.getByText(`${entry.id}|${entry.key}`)).toBeInTheDocument();
    });

    it("exposes route state of the current entry", () => {
      const mockNavigation = setupNavigationMock("http://localhost/");
      mockNavigation.currentEntry.__updateState({
        __routeStates: [{ count: 3 }],
      });
      function Page({ state }: CountProps) {
        return <div>Count: {state?.count ?? "none"}</div>;
      }
      const routes = [routeState<CountState>()({ path: "/", component: Page })];

      render(<RouteDisplay routes={routes} />);
      expect(screen.getByText("Count: 3")).toBeInTheDocument();
    });

    it("updates route state in place with setStateSync", () => {
      const mockNavigation = setupNavigationMock("http://localhost/");
      function Page({ state, setStateSync }: CountProps) {
        return (
          <button onClick={() => setStateSync({ count: (state?.count ?? 0) + 1 })}>
            Count: {state?.count ?? 0}
          </button>
        );
      }
      const routes = [routeState<CountState>()({ path: "/", component: Page })];

      render(<RouteDisplay routes={routes} />);
      fireEvent.click(screen.getByText("Count: 0"));
      expect(mockNavigation.updateCurrentEntry).toHaveBeenCalledWith({
        state: { __routeStates: [{ count: 1 }] },
      });
      expect(screen.getByText("Count: 1")).toBeInTheDocument();
    });

    it("follows same-document entry changes in a transition", async () => {
      const mockNavigation = setupNavigationMock("http://localhost/");
      function Page() {
        return <div>Hash: {useLocation().hash}</div>;
      }

      render(<RouteDisplay routes={[{ path: "/", component: Page }]} />);
      expect(screen.getByText("Hash:")).toBeInTheDocument();

      await act(async () => {
        mockNavigation.navigate("http://localhost/#section");
      });
      expect(screen.getByText("Hash: #section")).toBeInTheDocument();
    });

    it("keeps loader results across a same-URL replace from setState", async () => {
      setupNavigationMock("http://localhost/");
      const loader = vi.fn(() => "loaded");
      function Page({ data, state, setState }: CountProps & { data: string }) {
        return (
          <button onClick={() => void setState({ count: (state?.count ?? 0) + 1 })}>
            {data} {state?.count ?? 0}
          </button>
        );
      }
      const routes = [routeState<CountState>()({ path: "/", loader, component: Page })];

      render(<RouteDisplay routes={routes} />);
      expect(screen.getByText("loaded 0")).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText("loaded 0"));
      });
      expect(screen.getByText("loaded 1")).toBeInTheDocument();
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it("navigates via navigation.navigate from setters", async () => {
      const mockNavigation = setupNavigationMock("http://localhost/");
      const receiveSetSearchParams =
        vi.fn<(setter: ReturnType<typeof useSearchParams>[1]) => void>();
      function Page({ setState }: CountProps) {
        receiveSetSearchParams(useSearchParams()[1]);
        return <button onClick={() => void setState({ count: 1 })}>Set</button>;
      }
      const routes = [routeState<CountState>()({ path: "/", component: Page })];

      render(<RouteDisplay routes={routes} />);

      await act(async () => {
        fireEvent.click(screen.getByText("Set"));
      });
      expect(mockNavigation.navigate).toHaveBeenLastCalledWith("http://localhost/", {
        history: "replace",
        state: { __routeStates: [{ count: 1 }] },
        info: undefined,
      });

      const setSearchParams = receiveSetSearchParams.mock.lastCall![0];
      await act(async () => {
        setSearchParams({ q: "x" }, { replace: false });
      });
      expect(mockNavigation.navigate).toHaveBeenLastCalledWith("/?q=x", {
        history: "push",
        state: undefined,
        info: undefined,
      });
    });
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

      const html = renderToString(<RouteDisplay routes={routes} />);
      expect(html).toContain("Shell");
      expect(html).not.toContain("About");
    });

    it("matches path-based routes with ssr.path", () => {
      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home</div> },
        { path: "/about", component: () => <div>About</div> },
      ];

      const html = renderToString(<RouteDisplay routes={routes} ssr={{ path: "/about" }} />);
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
        renderToString(<RouteDisplay routes={routes} ssr={{ path: "/data" }} />),
      ).not.toContain("loaded");
      expect(
        renderToString(<RouteDisplay routes={routes} ssr={{ path: "/data", runLoaders: true }} />),
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
      container.innerHTML = renderToString(<RouteDisplay routes={routes} />);
      document.body.appendChild(container);
      expect(container.textContent).not.toContain("About");

      const onRecoverableError = vi.fn();
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(container, <RouteDisplay routes={routes} />, {
          onRecoverableError,
        });
      });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.textContent).toContain("About");

      act(() => root!.unmount());
      container.remove();
    });

    it("hydrates with Navigation API and then exposes entry state", async () => {
      const mockNavigation = setupNavigationMock("http://localhost/");
      mockNavigation.currentEntry.__updateState({
        __routeStates: [{ count: 3 }],
      });
      function Page({ state }: CountProps) {
        return <div>Count: {state?.count ?? "none"}</div>;
      }
      const routes = [routeState<CountState>()({ path: "/", component: Page })];
      const ssr = { path: "/" };

      const container = document.createElement("div");
      container.innerHTML = renderToString(<RouteDisplay routes={routes} ssr={ssr} />);
      document.body.appendChild(container);
      expect(container.textContent).toBe("Count: none");

      const onRecoverableError = vi.fn();
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(container, <RouteDisplay routes={routes} ssr={ssr} />, {
          onRecoverableError,
        });
      });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.textContent).toBe("Count: 3");

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
      container.innerHTML = renderToString(<RouteDisplay routes={routes} ssr={ssr} />);
      document.body.appendChild(container);
      // The server renders in a separate process
      clearLoaderCache();
      loader.mockClear();

      const onRecoverableError = vi.fn();
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(container, <RouteDisplay routes={routes} ssr={ssr} />, {
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
