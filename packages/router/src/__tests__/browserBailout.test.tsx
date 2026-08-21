import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Suspense } from "react";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import { Router } from "../Router/index.js";
import { Outlet } from "../Outlet.js";
import { route, type RouteDefinition } from "../route.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";

// Simulate a React build that supports the browser() API (React Canary).
// The mocked browser() returns a never-resolving thenable so that use()
// suspends during server rendering, leaving the nearest <Suspense> fallback
// in place — approximating the canary behavior of use(browser()).
const { browserMock } = vi.hoisted(() => {
  return {
    browserMock: vi.fn((_reason?: unknown): PromiseLike<undefined> => ({
      then() {
        return this as PromiseLike<never>;
      },
    })),
  };
});

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return { ...actual, browser: browserMock };
});

function makeRoutes(): RouteDefinition[] {
  return [
    route({
      // Pathless root route: acts as the app shell during pathless SSR.
      component: () => (
        <div>
          <span>shell</span>
          <Suspense fallback={<span>suspense-fallback</span>}>
            <Outlet />
          </Suspense>
        </div>
      ),
      children: [route({ path: "/", component: () => <span>home</span> })],
    }),
  ];
}

describe("pathlessSSROutletDeferral (browser() supported)", () => {
  beforeEach(() => {
    browserMock.mockClear();
  });

  describe("pathless SSR", () => {
    it("defers unmatched outlet content to the nearest Suspense boundary", () => {
      const html = renderToString(
        <Router routes={makeRoutes()} features={{ pathlessSSROutletDeferral: true }} />,
      );

      expect(html).toContain("shell");
      expect(html).toContain("suspense-fallback");
      expect(html).not.toContain("<span>home</span>");
      expect(browserMock).toHaveBeenCalledWith("Route not matched during pathless SSR");
    });

    it("renders unmatched outlets as null when not opted in", () => {
      const html = renderToString(<Router routes={makeRoutes()} />);

      expect(html).toContain("shell");
      expect(html).not.toContain("suspense-fallback");
      expect(html).not.toContain("home");
      expect(browserMock).not.toHaveBeenCalled();
    });

    it("does not bail out when a pathless child route matches", () => {
      const routes = [
        route({
          component: () => (
            <div>
              <span>shell</span>
              <Suspense fallback={<span>suspense-fallback</span>}>
                <Outlet />
              </Suspense>
            </div>
          ),
          // Pathless child: matches even during pathless SSR.
          children: [route({ component: () => <span>pathless-child</span> })],
        }),
      ];

      const html = renderToString(
        <Router routes={routes} features={{ pathlessSSROutletDeferral: true }} />,
      );

      expect(html).toContain("pathless-child");
      expect(html).not.toContain("suspense-fallback");
      expect(browserMock).not.toHaveBeenCalled();
    });
  });

  describe("SSR with ssr.path", () => {
    it("does not bail out because the URL is available", () => {
      const html = renderToString(
        <Router
          routes={makeRoutes()}
          ssr={{ path: "/" }}
          features={{ pathlessSSROutletDeferral: true }}
        />,
      );

      expect(html).toContain("home");
      expect(html).not.toContain("suspense-fallback");
      expect(browserMock).not.toHaveBeenCalled();
    });
  });

  describe("client-side rendering", () => {
    beforeEach(() => {
      setupNavigationMock("http://localhost/");
    });

    afterEach(() => {
      cleanupNavigationMock();
    });

    it("does not bail out because the URL is available", () => {
      render(<Router routes={makeRoutes()} features={{ pathlessSSROutletDeferral: true }} />);

      expect(screen.getByText("home")).toBeInTheDocument();
      expect(browserMock).not.toHaveBeenCalled();
    });
  });
});
