import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Router } from "../Router.js";
import { Outlet } from "../Outlet.js";
import { useLocation } from "../hooks/useLocation.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { route, type RouteDefinition } from "../route.js";

describe("Router", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    mockNavigation = setupNavigationMock("http://localhost/");
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  it("renders matched route component", () => {
    const routes: RouteDefinition[] = [
      { path: "/", component: () => <div>Home Page</div> },
    ];

    render(<Router routes={routes} />);
    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });

  it("renders nothing when no route matches", () => {
    mockNavigation = setupNavigationMock("http://localhost/unknown");

    const routes: RouteDefinition[] = [
      { path: "/", component: () => <div>Home Page</div> },
    ];

    const { container } = render(<Router routes={routes} />);
    expect(container.textContent).toBe("");
  });

  it("renders nested routes with Outlet", () => {
    mockNavigation = setupNavigationMock("http://localhost/about");

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

    render(<Router routes={routes} />);
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("provides route params via props", () => {
    mockNavigation = setupNavigationMock("http://localhost/users/123");

    const routes = [
      route({
        path: "/users/:id",
        component: ({ params }) => <div>User ID: {params.id}</div>,
      }),
    ];

    render(<Router routes={routes} />);
    expect(screen.getByText("User ID: 123")).toBeInTheDocument();
  });

  it("provides location via useLocation", () => {
    mockNavigation = setupNavigationMock(
      "http://localhost/page?foo=bar#section",
    );

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

    render(<Router routes={routes} />);
    expect(screen.getByTestId("pathname").textContent).toBe("/page");
    expect(screen.getByTestId("search").textContent).toBe("?foo=bar");
    expect(screen.getByTestId("hash").textContent).toBe("#section");
  });

  it("updates when navigation changes", async () => {
    function Home() {
      return <div>Home</div>;
    }

    function About() {
      return <div>About</div>;
    }

    const routes: RouteDefinition[] = [
      {
        path: "/",
        component: () => <Outlet />,
        children: [
          { path: "", component: Home },
          { path: "about", component: About },
        ],
      },
    ];

    render(<Router routes={routes} />);
    expect(screen.getByText("Home")).toBeInTheDocument();

    // Simulate navigation
    act(() => {
      mockNavigation.__simulateNavigation("http://localhost/about");
    });

    expect(screen.getByText("About")).toBeInTheDocument();
  });

  describe("onNavigate callback", () => {
    it("calls onNavigate with NavigateEvent and matched routes before navigation", () => {
      const onNavigate = vi.fn();

      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home</div> },
        { path: "/about", component: () => <div>About</div> },
      ];

      render(<Router routes={routes} onNavigate={onNavigate} />);

      act(() => {
        const { proceed } = mockNavigation.__simulateNavigationWithEvent(
          "http://localhost/about",
        );
        proceed();
      });

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.objectContaining({
            url: "http://localhost/about",
          }),
        }),
        expect.arrayContaining([
          expect.objectContaining({
            pathname: "/about",
          }),
        ]),
      );
    });

    it("prevents navigation when onNavigate calls event.preventDefault()", () => {
      const onNavigate = vi.fn((event: NavigateEvent) => {
        event.preventDefault();
      });

      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home</div> },
        { path: "/about", component: () => <div>About</div> },
      ];

      render(<Router routes={routes} onNavigate={onNavigate} />);

      act(() => {
        const { proceed } = mockNavigation.__simulateNavigationWithEvent(
          "http://localhost/about",
        );
        proceed();
      });

      // Should still show Home because navigation was prevented
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.queryByText("About")).not.toBeInTheDocument();
    });

    it("allows navigation when onNavigate does not call preventDefault()", () => {
      const onNavigate = vi.fn(); // Does not call preventDefault

      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home</div> },
        { path: "/about", component: () => <div>About</div> },
      ];

      render(<Router routes={routes} onNavigate={onNavigate} />);

      act(() => {
        const { proceed } = mockNavigation.__simulateNavigationWithEvent(
          "http://localhost/about",
        );
        proceed();
      });

      expect(screen.getByText("About")).toBeInTheDocument();
    });

    it("calls onNavigate with null for unmatched routes", () => {
      const onNavigate = vi.fn();

      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home</div> },
      ];

      render(<Router routes={routes} onNavigate={onNavigate} />);

      act(() => {
        const { proceed } = mockNavigation.__simulateNavigationWithEvent(
          "http://localhost/unknown",
        );
        proceed();
      });

      // onNavigate should be called with null for unmatched routes
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.objectContaining({
            url: "http://localhost/unknown",
          }),
        }),
        null,
      );
    });
  });
});
