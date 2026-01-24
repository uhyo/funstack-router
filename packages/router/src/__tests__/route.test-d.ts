import { describe, expectTypeOf, it } from "vitest";
import { route, routeState } from "../route.js";
import type {
  TypefulOpaqueRouteDefinition,
  OpaqueRouteDefinition,
  ExtractRouteId,
  ExtractRouteParams,
  ExtractRouteState,
  ExtractRouteData,
} from "../route.js";
import { useRouteParams } from "../hooks/useRouteParams.js";
import { useRouteState } from "../hooks/useRouteState.js";
import { useRouteData } from "../hooks/useRouteData.js";

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

describe("Type extraction utilities", () => {
  it("ExtractRouteId extracts the id type", () => {
    const r = route({
      id: "user",
      path: "/users/:userId",
      component: () => null,
    });
    type Id = ExtractRouteId<typeof r>;
    expectTypeOf<Id>().toEqualTypeOf<"user">();
  });

  it("ExtractRouteParams extracts the params type", () => {
    const r = route({
      id: "user",
      path: "/users/:userId",
      component: () => null,
    });
    type Params = ExtractRouteParams<typeof r>;
    expectTypeOf<Params>().toEqualTypeOf<{ userId: string }>();
  });

  it("ExtractRouteState extracts the state type", () => {
    type MyState = { scrollPos: number };
    const r = routeState<MyState>()({
      id: "scroll",
      path: "/scroll",
      component: () => null,
    });
    type State = ExtractRouteState<typeof r>;
    expectTypeOf<State>().toEqualTypeOf<MyState>();
  });

  it("ExtractRouteData extracts the data type", () => {
    const r = route({
      id: "user",
      path: "/users/:userId",
      loader: () => ({ name: "John", age: 30 }),
      component: () => null,
    });
    type Data = ExtractRouteData<typeof r>;
    expectTypeOf<Data>().toEqualTypeOf<{ name: string; age: number }>();
  });
});

describe("useRouteParams type inference", () => {
  it("returns correctly typed params", () => {
    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      component: () => null,
    });

    // Type check the return type of useRouteParams
    const params = useRouteParams(userRoute);
    expectTypeOf(params).toEqualTypeOf<{ userId: string }>();
  });

  it("handles multiple params", () => {
    const postRoute = route({
      id: "post",
      path: "/users/:userId/posts/:postId",
      component: () => null,
    });

    const params = useRouteParams(postRoute);
    expectTypeOf(params).toEqualTypeOf<{ userId: string; postId: string }>();
  });
});

describe("useRouteState type inference", () => {
  it("returns correctly typed state or undefined", () => {
    type MyState = { scrollPos: number };
    const scrollRoute = routeState<MyState>()({
      id: "scroll",
      path: "/scroll",
      component: () => null,
    });

    const state = useRouteState(scrollRoute);
    expectTypeOf(state).toEqualTypeOf<MyState | undefined>();
  });
});

describe("useRouteData type inference", () => {
  it("returns correctly typed data", () => {
    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      loader: () => ({ name: "John", age: 30 }),
      component: () => null,
    });

    const data = useRouteData(userRoute);
    expectTypeOf(data).toEqualTypeOf<{ name: string; age: number }>();
  });

  it("handles async loader return type", () => {
    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      loader: async () => ({ name: "John", age: 30 }),
      component: () => null,
    });

    const data = useRouteData(userRoute);
    expectTypeOf(data).toEqualTypeOf<Promise<{ name: string; age: number }>>();
  });
});

describe("pathless route type inference", () => {
  it("pathless route has Record<string, never> params type", () => {
    const layoutRoute = route({
      id: "layout",
      component: () => null,
    });

    expectTypeOf(layoutRoute).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<
        "layout",
        Record<string, never>,
        undefined,
        undefined
      >
    >();
  });

  it("pathless route with loader infers data type correctly", () => {
    const layoutRoute = route({
      id: "layout",
      loader: () => ({ theme: "dark" }),
      component: () => null,
    });

    expectTypeOf(layoutRoute).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<
        "layout",
        Record<string, never>,
        undefined,
        { theme: string }
      >
    >();
  });

  it("pathless route without id returns OpaqueRouteDefinition", () => {
    const layoutRoute = route({
      component: () => null,
    });

    expectTypeOf(layoutRoute).toEqualTypeOf<OpaqueRouteDefinition>();
  });

  it("pathless route with state returns correct types", () => {
    type MyState = { expanded: boolean };
    const layoutRoute = routeState<MyState>()({
      id: "layout",
      component: () => null,
    });

    expectTypeOf(layoutRoute).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<
        "layout",
        Record<string, never>,
        MyState,
        undefined
      >
    >();
  });

  it("useRouteParams with pathless route returns empty object type", () => {
    const layoutRoute = route({
      id: "layout",
      component: () => null,
    });

    const params = useRouteParams(layoutRoute);
    expectTypeOf(params).toEqualTypeOf<Record<string, never>>();
  });
});
