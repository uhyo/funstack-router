import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { useState } from "react";
import { Router } from "../Router.js";
import { Outlet } from "../Outlet.js";
import { useBlocker } from "../hooks/useBlocker.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import type { RouteDefinition } from "../route.js";

describe("useBlocker", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    mockNavigation = setupNavigationMock("http://localhost/");
  });

  afterEach(() => {
    cleanupNavigationMock();
    cleanup();
  });

  it("throws when used outside Router", () => {
    function TestComponent() {
      useBlocker(() => true);
      return null;
    }

    expect(() => render(<TestComponent />)).toThrow(
      "useBlocker must be used within a Router",
    );
  });

  it("does not block navigation when shouldBlock returns false", () => {
    function TestComponent() {
      useBlocker(() => false);
      return <div>Home</div>;
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: TestComponent },
      { path: "/about", component: () => <div>About</div> },
    ];

    render(<Router routes={routes} />);
    expect(screen.getByText("Home")).toBeInTheDocument();

    // Simulate navigation with event
    const { event, proceed } =
      mockNavigation.__simulateNavigationWithEvent("/about");

    // Navigation should not be prevented
    expect(event.defaultPrevented).toBe(false);
    proceed();
  });

  it("blocks navigation when shouldBlock returns true", () => {
    function TestComponent() {
      useBlocker(() => true);
      return <div>Home</div>;
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: TestComponent },
      { path: "/about", component: () => <div>About</div> },
    ];

    render(<Router routes={routes} />);
    expect(screen.getByText("Home")).toBeInTheDocument();

    // Simulate navigation with event
    const { event } = mockNavigation.__simulateNavigationWithEvent("/about");

    // Navigation should be prevented
    expect(event.defaultPrevented).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("blocks navigation based on dynamic condition", async () => {
    function TestComponent() {
      const [isDirty, setIsDirty] = useState(false);
      useBlocker(() => isDirty);
      return (
        <div>
          <div>Home</div>
          <button onClick={() => setIsDirty(true)}>Make Dirty</button>
        </div>
      );
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: TestComponent },
      { path: "/about", component: () => <div>About</div> },
    ];

    render(<Router routes={routes} />);
    expect(screen.getByText("Home")).toBeInTheDocument();

    // Navigation should not be blocked when not dirty
    const { event: event1 } =
      mockNavigation.__simulateNavigationWithEvent("/about");
    expect(event1.defaultPrevented).toBe(false);

    // Make form dirty - wrap in act to ensure state update and re-render complete
    await act(async () => {
      screen.getByRole("button").click();
    });

    // Navigation should now be blocked
    const { event: event2 } =
      mockNavigation.__simulateNavigationWithEvent("/other");
    expect(event2.defaultPrevented).toBe(true);
  });

  it("supports multiple blockers - any true blocks navigation", () => {
    function Blocker1() {
      useBlocker(() => false);
      return null;
    }

    function Blocker2() {
      useBlocker(() => true);
      return null;
    }

    function TestComponent() {
      return (
        <div>
          <Blocker1 />
          <Blocker2 />
          <div>Home</div>
        </div>
      );
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: TestComponent },
      { path: "/about", component: () => <div>About</div> },
    ];

    render(<Router routes={routes} />);

    // Navigation should be blocked because Blocker2 returns true
    const { event } = mockNavigation.__simulateNavigationWithEvent("/about");
    expect(event.defaultPrevented).toBe(true);
  });

  it("supports multiple blockers - all false allows navigation", () => {
    function Blocker1() {
      useBlocker(() => false);
      return null;
    }

    function Blocker2() {
      useBlocker(() => false);
      return null;
    }

    function TestComponent() {
      return (
        <div>
          <Blocker1 />
          <Blocker2 />
          <div>Home</div>
        </div>
      );
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: TestComponent },
      { path: "/about", component: () => <div>About</div> },
    ];

    render(<Router routes={routes} />);

    // Navigation should not be blocked because both blockers return false
    const { event } = mockNavigation.__simulateNavigationWithEvent("/about");
    expect(event.defaultPrevented).toBe(false);
  });

  it("cleans up blocker on unmount", () => {
    function BlockerComponent({ block }: { block: boolean }) {
      useBlocker(() => block);
      return <div>Blocker</div>;
    }

    function TestComponent({ showBlocker }: { showBlocker: boolean }) {
      return (
        <div>
          {showBlocker && <BlockerComponent block={true} />}
          <div>Home</div>
        </div>
      );
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: () => <TestComponent showBlocker={true} /> },
      { path: "/about", component: () => <div>About</div> },
    ];

    const { rerender } = render(<Router routes={routes} />);

    // Navigation should be blocked initially
    const { event: event1 } =
      mockNavigation.__simulateNavigationWithEvent("/about");
    expect(event1.defaultPrevented).toBe(true);

    // Rerender without blocker component
    const routesWithoutBlocker: RouteDefinition[] = [
      { path: "/", component: () => <TestComponent showBlocker={false} /> },
      { path: "/about", component: () => <div>About</div> },
    ];
    rerender(<Router routes={routesWithoutBlocker} />);

    // Navigation should now be allowed
    const { event: event2 } =
      mockNavigation.__simulateNavigationWithEvent("/other");
    expect(event2.defaultPrevented).toBe(false);
  });

  it("calls shouldBlock function on navigation", () => {
    const shouldBlock = vi.fn(() => false);

    function TestComponent() {
      useBlocker(shouldBlock);
      return <div>Home</div>;
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: TestComponent },
      { path: "/about", component: () => <div>About</div> },
    ];

    render(<Router routes={routes} />);

    // Initially not called
    expect(shouldBlock).not.toHaveBeenCalled();

    // Navigation triggers the blocker check
    mockNavigation.__simulateNavigationWithEvent("/about");
    expect(shouldBlock).toHaveBeenCalled();
  });

  it("works with nested routes", () => {
    // Clean up and set up a new mock at the child route before rendering
    cleanupNavigationMock();
    mockNavigation = setupNavigationMock("http://localhost/parent/child");

    function Parent() {
      useBlocker(() => false);
      return (
        <div>
          <div>Parent</div>
          <Outlet />
        </div>
      );
    }

    function Child() {
      useBlocker(() => true);
      return <div>Child</div>;
    }

    const routes: RouteDefinition[] = [
      {
        path: "/parent",
        component: Parent,
        children: [{ path: "/child", component: Child }],
      },
      { path: "/other", component: () => <div>Other</div> },
    ];

    render(<Router routes={routes} />);

    // Verify both parent and child are rendered
    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.getByText("Child")).toBeInTheDocument();

    // Navigation should be blocked because child blocker returns true
    const { event } = mockNavigation.__simulateNavigationWithEvent("/other");
    expect(event.defaultPrevented).toBe(true);
  });

  it("blockers are checked before onNavigate callback", () => {
    const callOrder: string[] = [];

    function TestComponent() {
      useBlocker(() => {
        callOrder.push("blocker");
        return true;
      });
      return <div>Home</div>;
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: TestComponent },
      { path: "/about", component: () => <div>About</div> },
    ];

    const onNavigate = vi.fn(() => {
      callOrder.push("onNavigate");
    });

    render(<Router routes={routes} onNavigate={onNavigate} />);

    mockNavigation.__simulateNavigationWithEvent("/about");

    // Blocker is called first, onNavigate is not called because navigation is prevented
    expect(callOrder).toEqual(["blocker"]);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("allows onNavigate to be called when blocker allows navigation", () => {
    function TestComponent() {
      useBlocker(() => false);
      return <div>Home</div>;
    }

    const routes: RouteDefinition[] = [
      { path: "/", component: TestComponent },
      { path: "/about", component: () => <div>About</div> },
    ];

    const onNavigate = vi.fn();

    render(<Router routes={routes} onNavigate={onNavigate} />);

    mockNavigation.__simulateNavigationWithEvent("/about");

    // Both blocker and onNavigate are called
    expect(onNavigate).toHaveBeenCalled();
  });
});
