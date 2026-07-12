import { describe, it, expect } from "vitest";
import { matchRoutes } from "../core/matchRoutes.js";
import type { InternalRouteDefinition } from "../types.js";
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
      const routes = internalRoutes([{ path: "/users/:id", component: () => null }]);

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

    it("percent-decodes parameter values", () => {
      const routes = internalRoutes([{ path: "/users/:name", component: () => null }]);

      const result = matchRoutes(routes, "/users/Jo%C3%A3o");
      expect(result).toHaveLength(1);
      expect(result![0].params).toEqual({ name: "João" });
    });

    it("percent-decodes spaces and reserved characters", () => {
      const routes = internalRoutes([{ path: "/files/:name", component: () => null }]);

      const result = matchRoutes(routes, "/files/hello%20world%3F");
      expect(result).toHaveLength(1);
      expect(result![0].params).toEqual({ name: "hello world?" });
    });

    it("percent-decodes params inherited from parent routes", () => {
      const routes = internalRoutes([
        {
          path: "/users/:name",
          component: () => null,
          children: [{ path: "/posts/:title", component: () => null }],
        },
      ]);

      const result = matchRoutes(routes, "/users/Jo%C3%A3o/posts/ol%C3%A1");
      expect(result).toHaveLength(2);
      expect(result![1].params).toEqual({ name: "João", title: "olá" });
    });

    it("falls back to the raw value for malformed percent sequences", () => {
      const routes = internalRoutes([{ path: "/users/:name", component: () => null }]);

      const result = matchRoutes(routes, "/users/100%zz");
      expect(result).toHaveLength(1);
      expect(result![0].params).toEqual({ name: "100%zz" });
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
      const routes = internalRoutes([{ path: "/files", component: () => null, exact: false }]);

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
      const routes = internalRoutes([{ path: "/api", component: () => null, exact: false }]);

      expect(matchRoutes(routes, "/api")).toHaveLength(1);
      expect(matchRoutes(routes, "/api/users")).toHaveLength(1);
      expect(matchRoutes(routes, "/api/users/123/posts")).toHaveLength(1);
    });

    it("works with path parameters", () => {
      const routes = internalRoutes([{ path: "/users/:id", component: () => null, exact: false }]);

      const result = matchRoutes(routes, "/users/123/posts/456");
      expect(result).toHaveLength(1);
      expect(result![0].params).toEqual({ id: "123" });
      expect(result![0].pathname).toBe("/users/123");
    });
  });

  describe("URLPattern modifiers in non-exact routes", () => {
    it("matches child under parent with optional param (:section?) present", () => {
      const routes = internalRoutes([
        {
          path: "/docs/:section?",
          component: () => null,
          children: [{ path: "/page/:id", component: () => null }],
        },
      ]);

      const result = matchRoutes(routes, "/docs/intro/page/5");
      expect(result).toHaveLength(2);
      expect(result![0].pathname).toBe("/docs/intro");
      expect(result![0].params).toEqual({ section: "intro" });
      expect(result![1].params).toEqual({ section: "intro", id: "5" });
    });

    it("matches child under parent with optional param (:section?) absent", () => {
      const routes = internalRoutes([
        {
          path: "/docs/:section?",
          component: () => null,
          children: [{ path: "/page/:id", component: () => null }],
        },
      ]);

      const result = matchRoutes(routes, "/docs/page/5");
      expect(result).toHaveLength(2);
      expect(result![0].pathname).toBe("/docs");
      expect(result![0].params).toEqual({});
      expect(result![1].params).toEqual({ id: "5" });
    });

    it("prefers the longest consumed prefix when ambiguous", () => {
      const routes = internalRoutes([
        {
          path: "/docs/:section?",
          component: () => null,
          children: [{ path: "/page/:id", component: () => null }],
        },
      ]);

      // Both section="page" and section absent could lead to a child match;
      // the longer consumed prefix (greedy) wins.
      const result = matchRoutes(routes, "/docs/page/page/5");
      expect(result).toHaveLength(2);
      expect(result![1].params).toEqual({ section: "page", id: "5" });
    });

    it("matches child under parent with repeated param (:path+)", () => {
      const routes = internalRoutes([
        {
          path: "/files/:path+",
          component: () => null,
          children: [{ path: "/meta", component: () => null }],
        },
      ]);

      const result = matchRoutes(routes, "/files/a/b/meta");
      expect(result).toHaveLength(2);
      expect(result![0].pathname).toBe("/files/a/b");
      expect(result![0].params).toEqual({ path: "a/b" });
    });

    it(":path+ parent requires at least one segment before children", () => {
      const routes = internalRoutes([
        {
          path: "/files/:path+",
          component: () => null,
          children: [{ path: "/meta", component: () => null }],
        },
      ]);

      // Consuming just "/files" would leave "/meta" for the child, but
      // :path+ requires at least one segment, so nothing matches.
      expect(matchRoutes(routes, "/files/meta")).toBeNull();
      expect(matchRoutes(routes, "/files")).toBeNull();
    });

    it("matches child under parent with zero-or-more param (:path*)", () => {
      const routes = internalRoutes([
        {
          path: "/files/:path*",
          component: () => null,
          children: [{ path: "/meta", component: () => null }],
        },
      ]);

      const withSegments = matchRoutes(routes, "/files/a/b/meta");
      expect(withSegments).toHaveLength(2);
      expect(withSegments![0].params).toEqual({ path: "a/b" });

      const withoutSegments = matchRoutes(routes, "/files/meta");
      expect(withoutSegments).toHaveLength(2);
      expect(withoutSegments![0].pathname).toBe("/files");
      expect(withoutSegments![0].params).toEqual({});
    });

    it("matches child under parent with group modifier ({/:section}?)", () => {
      const routes = internalRoutes([
        {
          path: "/docs{/:section}?",
          component: () => null,
          children: [{ path: "/page/:id", component: () => null }],
        },
      ]);

      const absent = matchRoutes(routes, "/docs/page/5");
      expect(absent).toHaveLength(2);
      expect(absent![0].pathname).toBe("/docs");
      expect(absent![1].params).toEqual({ id: "5" });

      const present = matchRoutes(routes, "/docs/intro/page/5");
      expect(present).toHaveLength(2);
      expect(present![1].params).toEqual({ section: "intro", id: "5" });
    });

    it("matches child under parent with regex group param", () => {
      const routes = internalRoutes([
        {
          path: "/users/:id(\\d+)",
          component: () => null,
          children: [{ path: "/posts", component: () => null }],
        },
      ]);

      const result = matchRoutes(routes, "/users/123/posts");
      expect(result).toHaveLength(2);
      expect(result![0].params).toEqual({ id: "123" });

      expect(matchRoutes(routes, "/users/abc/posts")).toBeNull();
    });

    it("matches child under parent with wildcard (*)", () => {
      const routes = internalRoutes([
        {
          path: "/files/*",
          component: () => null,
          children: [{ path: "/meta", component: () => null }],
        },
      ]);

      const result = matchRoutes(routes, "/files/a/b/meta");
      expect(result).toHaveLength(2);
      expect(result![0].pathname).toBe("/files/a/b");
      expect(result![1].route.path).toBe("/meta");
    });

    it("non-exact leaf with :path+ consumes greedily", () => {
      const routes = internalRoutes([
        { path: "/files/:path+", component: () => null, exact: false },
      ]);

      const result = matchRoutes(routes, "/files/a/b");
      expect(result).toHaveLength(1);
      expect(result![0].params).toEqual({ path: "a/b" });
      expect(result![0].pathname).toBe("/files/a/b");
    });

    it("optional param parent falls back to requireChildren: false when no child matches", () => {
      const routes = internalRoutes([
        {
          path: "/docs/:section?",
          component: () => null,
          requireChildren: false,
          children: [{ path: "/page/:id", component: () => null }],
        },
      ]);

      const result = matchRoutes(routes, "/docs/intro");
      expect(result).toHaveLength(1);
      expect(result![0].params).toEqual({ section: "intro" });
      expect(result![0].pathname).toBe("/docs/intro");
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

    it("pathless route with loader does NOT match when pathname is null", () => {
      const routes = [
        {
          component: () => null,
          loader: () => "data",
        },
      ] as unknown as InternalRouteDefinition[];

      expect(matchRoutes(routes, null)).toBeNull();
    });

    it("pathless route with loader is skipped, sibling without loader matches", () => {
      const routes = [
        {
          component: () => null,
          loader: () => "data",
        },
        {
          component: () => null, // no loader — valid SSR shell
        },
      ] as unknown as InternalRouteDefinition[];

      const result = matchRoutes(routes, null);
      expect(result).toHaveLength(1);
      expect(result![0].route.loader).toBeUndefined();
    });

    it("nested pathless route with loader stops SSR matching at that level", () => {
      const routes = [
        {
          component: () => null, // outer shell (no loader)
          children: [
            {
              component: () => null,
              loader: () => "data", // has loader — should not match
            },
          ],
        },
      ] as unknown as InternalRouteDefinition[];

      // Outer pathless route matches alone (child with loader is skipped)
      const result = matchRoutes(routes, null);
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBeUndefined();
      expect(result![0].route.loader).toBeUndefined();
    });

    it("pathless route with loader still matches when pathname is non-null", () => {
      const routes = [
        {
          component: () => null,
          loader: () => "data",
          children: [{ path: "/about", component: () => null }],
        },
      ] as unknown as InternalRouteDefinition[];

      const result = matchRoutes(routes, "/about");
      expect(result).toHaveLength(2);
      expect(result![0].route.loader).toBeDefined();
    });
  });

  describe("skipLoaders option", () => {
    it("skips path-based route with loader when skipLoaders is true", () => {
      const routes = [
        {
          path: "/about",
          component: () => null,
          loader: () => "data",
        },
      ] as unknown as InternalRouteDefinition[];

      expect(matchRoutes(routes, "/about", { skipLoaders: true })).toBeNull();
    });

    it("matches path-based route without loader when skipLoaders is true", () => {
      const routes = internalRoutes([{ path: "/about", component: () => null }]);

      const result = matchRoutes(routes, "/about", { skipLoaders: true });
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBe("/about");
    });

    it("skips pathless route with loader when skipLoaders is true", () => {
      const routes = [
        {
          component: () => null,
          loader: () => "data",
        },
      ] as unknown as InternalRouteDefinition[];

      expect(matchRoutes(routes, "/about", { skipLoaders: true })).toBeNull();
    });

    it("skipped route with matching path prevents catch-all from matching", () => {
      const routes = [
        {
          path: "/about",
          component: () => null,
          loader: () => "data",
        },
        {
          path: "/*",
          component: () => null,
        },
      ] as unknown as InternalRouteDefinition[];

      // The /about route would match but is skipped due to loader;
      // this should prevent the catch-all from matching
      const result = matchRoutes(routes, "/about", { skipLoaders: true });
      expect(result).toBeNull();
    });

    it("skips child route with loader, parent renders as shell", () => {
      const routes = [
        {
          path: "/",
          component: () => null,
          children: [
            {
              path: "dashboard",
              component: () => null,
              loader: () => "data",
            },
          ],
        },
      ] as unknown as InternalRouteDefinition[];

      const result = matchRoutes(routes, "/dashboard", { skipLoaders: true });
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBe("/");
    });

    it("pathless wrapper with path-based children skips children with loaders", () => {
      const routes = [
        {
          component: () => null,
          children: [
            {
              path: "/about",
              component: () => null,
              loader: () => "data",
            },
          ],
        },
      ] as unknown as InternalRouteDefinition[];

      // Pathless route matches alone as SSR shell since child with loader is skipped
      const result = matchRoutes(routes, "/about", { skipLoaders: true });
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBeUndefined();
    });

    it("does not affect matching when skipLoaders is false", () => {
      const routes = [
        {
          path: "/about",
          component: () => null,
          loader: () => "data",
        },
      ] as unknown as InternalRouteDefinition[];

      const result = matchRoutes(routes, "/about", { skipLoaders: false });
      expect(result).toHaveLength(1);
    });

    it("extracts params from path-based routes without loaders", () => {
      const routes = internalRoutes([{ path: "/users/:id", component: () => null }]);

      const result = matchRoutes(routes, "/users/42", { skipLoaders: true });
      expect(result).toHaveLength(1);
      expect(result![0].params).toEqual({ id: "42" });
    });

    it("matches nested routes where only leaf has no loader", () => {
      const routes = [
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
      ] as unknown as InternalRouteDefinition[];

      const result = matchRoutes(routes, "/users/42", { skipLoaders: true });
      expect(result).toHaveLength(3);
      expect(result![2].params).toEqual({ id: "42" });
    });

    it("non-matching loader route does not block siblings", () => {
      const routes = [
        {
          path: "/about",
          component: () => null,
          loader: () => "data",
        },
        {
          path: "/*",
          component: () => null,
        },
      ] as unknown as InternalRouteDefinition[];

      // /other does NOT match /about, so the loader route is not skipped (returns null).
      // The catch-all should still match.
      const result = matchRoutes(routes, "/other", { skipLoaders: true });
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBe("/*");
    });

    it("skipped child prevents catch-all sibling, parent renders as shell", () => {
      const routes = [
        {
          component: () => null, // pathless layout
          children: [
            {
              path: "/about",
              component: () => null,
              loader: () => "data",
            },
            {
              component: () => null, // catch-all sibling
            },
          ],
        },
      ] as unknown as InternalRouteDefinition[];

      // /about child would match but is skipped; catch-all sibling should NOT match.
      // Parent pathless layout renders as shell.
      const result = matchRoutes(routes, "/about", { skipLoaders: true });
      expect(result).toHaveLength(1);
      expect(result![0].route.path).toBeUndefined();
      expect(result![0].route.loader).toBeUndefined();
    });

    it("skipped pathless loader route prevents catch-all sibling", () => {
      const routes = [
        {
          component: () => null,
          loader: () => "data",
        },
        {
          component: () => null, // catch-all sibling
        },
      ] as unknown as InternalRouteDefinition[];

      // Pathless route with loader would always match; should be SKIPPED, blocking siblings
      const result = matchRoutes(routes, "/anything", { skipLoaders: true });
      expect(result).toBeNull();
    });
  });
});
