import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Router } from "../Router.js";
import { useNavigate } from "../hooks/useNavigate.js";
import { useLocation } from "../hooks/useLocation.js";
import { useSearchParams } from "../hooks/useSearchParams.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import type { RouteDefinition } from "../route.js";

describe("hooks", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    mockNavigation = setupNavigationMock("http://localhost/");
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  describe("useNavigate", () => {
    it("returns a navigate function", () => {
      let navigateFn: ReturnType<typeof useNavigate> | null = null;

      function TestComponent() {
        navigateFn = useNavigate();
        return null;
      }

      const routes: RouteDefinition[] = [
        { path: "/", component: TestComponent },
      ];

      render(<Router routes={routes} />);
      expect(typeof navigateFn).toBe("function");
    });

    it("navigates to a new URL", () => {
      function TestComponent() {
        const navigate = useNavigate();
        return <button onClick={() => navigate("/about")}>Go</button>;
      }

      const routes: RouteDefinition[] = [
        { path: "/", component: TestComponent },
      ];

      render(<Router routes={routes} />);
      screen.getByRole("button").click();

      expect(mockNavigation.navigate).toHaveBeenCalledWith("/about", {
        history: "push",
        state: undefined,
      });
    });

    it("supports replace option", () => {
      function TestComponent() {
        const navigate = useNavigate();
        return (
          <button onClick={() => navigate("/about", { replace: true })}>
            Go
          </button>
        );
      }

      const routes: RouteDefinition[] = [
        { path: "/", component: TestComponent },
      ];

      render(<Router routes={routes} />);
      screen.getByRole("button").click();

      expect(mockNavigation.navigate).toHaveBeenCalledWith("/about", {
        history: "replace",
        state: undefined,
      });
    });

    it("throws when used outside Router", () => {
      function TestComponent() {
        useNavigate();
        return null;
      }

      expect(() => render(<TestComponent />)).toThrow(
        "useNavigate must be used within a Router",
      );
    });
  });

  describe("useLocation", () => {
    it("returns current location", () => {
      mockNavigation = setupNavigationMock(
        "http://localhost/page?foo=bar#section",
      );

      function TestComponent() {
        const location = useLocation();
        return (
          <div>
            <span data-testid="pathname">{location.pathname}</span>
            <span data-testid="search">{location.search}</span>
            <span data-testid="hash">{location.hash}</span>
          </div>
        );
      }

      const routes: RouteDefinition[] = [
        { path: "/page", component: TestComponent },
      ];

      render(<Router routes={routes} />);

      expect(screen.getByTestId("pathname").textContent).toBe("/page");
      expect(screen.getByTestId("search").textContent).toBe("?foo=bar");
      expect(screen.getByTestId("hash").textContent).toBe("#section");
    });

    it("throws when used outside Router", () => {
      function TestComponent() {
        useLocation();
        return null;
      }

      expect(() => render(<TestComponent />)).toThrow(
        "useLocation must be used within a Router",
      );
    });
  });

  describe("useSearchParams", () => {
    it("returns current search params", () => {
      mockNavigation = setupNavigationMock(
        "http://localhost/page?foo=bar&baz=qux",
      );

      function TestComponent() {
        const [searchParams] = useSearchParams();
        return (
          <div>
            <span data-testid="foo">{searchParams.get("foo")}</span>
            <span data-testid="baz">{searchParams.get("baz")}</span>
          </div>
        );
      }

      const routes: RouteDefinition[] = [
        { path: "/page", component: TestComponent },
      ];

      render(<Router routes={routes} />);

      expect(screen.getByTestId("foo").textContent).toBe("bar");
      expect(screen.getByTestId("baz").textContent).toBe("qux");
    });

    it("updates search params with object", () => {
      mockNavigation = setupNavigationMock("http://localhost/page?foo=bar");

      function TestComponent() {
        const [, setSearchParams] = useSearchParams();
        return (
          <button onClick={() => setSearchParams({ newKey: "newValue" })}>
            Update
          </button>
        );
      }

      const routes: RouteDefinition[] = [
        { path: "/page", component: TestComponent },
      ];

      render(<Router routes={routes} />);
      screen.getByRole("button").click();

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        "/page?newKey=newValue",
        { history: "replace", state: undefined },
      );
    });

    it("updates search params with function", () => {
      mockNavigation = setupNavigationMock("http://localhost/page?foo=bar");

      function TestComponent() {
        const [, setSearchParams] = useSearchParams();
        return (
          <button
            onClick={() =>
              setSearchParams((prev) => {
                prev.set("foo", "updated");
                prev.set("new", "param");
                return prev;
              })
            }
          >
            Update
          </button>
        );
      }

      const routes: RouteDefinition[] = [
        { path: "/page", component: TestComponent },
      ];

      render(<Router routes={routes} />);
      screen.getByRole("button").click();

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        "/page?foo=updated&new=param",
        { history: "replace", state: undefined },
      );
    });

    it("throws when used outside Router", () => {
      function TestComponent() {
        useSearchParams();
        return null;
      }

      expect(() => render(<TestComponent />)).toThrow(
        "useSearchParams must be used within a Router",
      );
    });
  });
});
