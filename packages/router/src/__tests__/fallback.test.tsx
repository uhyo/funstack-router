import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "../Router.js";
import { Outlet } from "../Outlet.js";
import { useParams } from "../hooks/useParams.js";
import { useLocation } from "../hooks/useLocation.js";
import { useNavigate } from "../hooks/useNavigate.js";
import { route, type RouteDefinition } from "../route.js";

// Helper to set up a static window.location without Navigation API
function setupStaticLocation(url: string) {
  // Ensure Navigation API is not available
  delete (globalThis as Record<string, unknown>).navigation;

  // Set up window.location
  const urlObj = new URL(url);
  Object.defineProperty(window, "location", {
    value: {
      href: url,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
      origin: urlObj.origin,
      host: urlObj.host,
      hostname: urlObj.hostname,
      port: urlObj.port,
      protocol: urlObj.protocol,
    },
    writable: true,
    configurable: true,
  });
}

describe("Fallback Mode", () => {
  beforeEach(() => {
    // Ensure Navigation API is not available for fallback tests
    delete (globalThis as Record<string, unknown>).navigation;
  });

  afterEach(() => {
    // Cleanup
    delete (globalThis as Record<string, unknown>).navigation;
  });

  describe('fallback="none" (default)', () => {
    it("renders nothing when Navigation API is unavailable", () => {
      setupStaticLocation("http://localhost/");

      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home Page</div> },
      ];

      const { container } = render(<Router routes={routes} />);
      expect(container.textContent).toBe("");
    });

    it("renders nothing with explicit fallback='none'", () => {
      setupStaticLocation("http://localhost/");

      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home Page</div> },
      ];

      const { container } = render(<Router routes={routes} fallback="none" />);
      expect(container.textContent).toBe("");
    });
  });

  describe('fallback="static"', () => {
    it("renders matched route component when Navigation API is unavailable", () => {
      setupStaticLocation("http://localhost/");

      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home Page</div> },
      ];

      render(<Router routes={routes} fallback="static" />);
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });

    it("renders nested routes with Outlet", () => {
      setupStaticLocation("http://localhost/about");

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

    it("provides route params via useParams", () => {
      setupStaticLocation("http://localhost/users/123");

      function UserDetail() {
        const { id } = useParams<{ id: string }>();
        return <div>User ID: {id}</div>;
      }

      const routes: RouteDefinition[] = [
        { path: "/users/:id", component: UserDetail },
      ];

      render(<Router routes={routes} fallback="static" />);
      expect(screen.getByText("User ID: 123")).toBeInTheDocument();
    });

    it("provides location via useLocation", () => {
      setupStaticLocation("http://localhost/page?foo=bar#section");

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

    it("renders nothing when no route matches", () => {
      setupStaticLocation("http://localhost/unknown");

      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home Page</div> },
      ];

      const { container } = render(
        <Router routes={routes} fallback="static" />,
      );
      expect(container.textContent).toBe("");
    });

    it("useNavigate returns a function that warns on call", () => {
      setupStaticLocation("http://localhost/");
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      function NavigateTester() {
        const navigate = useNavigate();
        return <button onClick={() => navigate("/about")}>Navigate</button>;
      }

      const routes: RouteDefinition[] = [
        { path: "/", component: NavigateTester },
      ];

      render(<Router routes={routes} fallback="static" />);

      // Click the button to trigger navigate
      screen.getByText("Navigate").click();

      // Should have logged a warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("static fallback mode"),
      );

      consoleWarnSpy.mockRestore();
    });

    it("does not call onNavigate callback in static mode", () => {
      setupStaticLocation("http://localhost/");
      const onNavigate = vi.fn();

      const routes: RouteDefinition[] = [
        { path: "/", component: () => <div>Home</div> },
      ];

      render(
        <Router routes={routes} fallback="static" onNavigate={onNavigate} />,
      );

      // onNavigate should never be called in static mode
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe("data loaders in static mode", () => {
    it("executes sync loader and passes data to component", () => {
      setupStaticLocation("http://localhost/");

      function MessageComponent({ data }: { data: { message: string } }) {
        return <div>{data.message}</div>;
      }

      const routes = [
        route({
          path: "/",
          loader: () => ({ message: "Hello from loader" }),
          component: MessageComponent,
        }),
      ];

      render(<Router routes={routes} fallback="static" />);
      expect(screen.getByText("Hello from loader")).toBeInTheDocument();
    });

    it("executes loader with correct params", () => {
      setupStaticLocation("http://localhost/users/456");
      const loader = vi.fn(() => ({ name: "Test User" }));

      function UserComponent({ data }: { data: { name: string } }) {
        return <div>{data.name}</div>;
      }

      const routes = [
        route({
          path: "/users/:id",
          loader,
          component: UserComponent,
        }),
      ];

      render(<Router routes={routes} fallback="static" />);

      expect(loader).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { id: "456" },
        }),
      );
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });
  });
});
