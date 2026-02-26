import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Suspense, type ReactNode } from "react";
import { Router } from "../Router/index.js";
import { useLocation } from "../hooks/useLocation.js";
import { useSearchParams } from "../hooks/useSearchParams.js";
import { useIsPending } from "../hooks/useIsPending.js";
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

  describe("useIsPending", () => {
    it("returns false when no transition is pending", () => {
      let pending: boolean | null = null;

      function TestComponent() {
        pending = useIsPending();
        return null;
      }

      const routes: RouteDefinition[] = [
        { path: "/", component: TestComponent },
      ];

      render(<Router routes={routes} />);
      expect(pending).toBe(false);
    });

    it("returns true when a navigation transition is pending due to a suspending route", async () => {
      // A component that never resolves — it throws a promise that stays pending forever
      const neverResolvingPromise = new Promise<void>(() => {});
      function SlowComponent(): ReactNode {
        throw neverResolvingPromise;
      }

      // Track isPending values observed by the home route component
      let capturedIsPending: boolean | null = null;

      function HomeComponent() {
        const isPending = useIsPending();
        capturedIsPending = isPending;
        return (
          <div data-testid="home">Home (isPending: {String(isPending)})</div>
        );
      }

      const routes: RouteDefinition[] = [
        { path: "/", component: HomeComponent },
        { path: "/slow", component: SlowComponent },
      ];

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <Router routes={routes} />
        </Suspense>,
      );

      // Initially, isPending should be false and home should be visible
      expect(capturedIsPending).toBe(false);
      expect(screen.getByTestId("home").textContent).toBe(
        "Home (isPending: false)",
      );

      // Navigate to /slow — the new route will suspend, so React keeps the old UI
      // and isPending becomes true via useTransition
      await act(async () => {
        mockNavigation.__simulateNavigation("http://localhost/slow");
      });

      // After the transition starts, the home component should still be visible
      // (because /slow suspends), and isPending should be true
      expect(capturedIsPending).toBe(true);
      expect(screen.getByTestId("home").textContent).toBe(
        "Home (isPending: true)",
      );
    });

    it("throws when used outside Router", () => {
      function TestComponent() {
        useIsPending();
        return null;
      }

      expect(() => render(<TestComponent />)).toThrow(
        "useIsPending must be used within a Router",
      );
    });
  });
});
