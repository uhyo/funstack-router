import { describe, it, expect } from "vitest";
import { matchRoutes } from "../core/matchRoutes.js";
import { internalRoutes } from "../types.js";

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
          requireChildren: false,
          children: [{ path: ":id", component: () => null }],
        },
      ]);

      // Children become unreachable when parent has exact: true
      const childResult = matchRoutes(routes, "/users/123");
      expect(childResult).toBeNull();

      // But exact match on parent still works (with requireChildren: false)
      const exactResult = matchRoutes(routes, "/users");
      expect(exactResult).toHaveLength(1);
      expect(exactResult![0].route.path).toBe("/users");
    });

    it("default behavior unchanged when exact not specified", () => {
      const routes = internalRoutes([
        {
          path: "/",
          component: () => null,
          requireChildren: false,
          children: [{ path: "about", component: () => null }],
        },
      ]);

      // Parent matches as prefix (default)
      const result = matchRoutes(routes, "/about");
      expect(result).toHaveLength(2);

      // Leaf requires exact match (default) - child "about" doesn't match "/about/extra"
      // But parent "/" has a component and requireChildren: false, so it's still a valid match (just the parent)
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

  describe("pathless routes", () => {
    it("pathless route always matches any pathname", () => {
      const routes = internalRoutes([{ component: () => null }]);

      expect(matchRoutes(routes, "/")).toHaveLength(1);
      expect(matchRoutes(routes, "/about")).toHaveLength(1);
      expect(matchRoutes(routes, "/users/123/posts")).toHaveLength(1);
    });

    it("pathless route has empty params and empty pathname", () => {
      const routes = internalRoutes([{ component: () => null }]);

      const result = matchRoutes(routes, "/users/123");
      expect(result).toHaveLength(1);
      expect(result![0].params).toEqual({});
      expect(result![0].pathname).toBe("");
    });

    it("pathless route passes full pathname to children", () => {
      const routes = internalRoutes([
        {
          component: () => null,
          children: [{ path: "/users/:id", component: () => null }],
        },
      ]);

      const result = matchRoutes(routes, "/users/123");
      expect(result).toHaveLength(2);
      expect(result![0].params).toEqual({});
      expect(result![0].pathname).toBe("");
      expect(result![1].params).toEqual({ id: "123" });
      expect(result![1].pathname).toBe("/users/123");
    });

    it("pathless layout wrapper between parent and children", () => {
      const routes = internalRoutes([
        {
          path: "/",
          component: () => null,
          children: [
            {
              // Pathless layout wrapper
              component: () => null,
              children: [
                { path: "about", component: () => null },
                { path: "contact", component: () => null },
              ],
            },
          ],
        },
      ]);

      const result = matchRoutes(routes, "/about");
      expect(result).toHaveLength(3);
      expect(result![0].route.path).toBe("/");
      expect(result![1].route.path).toBeUndefined();
      expect(result![2].route.path).toBe("about");
    });

    it("pathless route inherits params from ancestors", () => {
      const routes = internalRoutes([
        {
          path: "/org/:orgId",
          component: () => null,
          children: [
            {
              // Pathless layout
              component: () => null,
              children: [{ path: "users/:userId", component: () => null }],
            },
          ],
        },
      ]);

      const result = matchRoutes(routes, "/org/acme/users/123");
      expect(result).toHaveLength(3);
      // Child should inherit params from parent through pathless route
      expect(result![2].params).toEqual({ orgId: "acme", userId: "123" });
    });

    it("pathless route as catch-all (leaf route)", () => {
      const routes = internalRoutes([
        { path: "/specific", component: () => null },
        { component: () => null }, // Catch-all
      ]);

      expect(matchRoutes(routes, "/specific")).toHaveLength(1);
      expect(matchRoutes(routes, "/specific")![0].route.path).toBe("/specific");

      expect(matchRoutes(routes, "/anything")).toHaveLength(1);
      expect(matchRoutes(routes, "/anything")![0].route.path).toBeUndefined();
    });

    it("pathless route without component requires matching children", () => {
      const routes = internalRoutes([
        {
          // Pathless route without component
          children: [{ path: "/about", component: () => null }],
        },
      ]);

      // Should match when child matches
      expect(matchRoutes(routes, "/about")).toHaveLength(2);

      // Should not match when no child matches
      expect(matchRoutes(routes, "/contact")).toBeNull();
    });

    it("multiple pathless routes in sequence", () => {
      const routes = internalRoutes([
        {
          path: "/",
          component: () => null,
          children: [
            {
              // First pathless wrapper
              component: () => null,
              children: [
                {
                  // Second pathless wrapper
                  component: () => null,
                  children: [{ path: "deep", component: () => null }],
                },
              ],
            },
          ],
        },
      ]);

      const result = matchRoutes(routes, "/deep");
      expect(result).toHaveLength(4);
      expect(result![0].route.path).toBe("/");
      expect(result![1].route.path).toBeUndefined();
      expect(result![2].route.path).toBeUndefined();
      expect(result![3].route.path).toBe("deep");
    });
  });

  describe("requireChildren option", () => {
    it("parent with children does not match when no children match (default)", () => {
      const routes = internalRoutes([
        {
          path: "/dashboard",
          component: () => null,
          children: [{ path: "/main", component: () => null }],
        },
      ]);
      expect(matchRoutes(routes, "/dashboard/sub")).toBeNull();
      expect(matchRoutes(routes, "/dashboard")).toBeNull();
    });

    it("parent with requireChildren: false matches when no children match", () => {
      const routes = internalRoutes([
        {
          path: "/dashboard",
          component: () => null,
          requireChildren: false,
          children: [{ path: "/main", component: () => null }],
        },
      ]);
      expect(matchRoutes(routes, "/dashboard/sub")).toHaveLength(1);
      expect(matchRoutes(routes, "/dashboard")).toHaveLength(1);
    });

    it("catch-all NotFound works with requireChildren: true (default)", () => {
      const routes = internalRoutes([
        {
          path: "/dashboard",
          component: () => null,
          children: [{ path: "/main", component: () => null }],
        },
        { path: "/*", component: () => null }, // NotFound
      ]);
      const result = matchRoutes(routes, "/dashboard/sub");
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBe("/*");
    });

    it("pathless route with children and requireChildren: false matches when no children match", () => {
      const routes = internalRoutes([
        {
          component: () => null,
          requireChildren: false,
          children: [{ path: "/specific", component: () => null }],
        },
      ]);
      // Child matches
      expect(matchRoutes(routes, "/specific")).toHaveLength(2);
      // No child matches, but pathless route has component and requireChildren: false
      expect(matchRoutes(routes, "/other")).toHaveLength(1);
    });

    it("pathless route with children does not match when no children match (default)", () => {
      const routes = internalRoutes([
        {
          component: () => null,
          children: [{ path: "/specific", component: () => null }],
        },
      ]);
      // Child matches
      expect(matchRoutes(routes, "/specific")).toHaveLength(2);
      // No child matches, default requireChildren is true
      expect(matchRoutes(routes, "/other")).toBeNull();
    });

    it("requireChildren: false without component still does not match", () => {
      const routes = internalRoutes([
        {
          path: "/dashboard",
          requireChildren: false,
          children: [{ path: "/main", component: () => null }],
        },
      ]);
      // No component means no match even with requireChildren: false
      expect(matchRoutes(routes, "/dashboard")).toBeNull();
    });
  });

  describe("null pathname", () => {
    it("pathless route matches when pathname is null", () => {
      const routes = internalRoutes([{ component: () => null }]);

      const result = matchRoutes(routes, null);
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBeUndefined();
      expect(result![0].params).toEqual({});
      expect(result![0].pathname).toBe("");
    });

    it("path-based route does NOT match when pathname is null", () => {
      const routes = internalRoutes([
        { path: "/", component: () => null },
        { path: "/about", component: () => null },
      ]);

      expect(matchRoutes(routes, null)).toBeNull();
    });

    it("nested pathless routes all match when pathname is null", () => {
      const routes = internalRoutes([
        {
          component: () => null,
          children: [{ component: () => null }],
        },
      ]);

      const result = matchRoutes(routes, null);
      expect(result).toHaveLength(2);
      expect(result![0].route.path).toBeUndefined();
      expect(result![1].route.path).toBeUndefined();
    });

    it("pathless route with only path-based children matches alone", () => {
      const routes = internalRoutes([
        {
          component: () => null,
          children: [
            { path: "/about", component: () => null },
            { path: "/contact", component: () => null },
          ],
        },
      ]);

      const result = matchRoutes(routes, null);
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBeUndefined();
    });

    it("returns null when no pathless routes exist", () => {
      const routes = internalRoutes([
        { path: "/", component: () => null },
        { path: "/about", component: () => null },
      ]);

      expect(matchRoutes(routes, null)).toBeNull();
    });

    it("pathless route without component and only path-based children does not match", () => {
      const routes = internalRoutes([
        {
          children: [{ path: "/about", component: () => null }],
        },
      ]);

      expect(matchRoutes(routes, null)).toBeNull();
    });
  });
});
