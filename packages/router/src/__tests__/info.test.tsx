import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Router } from "../Router.js";
import { route, type RouteComponentProps } from "../route.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { clearLoaderCache } from "../core/loaderCache.js";

describe("Navigation Info", () => {
  beforeEach(() => {
    setupNavigationMock("http://localhost/");
    clearLoaderCache();
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  describe("info prop", () => {
    it("receives undefined info on initial load", () => {
      function Page({ info }: RouteComponentProps<Record<string, never>>) {
        return <div>Info: {info === undefined ? "undefined" : "defined"}</div>;
      }

      const routes = [
        route({
          path: "/",
          component: Page,
        }),
      ];

      render(<Router routes={routes} />);
      expect(screen.getByText("Info: undefined")).toBeInTheDocument();
    });

    it("receives info from navigation event", () => {
      function Page({ info }: RouteComponentProps<Record<string, never>>) {
        const infoData = info as { source: string } | undefined;
        return <div>Source: {infoData?.source ?? "none"}</div>;
      }

      const routes = [
        route({
          path: "/",
          component: Page,
        }),
        route({
          path: "/other",
          component: Page,
        }),
      ];

      cleanupNavigationMock();
      const mockNav = setupNavigationMock("http://localhost/");

      render(<Router routes={routes} />);
      expect(screen.getByText("Source: none")).toBeInTheDocument();

      // Navigate with info
      act(() => {
        const { proceed } = mockNav.__simulateNavigationWithEvent("/other", {
          info: { source: "home" },
        });
        proceed();
      });

      expect(screen.getByText("Source: home")).toBeInTheDocument();
    });

    it("info resets to undefined on navigation without info", () => {
      function Page({ info, params }: RouteComponentProps<{ page?: string }>) {
        const infoData = info as { source: string } | undefined;
        return (
          <div>
            <span data-testid="page">Page: {params.page ?? "home"}</span>
            <span data-testid="source">
              Source: {infoData?.source ?? "none"}
            </span>
          </div>
        );
      }

      const routes = [
        route({
          path: "/",
          component: Page,
        }),
        route({
          path: "/:page",
          component: Page,
        }),
      ];

      cleanupNavigationMock();
      const mockNav = setupNavigationMock("http://localhost/");

      render(<Router routes={routes} />);

      // Navigate with info
      act(() => {
        const { proceed } = mockNav.__simulateNavigationWithEvent("/page1", {
          info: { source: "home" },
        });
        proceed();
      });
      expect(screen.getByTestId("source")).toHaveTextContent("Source: home");

      // Navigate without info
      act(() => {
        const { proceed } = mockNav.__simulateNavigationWithEvent("/page2");
        proceed();
      });
      expect(screen.getByTestId("page")).toHaveTextContent("Page: page2");
      expect(screen.getByTestId("source")).toHaveTextContent("Source: none");
    });

    it("info is not persisted across back/forward navigation", () => {
      function Page({ info, params }: RouteComponentProps<{ page?: string }>) {
        const infoData = info as { source: string } | undefined;
        return (
          <div>
            <span data-testid="page">Page: {params.page ?? "home"}</span>
            <span data-testid="source">
              Source: {infoData?.source ?? "none"}
            </span>
          </div>
        );
      }

      const routes = [
        route({
          path: "/",
          component: Page,
        }),
        route({
          path: "/:page",
          component: Page,
        }),
      ];

      cleanupNavigationMock();
      const mockNav = setupNavigationMock("http://localhost/");

      render(<Router routes={routes} />);

      // Navigate to page1 with info
      act(() => {
        const { proceed } = mockNav.__simulateNavigationWithEvent("/page1", {
          info: { source: "home" },
        });
        proceed();
      });
      expect(screen.getByTestId("source")).toHaveTextContent("Source: home");

      // Navigate to page2 without info
      act(() => {
        const { proceed } = mockNav.__simulateNavigationWithEvent("/page2");
        proceed();
      });
      expect(screen.getByTestId("page")).toHaveTextContent("Page: page2");

      // Go back to page1 - info should NOT be preserved (it's ephemeral)
      act(() => {
        mockNav.__simulateTraversal(1);
      });
      expect(screen.getByTestId("page")).toHaveTextContent("Page: page1");
      // Info is undefined because traversal doesn't carry the original info
      expect(screen.getByTestId("source")).toHaveTextContent("Source: none");
    });
  });

  describe("navigate function with info", () => {
    it("passes info option to Navigation API", () => {
      cleanupNavigationMock();
      const mockNav = setupNavigationMock("http://localhost/");

      function Page() {
        return <div>Page</div>;
      }

      const routes = [
        route({
          path: "/",
          component: Page,
        }),
      ];

      render(<Router routes={routes} />);

      // Call navigate with info
      act(() => {
        navigation.navigate("/other", { info: { test: "value" } });
      });

      // Verify info was passed to the Navigation API
      expect(mockNav.navigate).toHaveBeenCalledWith(
        "/other",
        expect.objectContaining({ info: { test: "value" } }),
      );
    });
  });

  describe("info with loader", () => {
    it("route with loader also receives info", () => {
      function Page({
        data,
        info,
      }: {
        data: { message: string };
        params: Record<string, never>;
        info: unknown;
      }) {
        const infoData = info as { referrer: string } | undefined;
        return (
          <div>
            <span data-testid="data">{data.message}</span>
            <span data-testid="referrer">
              Referrer: {infoData?.referrer ?? "none"}
            </span>
          </div>
        );
      }

      const routes = [
        route({
          path: "/",
          component: Page,
          loader: () => ({ message: "Hello" }),
        }),
        route({
          path: "/other",
          component: Page,
          loader: () => ({ message: "Other" }),
        }),
      ];

      cleanupNavigationMock();
      const mockNav = setupNavigationMock("http://localhost/");

      render(<Router routes={routes} />);
      expect(screen.getByTestId("data")).toHaveTextContent("Hello");
      expect(screen.getByTestId("referrer")).toHaveTextContent(
        "Referrer: none",
      );

      // Navigate with info
      act(() => {
        const { proceed } = mockNav.__simulateNavigationWithEvent("/other", {
          info: { referrer: "home-page" },
        });
        proceed();
      });

      expect(screen.getByTestId("data")).toHaveTextContent("Other");
      expect(screen.getByTestId("referrer")).toHaveTextContent(
        "Referrer: home-page",
      );
    });
  });
});
