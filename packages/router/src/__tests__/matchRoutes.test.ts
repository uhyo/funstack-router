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

  describe("exact option", () => {
    it("leaf route with exact: false matches as prefix", () => {
      const routes = internalRoutes([
        { path: "/files", component: () => null, exact: false },
      ]);

      // Should match /files/foo/bar as a prefix
      const result = matchRoutes(routes, "/files/foo/bar");
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBe("/files");
      expect(result![0].pathname).toBe("/files");
    });

    it("parent route with exact: true requires exact match", () => {
      const routes = internalRoutes([
        {
          path: "/users",
          component: () => null,
          exact: true,
          children: [{ path: ":id", component: () => null }],
        },
      ]);

      // Children become unreachable when parent has exact: true
      const childResult = matchRoutes(routes, "/users/123");
      expect(childResult).toBeNull();

      // But exact match on parent still works
      const exactResult = matchRoutes(routes, "/users");
      expect(exactResult).toHaveLength(1);
      expect(exactResult![0].route.path).toBe("/users");
    });

    it("default behavior unchanged when exact not specified", () => {
      const routes = internalRoutes([
        {
          path: "/",
          component: () => null,
          children: [{ path: "about", component: () => null }],
        },
      ]);

      // Parent matches as prefix (default)
      const result = matchRoutes(routes, "/about");
      expect(result).toHaveLength(2);

      // Leaf requires exact match (default) - child "about" doesn't match "/about/extra"
      // But parent "/" has a component, so it's still a valid match (just the parent)
      const partialMatch = matchRoutes(routes, "/about/extra");
      expect(partialMatch).toHaveLength(1);
      expect(partialMatch![0].route.path).toBe("/");
    });

    it("returns null when no routes match with default exact behavior", () => {
      // Parent without component - tests that leaf routes require exact match
      const routes = internalRoutes([
        {
          path: "/",
          children: [{ path: "about", component: () => null }],
        },
      ]);

      // Leaf requires exact match (default), parent has no component fallback
      const noMatch = matchRoutes(routes, "/about/extra");
      expect(noMatch).toBeNull();
    });

    it("exact: false enables catch-all behavior", () => {
      const routes = internalRoutes([
        { path: "/api", component: () => null, exact: false },
      ]);

      expect(matchRoutes(routes, "/api")).toHaveLength(1);
      expect(matchRoutes(routes, "/api/users")).toHaveLength(1);
      expect(matchRoutes(routes, "/api/users/123/posts")).toHaveLength(1);
    });

    it("works with path parameters", () => {
      const routes = internalRoutes([
        { path: "/users/:id", component: () => null, exact: false },
      ]);

      const result = matchRoutes(routes, "/users/123/posts/456");
      expect(result).toHaveLength(1);
      expect(result![0].params).toEqual({ id: "123" });
      expect(result![0].pathname).toBe("/users/123");
    });
  });
});
