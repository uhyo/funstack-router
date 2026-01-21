import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "../Router.js";
import { Outlet } from "../Outlet.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { route, routes } from "../route.js";

describe("routes helper function", () => {
  beforeEach(() => {
    setupNavigationMock("http://localhost/");
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  it("creates an array of route definitions", () => {
    const myRoutes = routes([
      { path: "/", component: () => <div>Home Page</div> },
      { path: "/about", component: () => <div>About Page</div> },
    ]);

    expect(myRoutes).toHaveLength(2);
    expect(myRoutes[0].path).toBe("/");
    expect(myRoutes[1].path).toBe("/about");
  });

  it("works with Router component", () => {
    const myRoutes = routes([
      { path: "/", component: () => <div>Home Page</div> },
    ]);

    render(<Router routes={myRoutes} />);
    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });

  it("supports nested routes", () => {
    setupNavigationMock("http://localhost/about");

    function Layout() {
      return (
        <div>
          <header>Header</header>
          <Outlet />
        </div>
      );
    }

    const myRoutes = routes([
      {
        path: "/",
        component: Layout,
        children: [
          { path: "", component: () => <div>Home</div> },
          { path: "about", component: () => <div>About</div> },
        ],
      },
    ]);

    render(<Router routes={myRoutes} />);
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("supports JSX element syntax", () => {
    const myRoutes = routes([{ path: "/", component: <div>JSX Element</div> }]);

    render(<Router routes={myRoutes} />);
    expect(screen.getByText("JSX Element")).toBeInTheDocument();
  });

  it("works with route() helper for type-safe routes with loaders", () => {
    setupNavigationMock("http://localhost/users/123");

    // For full type safety with loaders/params, use route() inside routes()
    const myRoutes = routes([
      route({
        path: "/users/:id",
        loader: ({ params }) => ({ userId: params.id }),
        component: ({ data, params }) => (
          <div>
            User: {data.userId}, Param: {params.id}
          </div>
        ),
      }),
    ]);

    render(<Router routes={myRoutes} />);
    expect(screen.getByText("User: 123, Param: 123")).toBeInTheDocument();
  });

  it("works with route() helper for type-safe route params", () => {
    setupNavigationMock("http://localhost/posts/42");

    // For full type safety with params, use route() inside routes()
    const myRoutes = routes([
      route({
        path: "/posts/:postId",
        component: ({ params }) => <div>Post ID: {params.postId}</div>,
      }),
    ]);

    render(<Router routes={myRoutes} />);
    expect(screen.getByText("Post ID: 42")).toBeInTheDocument();
  });

  it("supports mixing route() and plain objects", () => {
    setupNavigationMock("http://localhost/");

    const myRoutes = routes([
      // Plain object for simple routes
      {
        path: "/",
        component: () => <div>Home</div>,
      },
      // Use route() for routes needing type inference
      route({
        path: "/users/:id",
        component: ({ params }) => <div>User: {params.id}</div>,
      }),
    ]);

    render(<Router routes={myRoutes} />);
    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});
