import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "../Router.js";
import { route, routeState } from "../route.js";
import { useRouteParams } from "../hooks/useRouteParams.js";
import { useRouteState } from "../hooks/useRouteState.js";
import { useRouteData } from "../hooks/useRouteData.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";

describe("useRouteParams", () => {
  beforeEach(() => {
    setupNavigationMock("http://localhost/users/123");
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  it("returns params when route matches", () => {
    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      component: () => null,
    });

    function UserPage() {
      const params = useRouteParams(userRoute);
      return <div data-testid="userId">{params.userId}</div>;
    }

    const routes = [
      route({
        id: "user",
        path: "/users/:userId",
        component: UserPage,
      }),
    ];

    render(<Router routes={routes} />);
    expect(screen.getByTestId("userId").textContent).toBe("123");
  });

  it("throws when used outside Router", () => {
    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      component: () => null,
    });

    function TestComponent() {
      useRouteParams(userRoute);
      return null;
    }

    expect(() => render(<TestComponent />)).toThrow(
      "useRouteParams must be used within a route component",
    );
  });

  it("throws when route ID does not match", () => {
    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      component: () => null,
    });

    const differentRoute = route({
      id: "different",
      path: "/users/:userId",
      component: () => null,
    });

    function UserPage() {
      // Try to use differentRoute when we're actually in userRoute
      useRouteParams(differentRoute);
      return null;
    }

    const routes = [
      route({
        id: "user",
        path: "/users/:userId",
        component: UserPage,
      }),
    ];

    expect(() => render(<Router routes={routes} />)).toThrow(
      'useRouteParams: Route ID mismatch. Expected "different" but current route is "user"',
    );
  });
});

describe("useRouteState", () => {
  beforeEach(() => {
    setupNavigationMock("http://localhost/counter");
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  it("returns state as undefined initially", () => {
    type CounterState = { count: number };
    const counterRoute = routeState<CounterState>()({
      id: "counter",
      path: "/counter",
      component: () => null,
    });

    function CounterPage() {
      const state = useRouteState(counterRoute);
      return <div data-testid="state">{state?.count ?? "undefined"}</div>;
    }

    const routes = [
      routeState<CounterState>()({
        id: "counter",
        path: "/counter",
        component: CounterPage,
      }),
    ];

    render(<Router routes={routes} />);
    expect(screen.getByTestId("state").textContent).toBe("undefined");
  });

  it("throws when used outside Router", () => {
    type CounterState = { count: number };
    const counterRoute = routeState<CounterState>()({
      id: "counter",
      path: "/counter",
      component: () => null,
    });

    function TestComponent() {
      useRouteState(counterRoute);
      return null;
    }

    expect(() => render(<TestComponent />)).toThrow(
      "useRouteState must be used within a route component",
    );
  });

  it("throws when route ID does not match", () => {
    type CounterState = { count: number };
    const counterRoute = routeState<CounterState>()({
      id: "counter",
      path: "/counter",
      component: () => null,
    });

    const differentRoute = routeState<CounterState>()({
      id: "different",
      path: "/counter",
      component: () => null,
    });

    function CounterPage() {
      useRouteState(differentRoute);
      return null;
    }

    const routes = [
      routeState<CounterState>()({
        id: "counter",
        path: "/counter",
        component: CounterPage,
      }),
    ];

    expect(() => render(<Router routes={routes} />)).toThrow(
      'useRouteState: Route ID mismatch. Expected "different" but current route is "counter"',
    );
  });
});

describe("useRouteData", () => {
  beforeEach(() => {
    setupNavigationMock("http://localhost/users/123");
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  it("returns data from loader", () => {
    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      loader: () => ({ name: "John", age: 30 }),
      component: () => null,
    });

    function UserPage() {
      const data = useRouteData(userRoute);
      return (
        <div>
          <span data-testid="name">{data.name}</span>
          <span data-testid="age">{data.age}</span>
        </div>
      );
    }

    const routes = [
      route({
        id: "user",
        path: "/users/:userId",
        loader: () => ({ name: "John", age: 30 }),
        component: UserPage,
      }),
    ];

    render(<Router routes={routes} />);
    expect(screen.getByTestId("name").textContent).toBe("John");
    expect(screen.getByTestId("age").textContent).toBe("30");
  });

  it("throws when used outside Router", () => {
    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      loader: () => ({ name: "John" }),
      component: () => null,
    });

    function TestComponent() {
      useRouteData(userRoute);
      return null;
    }

    expect(() => render(<TestComponent />)).toThrow(
      "useRouteData must be used within a route component",
    );
  });

  it("throws when route ID does not match", () => {
    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      loader: () => ({ name: "John" }),
      component: () => null,
    });

    const differentRoute = route({
      id: "different",
      path: "/users/:userId",
      loader: () => ({ name: "Jane" }),
      component: () => null,
    });

    function UserPage() {
      useRouteData(differentRoute);
      return null;
    }

    const routes = [
      route({
        id: "user",
        path: "/users/:userId",
        loader: () => ({ name: "John" }),
        component: UserPage,
      }),
    ];

    expect(() => render(<Router routes={routes} />)).toThrow(
      'useRouteData: Route ID mismatch. Expected "different" but current route is "user"',
    );
  });
});
