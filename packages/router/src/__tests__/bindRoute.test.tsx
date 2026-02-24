import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "../Router/index.js";
import { Outlet } from "../Outlet.js";
import { route } from "../route.js";
import { bindRoute } from "../bindRoute.js";
import { useRouteParams } from "../hooks/useRouteParams.js";
import { useRouteData } from "../hooks/useRouteData.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";

describe("bindRoute", () => {
  afterEach(() => {
    cleanupNavigationMock();
  });

  it("produces a working route that renders correctly", () => {
    setupNavigationMock("http://localhost/about");

    const aboutRoute = route({ id: "about", path: "/about" });
    const bound = bindRoute(aboutRoute, {
      component: () => <div>About Page</div>,
    });

    render(<Router routes={[bound]} />);
    expect(screen.getByText("About Page")).toBeInTheDocument();
  });

  it("works with loader and provides data to component", () => {
    setupNavigationMock("http://localhost/users/123");

    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      loader: ({ params }) => ({ name: "Alice", id: params.userId }),
    });

    function UserPage({ data }: { data: { name: string; id: string } }) {
      return (
        <div>
          <span data-testid="name">{data.name}</span>
          <span data-testid="id">{data.id}</span>
        </div>
      );
    }

    const bound = bindRoute(userRoute, { component: UserPage });

    render(<Router routes={[bound]} />);
    expect(screen.getByTestId("name").textContent).toBe("Alice");
    expect(screen.getByTestId("id").textContent).toBe("123");
  });

  it("works with children for nested routing", () => {
    setupNavigationMock("http://localhost/admin/settings");

    const adminRoute = route({ id: "admin", path: "/admin" });
    const settingsRoute = route({ id: "settings", path: "settings" });

    const routes = [
      bindRoute(adminRoute, {
        component: Outlet,
        children: [
          bindRoute(settingsRoute, {
            component: () => <div>Settings Page</div>,
          }),
        ],
      }),
    ];

    render(<Router routes={routes} />);
    expect(screen.getByText("Settings Page")).toBeInTheDocument();
  });

  it("hooks work with partial route definitions", () => {
    setupNavigationMock("http://localhost/users/456");

    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      loader: () => ({ name: "Bob" }),
    });

    function UserPage() {
      const params = useRouteParams(userRoute);
      const data = useRouteData(userRoute);
      return (
        <div>
          <span data-testid="userId">{params.userId}</span>
          <span data-testid="name">{data.name}</span>
        </div>
      );
    }

    const bound = bindRoute(userRoute, { component: UserPage });

    render(<Router routes={[bound]} />);
    expect(screen.getByTestId("userId").textContent).toBe("456");
    expect(screen.getByTestId("name").textContent).toBe("Bob");
  });

  it("works with OpaqueRouteDefinition (no id)", () => {
    setupNavigationMock("http://localhost/hello");

    const noIdRoute = route({ path: "/hello" });
    const bound = bindRoute(noIdRoute, {
      component: () => <div>Hello World</div>,
    });

    render(<Router routes={[bound]} />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
