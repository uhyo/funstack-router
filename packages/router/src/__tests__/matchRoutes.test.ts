import { describe, it, expect } from "vitest";
import { matchRoutes } from "../core/matchRoutes.js";
import { internalRoutes, type InternalRouteDefinition } from "../types.js";

describe("matchRoutes", () => {
  describe("basic matching", () => {
    it("matches exact paths", () => {
      const routes = internalRoutes([
        { path: "/", component: () => null },
        { path: "/about", component: () => null },
      ]);

      const result = matchRoutes(routes, "/about");
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBe("/about");
    });

    it("returns null for non-matching paths", () => {
      const routes = internalRoutes([
        { path: "/", component: () => null },
        { path: "/about", component: () => null },
      ]);

      const result = matchRoutes(routes, "/contact");
      expect(result).toBeNull();
    });

    it("matches root path", () => {
      const routes = internalRoutes([{ path: "/", component: () => null }]);

      const result = matchRoutes(routes, "/");
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBe("/");
    });
  });

  describe("path parameters", () => {
    it("extracts single parameter", () => {
      const routes = internalRoutes([
        { path: "/users/:id", component: () => null },
      ]);

      const result = matchRoutes(routes, "/users/123");
      expect(result).toHaveLength(1);
      expect(result![0].params).toEqual({ id: "123" });
    });

    it("extracts multiple parameters", () => {
      const routes = internalRoutes([
        { path: "/users/:userId/posts/:postId", component: () => null },
      ]);

      const result = matchRoutes(routes, "/users/42/posts/99");
      expect(result).toHaveLength(1);
      expect(result![0].params).toEqual({ userId: "42", postId: "99" });
    });
  });

  describe("nested routes", () => {
    it("matches nested routes", () => {
      const routes = internalRoutes([
        {
          path: "/",
          component: () => null,
          children: [
            { path: "", component: () => null },
            { path: "about", component: () => null },
          ],
        },
      ]);

      const result = matchRoutes(routes, "/about");
      expect(result).toHaveLength(2);
      expect(result![0].route.path).toBe("/");
      expect(result![1].route.path).toBe("about");
    });

    it("matches deeply nested routes", () => {
      const routes = internalRoutes([
        {
          path: "/",
          component: () => null,
          children: [
            {
              path: "users",
              component: () => null,
              children: [{ path: ":id", component: () => null }],
            },
          ],
        },
      ]);

      const result = matchRoutes(routes, "/users/123");
      expect(result).toHaveLength(3);
      expect(result![0].route.path).toBe("/");
      expect(result![1].route.path).toBe("users");
      expect(result![2].route.path).toBe(":id");
      expect(result![2].params).toEqual({ id: "123" });
    });

    it("merges params from parent routes", () => {
      const routes = internalRoutes([
        {
          path: "/org/:orgId",
          component: () => null,
          children: [{ path: "users/:userId", component: () => null }],
        },
      ]);

      const result = matchRoutes(routes, "/org/acme/users/123");
      expect(result).toHaveLength(2);
      expect(result![1].params).toEqual({ orgId: "acme", userId: "123" });
    });

    it("matches index route (empty path)", () => {
      const routes = internalRoutes([
        {
          path: "/",
          component: () => null,
          children: [{ path: "", component: () => null }],
        },
      ]);

      const result = matchRoutes(routes, "/");
      expect(result).toHaveLength(2);
      expect(result![0].route.path).toBe("/");
      expect(result![1].route.path).toBe("");
    });
  });

  describe("route priority", () => {
    it("matches first matching route", () => {
      const routes = internalRoutes([
        { path: "/users/new", component: () => null },
        { path: "/users/:id", component: () => null },
      ]);

      const result = matchRoutes(routes, "/users/new");
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBe("/users/new");
    });
  });
});
