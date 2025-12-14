import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "../Router.js";
import { Outlet } from "../Outlet.js";
import { useParams } from "../hooks/useParams.js";
import { useLocation } from "../hooks/useLocation.js";
import { useNavigate } from "../hooks/useNavigate.js";
import { cleanupNavigationMock } from "./setup.js";
import { route, type RouteDefinition } from "../route.js";

/**
 * Tests for fallback mode functionality.
 * These tests run WITHOUT the Navigation API to verify static fallback behavior.
 */
describe("Router with fallback='static'", () => {
  beforeEach(() => {
    // Ensure Navigation API is NOT available
    cleanupNavigationMock();

    // Mock window.location
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          href: "http://localhost/",
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  it("renders matched route when fallback='static'", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
    });

    const routes: RouteDefinition[] = [
      { path: "/", component: () => <div>Home Page</div> },
    ];

    render(<Router routes={routes} fallback="static" />);
    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });

  it("renders nothing when fallback='none' and Navigation API unavailable", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
    });

    const routes: RouteDefinition[] = [
      { path: "/", component: () => <div>Home Page</div> },
    ];

    const { container } = render(<Router routes={routes} fallback="none" />);
    expect(container.textContent).toBe("");
  });

  it("renders nothing by default when Navigation API unavailable", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
    });

    const routes: RouteDefinition[] = [
      { path: "/", component: () => <div>Home Page</div> },
    ];

    const { container } = render(<Router routes={routes} />);
    expect(container.textContent).toBe("");
  });

  it("matches route with path parameters in static mode", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/users/456" },
      writable: true,
    });

    function UserDetail() {
      const { id } = useParams<{ id: string }>();
      return <div>User ID: {id}</div>;
    }

    const routes: RouteDefinition[] = [
      { path: "/users/:id", component: UserDetail },
    ];

    render(<Router routes={routes} fallback="static" />);
    expect(screen.getByText("User ID: 456")).toBeInTheDocument();
  });

  it("provides location via useLocation in static mode", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/page?foo=bar#section" },
      writable: true,
    });

    function Page() {
      const location = useLocation();
      return (
        <div>
          <span data-testid="pathname">{location.pathname}</span>
          <span data-testid="search">{location.search}</span>
          <span data-testid="hash">{location.hash}</span>
        </div>
      );
    }

    const routes: RouteDefinition[] = [{ path: "/page", component: Page }];

    render(<Router routes={routes} fallback="static" />);
    expect(screen.getByTestId("pathname").textContent).toBe("/page");
    expect(screen.getByTestId("search").textContent).toBe("?foo=bar");
    expect(screen.getByTestId("hash").textContent).toBe("#section");
  });

  it("renders nested routes with Outlet in static mode", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/about" },
      writable: true,
    });

    function Layout() {
      return (
        <div>
          <header>Header</header>
          <Outlet />
        </div>
      );
    }

    const routes: RouteDefinition[] = [
      {
        path: "/",
        component: Layout,
        children: [
          { path: "", component: () => <div>Home</div> },
          { path: "about", component: () => <div>About</div> },
        ],
      },
    ];

    render(<Router routes={routes} fallback="static" />);
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("useNavigate returns function that warns in static mode", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
    });

    function Home() {
      const navigate = useNavigate();
      return <button onClick={() => navigate("/about")}>Go to About</button>;
    }

    const routes: RouteDefinition[] = [{ path: "/", component: Home }];

    render(<Router routes={routes} fallback="static" />);

    // Click the button
    screen.getByText("Go to About").click();

    // Should warn
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("static fallback mode"),
    );

    consoleSpy.mockRestore();
  });

  it("renders nothing for unmatched routes in static mode", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/unknown" },
      writable: true,
    });

    const routes: RouteDefinition[] = [
      { path: "/", component: () => <div>Home Page</div> },
    ];

    const { container } = render(<Router routes={routes} fallback="static" />);
    expect(container.textContent).toBe("");
  });
});

describe("Router with fallback='static' and data loaders", () => {
  beforeEach(() => {
    cleanupNavigationMock();

    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          href: "http://localhost/",
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  it("executes loaders in static mode", async () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/data" },
      writable: true,
    });

    const loader = vi.fn(() => ({ message: "Loaded data" }));

    function DataPage({ data }: { data: { message: string } }) {
      return <div>{data.message}</div>;
    }

    const routes = [
      route({
        path: "/data",
        component: DataPage,
        loader,
      }),
    ];

    render(<Router routes={routes} fallback="static" />);

    expect(loader).toHaveBeenCalled();
    expect(screen.getByText("Loaded data")).toBeInTheDocument();
  });
});
