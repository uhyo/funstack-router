import { describe, expectTypeOf, it } from "vitest";
import { route, routeState } from "../route.js";
import type {
  TypefulOpaqueRouteDefinition,
  OpaqueRouteDefinition,
} from "../route.js";

describe("route() type inference", () => {
  it("returns OpaqueRouteDefinition when id is not provided", () => {
    const r = route({ path: "/", component: () => null });
    expectTypeOf(r).toEqualTypeOf<OpaqueRouteDefinition>();
  });

  it("returns TypefulOpaqueRouteDefinition when id is provided", () => {
    const r = route({ id: "home", path: "/", component: () => null });
    expectTypeOf(r).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<
        "home",
        Record<string, never>,
        undefined,
        undefined
      >
    >();
  });

  it("infers params from path pattern", () => {
    const r = route({
      id: "user",
      path: "/users/:userId",
      component: () => null,
    });
    expectTypeOf(r).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<
        "user",
        { userId: string },
        undefined,
        undefined
      >
    >();
  });

  it("infers data type from loader", () => {
    const r = route({
      id: "user",
      path: "/users/:userId",
      loader: () => ({ name: "John" }),
      component: () => null,
    });
    expectTypeOf(r).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<
        "user",
        { userId: string },
        undefined,
        { name: string }
      >
    >();
  });
});

describe("routeState() type inference", () => {
  it("returns TypefulOpaqueRouteDefinition with state type when id is provided", () => {
    type MyState = { count: number };
    const r = routeState<MyState>()({
      id: "counter",
      path: "/counter",
      component: () => null,
    });
    expectTypeOf(r).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<
        "counter",
        Record<string, never>,
        MyState,
        undefined
      >
    >();
  });

  it("returns OpaqueRouteDefinition when id is not provided", () => {
    type MyState = { count: number };
    const r = routeState<MyState>()({
      path: "/counter",
      component: () => null,
    });
    expectTypeOf(r).toEqualTypeOf<OpaqueRouteDefinition>();
  });

  it("infers data type from loader with state", () => {
    type MyState = { filter: string };
    const r = routeState<MyState>()({
      id: "products",
      path: "/products/:category",
      loader: () => ({ items: [] as string[] }),
      component: () => null,
    });
    expectTypeOf(r).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<
        "products",
        { category: string },
        MyState,
        { items: string[] }
      >
    >();
  });
});
