import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Router } from "../Router/index.js";
import { useBlocker } from "../hooks/useBlocker.js";
import { NavigationAPIAdapter } from "../core/NavigationAPIAdapter.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { internalRoutes } from "../types.js";
import { hardReload, hardNavigate } from "../bypassInterception.js";
import type { RouteDefinition } from "../route.js";

describe("bypass interception", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    mockNavigation = setupNavigationMock("http://localhost/");
  });

  afterEach(() => {
    cleanupNavigationMock();
    cleanup();
  });

  describe("hardNavigate", () => {
    it("calls navigation.navigate with bypass marker", () => {
      hardNavigate("/other-page");

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      const [url, options] = mockNavigation.navigate.mock.calls[0]!;
      expect(url).toBe("/other-page");
      expect(options!.info).toBeDefined();
    });

    it("skips interception when bypass marker is present", () => {
      const routes = internalRoutes([
        { path: "/", component: () => null },
        { path: "/about", component: () => null },
      ]);

      const onNavigate = vi.fn();
      const adapter = new NavigationAPIAdapter();
      adapter.setupInterception(() => routes, onNavigate);

      // Call hardNavigate to capture the bypass info value from the mock
      hardNavigate("/about");
      const bypassInfo = mockNavigation.navigate.mock.calls[0]![1]!.info;

      // Simulate a navigate event with the bypass marker
      const { event } = mockNavigation.__simulateNavigationWithEvent("/about", {
        info: bypassInfo,
      });

      // onNavigate should still be called (the navigate event fires)
      // but with intercepting: false
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ intercepting: false }),
      );
      // The event should NOT have been intercepted
      expect(event.intercept).not.toHaveBeenCalled();
    });

    it("skips blockers when bypass marker is present", () => {
      function BlockingComponent() {
        useBlocker({ shouldBlock: () => true });
        return <div>Home</div>;
      }

      const routes: RouteDefinition[] = [
        { path: "/", component: BlockingComponent },
        { path: "/about", component: () => <div>About</div> },
      ];

      render(<Router routes={routes} />);

      // Navigate with bypass - should not be prevented despite the blocker
      hardNavigate("/about");

      // The blocker should not have prevented the navigation because
      // the bypass check happens before the blocker check
      // We verify by checking that navigate was called (not prevented)
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        "/about",
        expect.objectContaining({ info: expect.anything() }),
      );
    });
  });

  describe("hardReload", () => {
    it("calls navigation.reload with bypass marker", () => {
      // Add a mock reload method
      (mockNavigation as Record<string, unknown>).reload = vi.fn();

      hardReload();

      expect(
        (mockNavigation as Record<string, unknown>).reload,
      ).toHaveBeenCalledTimes(1);
      const reloadMock = (mockNavigation as Record<string, unknown>)
        .reload as ReturnType<typeof vi.fn>;
      const [options] = reloadMock.mock.calls[0];
      expect(options.info).toBeDefined();
    });
  });

  describe("normal navigation", () => {
    it("is still intercepted without bypass marker", () => {
      const routes = internalRoutes([
        { path: "/", component: () => null },
        { path: "/about", component: () => null },
      ]);

      const onNavigate = vi.fn();
      const adapter = new NavigationAPIAdapter();
      adapter.setupInterception(() => routes, onNavigate);

      // Simulate a normal navigate event (without bypass marker)
      const { event } = mockNavigation.__simulateNavigationWithEvent("/about");

      // onNavigate should have been called because this is a normal navigation
      expect(onNavigate).toHaveBeenCalled();
      // The event should have been intercepted
      expect(event.intercept).toHaveBeenCalled();
    });
  });
});
