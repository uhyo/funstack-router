import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "../Router/index.js";
import { Outlet } from "../Outlet.js";
import {
  route,
  type RouteComponentProps,
  type RouteComponentPropsWithData,
  type RouteComponentPropsOf,
} from "../route.js";
import { bindRoute } from "../bindRoute.js";
import { useRouteParams } from "../hooks/useRouteParams.js";
import { useRouteData } from "../hooks/useRouteData.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";

describe("route prop", () => {
  afterEach(() => {
    cleanupNavigationMock();
  });

  it("passes the route definition object to the component", () => {
    setupNavigationMock("http://localhost/users/123");

    let receivedRoute: unknown;
    function UserPage(props: RouteComponentProps<{ userId: string }>) {
      receivedRoute = props.route;
      const params = useRouteParams(props.route);
      return <div data-testid="userId">{params.userId}</div>;
    }

    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      component: UserPage,
    });

    render(<Router routes={[userRoute]} />);
    expect(screen.getByTestId("userId").textContent).toBe("123");
    // The prop is the very object the route was defined with
    expect(receivedRoute).toBe(userRoute);
  });

  it("passes the route definition for routes with loader", () => {
    setupNavigationMock("http://localhost/users/123");

    let receivedRoute: unknown;
    function UserPage(props: RouteComponentPropsWithData<{ userId: string }, { name: string }>) {
      receivedRoute = props.route;
      const data = useRouteData(props.route);
      return <div data-testid="name">{data.name}</div>;
    }

    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      loader: () => ({ name: "John" }),
      component: UserPage,
    });

    render(<Router routes={[userRoute]} />);
    expect(screen.getByTestId("name").textContent).toBe("John");
    expect(receivedRoute).toBe(userRoute);
  });

  it("passes the route definition for routes without id, usable with nearest-context hooks", () => {
    setupNavigationMock("http://localhost/users/123");

    let receivedRoute: unknown;
    function UserPage(props: RouteComponentProps<{ userId: string }>) {
      receivedRoute = props.route;
      // Without an id, hooks fall back to the nearest route context
      const params = useRouteParams(props.route);
      return <div data-testid="userId">{params.userId}</div>;
    }

    const userRoute = route({
      path: "/users/:userId",
      component: UserPage,
    });

    render(<Router routes={[userRoute]} />);
    expect(screen.getByTestId("userId").textContent).toBe("123");
    expect(receivedRoute).toBe(userRoute);
  });

  it("passes the bound route definition in the two-phase (bindRoute) flow", () => {
    setupNavigationMock("http://localhost/users/123");

    const partialRoute = route({
      id: "user",
      path: "/users/:userId",
      loader: () => ({ name: "John" }),
    });

    let receivedRoute: unknown;
    function UserPage(props: RouteComponentPropsOf<typeof partialRoute>) {
      receivedRoute = props.route;
      const params = useRouteParams(props.route);
      const data = useRouteData(props.route);
      return (
        <div data-testid="out">
          {data.name}:{params.userId}
        </div>
      );
    }

    const boundRoute = bindRoute(partialRoute, { component: UserPage });

    render(<Router routes={[boundRoute]} />);
    expect(screen.getByTestId("out").textContent).toBe("John:123");
    // The component receives the bound (full) definition, not the partial one
    expect(receivedRoute).toBe(boundRoute);
  });

  it("passes each matched route its own definition in nested routes", () => {
    setupNavigationMock("http://localhost/parent/child");

    let parentReceived: unknown;
    let childReceived: unknown;

    function ParentPage(props: RouteComponentProps<Record<string, never>>) {
      parentReceived = props.route;
      return <Outlet />;
    }
    function ChildPage(props: RouteComponentProps<Record<string, never>>) {
      childReceived = props.route;
      return <div data-testid="child">child</div>;
    }

    const childRoute = route({
      id: "child",
      path: "child",
      component: ChildPage,
    });
    const parentRoute = route({
      id: "parent",
      path: "/parent",
      component: ParentPage,
      children: [childRoute],
    });

    render(<Router routes={[parentRoute]} />);
    expect(screen.getByTestId("child").textContent).toBe("child");
    expect(parentReceived).toBe(parentRoute);
    expect(childReceived).toBe(childRoute);
  });
});
