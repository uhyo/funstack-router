import { describe, expectTypeOf, it } from "vitest";
import { route, routeState } from "../route.js";
import type {
  TypefulOpaqueRouteDefinition,
  OpaqueRouteDefinition,
  PartialRouteDefinition,
  ExtractRouteId,
  ExtractRouteParams,
  ExtractRouteState,
  ExtractRouteData,
  RouteComponentPropsOf,
  RouteComponentProps,
  RouteComponentPropsWithData,
  ActionArgs,
  LoaderArgs,
} from "../route.js";
import { bindRoute } from "../bindRoute.js";
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

describe("RouteComponentPropsOf utility type", () => {
  it("extracts RouteComponentProps for route without loader", () => {
    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      component: () => null,
    });

    type Props = RouteComponentPropsOf<typeof userRoute>;
    expectTypeOf<Props>().toEqualTypeOf<
      RouteComponentProps<{ userId: string }, undefined>
    >();
  });

  it("extracts RouteComponentPropsWithData for route with loader", () => {
    const userRoute = route({
      id: "user",
      path: "/users/:userId",
      loader: () => ({ name: "John", age: 30 }),
      component: () => null,
    });

    type Props = RouteComponentPropsOf<typeof userRoute>;
    expectTypeOf<Props>().toEqualTypeOf<
      RouteComponentPropsWithData<
        { userId: string },
        { name: string; age: number },
        undefined
      >
    >();
  });

  it("extracts props with state type from routeState", () => {
    type MyState = { scrollPos: number };
    const scrollRoute = routeState<MyState>()({
      id: "scroll",
      path: "/scroll",
      component: () => null,
    });

    type Props = RouteComponentPropsOf<typeof scrollRoute>;
    expectTypeOf<Props>().toEqualTypeOf<
      RouteComponentProps<Record<string, never>, MyState>
    >();
  });

  it("extracts props with both state and loader", () => {
    type FilterState = { filter: string };
    const productsRoute = routeState<FilterState>()({
      id: "products",
      path: "/products/:category",
      loader: () => ({ items: [] as string[] }),
      component: () => null,
    });

    type Props = RouteComponentPropsOf<typeof productsRoute>;
    expectTypeOf<Props>().toEqualTypeOf<
      RouteComponentPropsWithData<
        { category: string },
        { items: string[] },
        FilterState
      >
    >();
  });

  it("extracts props for pathless route", () => {
    const layoutRoute = route({
      id: "layout",
      component: () => null,
    });

    type Props = RouteComponentPropsOf<typeof layoutRoute>;
    expectTypeOf<Props>().toEqualTypeOf<
      RouteComponentProps<Record<string, never>, undefined>
    >();
  });

  it("extracts props for pathless route with loader", () => {
    const layoutRoute = route({
      id: "layout",
      loader: () => ({ theme: "dark" }),
      component: () => null,
    });

    type Props = RouteComponentPropsOf<typeof layoutRoute>;
    expectTypeOf<Props>().toEqualTypeOf<
      RouteComponentPropsWithData<
        Record<string, never>,
        { theme: string },
        undefined
      >
    >();
  });

  it("rejects route without id with type error", () => {
    const noIdRoute = route({
      path: "/users/:userId",
      component: () => null,
    });

    // @ts-expect-error - RouteComponentPropsOf requires a route with id
    type _Props = RouteComponentPropsOf<typeof noIdRoute>;
  });
});

describe("route() with action type inference", () => {
  it("route with action and loader infers data type from loader", () => {
    const r = route({
      id: "editUser",
      path: "/users/:userId/edit",
      action: async ({ request }) => {
        const formData = await request.formData();
        return { success: true, name: formData.get("name") as string };
      },
      loader: ({ actionResult }) => ({
        user: { name: "John" },
        updateResult: actionResult ?? null,
      }),
      component: () => null,
    });

    expectTypeOf(r).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<
        "editUser",
        { userId: string },
        undefined,
        {
          user: { name: string };
          updateResult: { success: boolean; name: string } | null;
        }
      >
    >();
  });

  it("route with action only returns TypefulOpaqueRouteDefinition with undefined data", () => {
    const r = route({
      id: "deleteUser",
      path: "/users/:userId/delete",
      action: async ({ params }) => {
        return { deleted: params.userId };
      },
      component: () => null,
    });

    expectTypeOf(r).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<
        "deleteUser",
        { userId: string },
        undefined,
        undefined
      >
    >();
  });

  it("route with action and loader (no id) returns OpaqueRouteDefinition", () => {
    const r = route({
      path: "/submit",
      action: async () => "ok",
      loader: ({ actionResult }) => ({ result: actionResult }),
      component: () => null,
    });

    expectTypeOf(r).toEqualTypeOf<OpaqueRouteDefinition>();
  });

  it("route with action only (no id) returns OpaqueRouteDefinition", () => {
    const r = route({
      path: "/submit",
      action: async () => "ok",
      component: () => null,
    });

    expectTypeOf(r).toEqualTypeOf<OpaqueRouteDefinition>();
  });

  it("action receives correctly typed params from path", () => {
    route({
      id: "test",
      path: "/users/:userId/posts/:postId",
      action: (args) => {
        expectTypeOf(args).toEqualTypeOf<
          ActionArgs<{ userId: string; postId: string }>
        >();
        return null;
      },
      component: () => null,
    });
  });

  it("loader receives actionResult typed from action return", () => {
    type ActionResult = { success: boolean; id: number };

    route({
      id: "test",
      path: "/submit",
      action: async (): Promise<ActionResult> => ({
        success: true,
        id: 42,
      }),
      loader: (args) => {
        expectTypeOf(args.actionResult).toEqualTypeOf<
          ActionResult | undefined
        >();
        return { data: args.actionResult };
      },
      component: () => null,
    });
  });

  it("RouteComponentPropsOf works with action+loader route", () => {
    const r = route({
      id: "edit",
      path: "/edit/:id",
      action: async () => ({ saved: true }),
      loader: ({ actionResult }) => ({
        item: "test",
        saveResult: actionResult ?? null,
      }),
      component: () => null,
    });

    type Props = RouteComponentPropsOf<typeof r>;
    expectTypeOf<Props>().toEqualTypeOf<
      RouteComponentPropsWithData<
        { id: string },
        { item: string; saveResult: { saved: boolean } | null },
        undefined
      >
    >();
  });

  it("RouteComponentPropsOf works with action-only route (no data)", () => {
    const r = route({
      id: "delete",
      path: "/delete/:id",
      action: async () => ({ deleted: true }),
      component: () => null,
    });

    type Props = RouteComponentPropsOf<typeof r>;
    expectTypeOf<Props>().toEqualTypeOf<
      RouteComponentProps<{ id: string }, undefined>
    >();
  });
});

describe("routeState() with action type inference", () => {
  it("routeState with action and loader returns correct types", () => {
    type MyState = { expanded: boolean };
    const r = routeState<MyState>()({
      id: "edit",
      path: "/edit/:id",
      action: async () => ({ saved: true }),
      loader: ({ actionResult }) => ({
        item: "test",
        saveResult: actionResult ?? null,
      }),
      component: () => null,
    });

    expectTypeOf(r).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<
        "edit",
        { id: string },
        MyState,
        { item: string; saveResult: { saved: boolean } | null }
      >
    >();
  });

  it("routeState with action only returns correct types", () => {
    type MyState = { confirmed: boolean };
    const r = routeState<MyState>()({
      id: "delete",
      path: "/delete/:id",
      action: async () => ({ deleted: true }),
      component: () => null,
    });

    expectTypeOf(r).toEqualTypeOf<
      TypefulOpaqueRouteDefinition<"delete", { id: string }, MyState, undefined>
    >();
  });
});

describe("LoaderArgs actionResult backwards compatibility", () => {
  it("LoaderArgs without ActionResult type param has actionResult: undefined", () => {
    type Args = LoaderArgs<{ id: string }>;
    expectTypeOf<Args["actionResult"]>().toEqualTypeOf<undefined>();
  });

  it("LoaderArgs with ActionResult type param has typed actionResult", () => {
    type Args = LoaderArgs<{ id: string }, { success: boolean }>;
    expectTypeOf<Args["actionResult"]>().toEqualTypeOf<
      { success: boolean } | undefined
    >();
  });
});

describe("PartialRouteDefinition (two-phase route definition)", () => {
  describe("route() without component returns PartialRouteDefinition", () => {
    it("returns PartialRouteDefinition when id is provided but component is not", () => {
      const r = route({ id: "user", path: "/users/:userId" });
      expectTypeOf(r).toEqualTypeOf<
        PartialRouteDefinition<"user", { userId: string }, undefined, undefined>
      >();
    });

    it("returns PartialRouteDefinition with loader data type", () => {
      const r = route({
        id: "user",
        path: "/users/:userId",
        loader: () => ({ name: "John" }),
      });
      expectTypeOf(r).toEqualTypeOf<
        PartialRouteDefinition<
          "user",
          { userId: string },
          undefined,
          { name: string }
        >
      >();
    });

    it("returns PartialRouteDefinition with action and loader", () => {
      const r = route({
        id: "edit",
        path: "/edit/:id",
        action: async () => ({ saved: true }),
        loader: ({ actionResult }) => ({
          item: "test",
          saveResult: actionResult ?? null,
        }),
      });
      expectTypeOf(r).toEqualTypeOf<
        PartialRouteDefinition<
          "edit",
          { id: string },
          undefined,
          { item: string; saveResult: { saved: boolean } | null }
        >
      >();
    });

    it("returns PartialRouteDefinition with action only", () => {
      const r = route({
        id: "delete",
        path: "/delete/:id",
        action: async () => ({ deleted: true }),
      });
      expectTypeOf(r).toEqualTypeOf<
        PartialRouteDefinition<"delete", { id: string }, undefined, undefined>
      >();
    });

    it("returns PartialRouteDefinition for pathless route with loader", () => {
      const r = route({
        id: "layout",
        loader: () => ({ theme: "dark" }),
      });
      expectTypeOf(r).toEqualTypeOf<
        PartialRouteDefinition<
          "layout",
          Record<string, never>,
          undefined,
          { theme: string }
        >
      >();
    });

    it("returns PartialRouteDefinition for pathless route without loader", () => {
      const r = route({ id: "layout" });
      expectTypeOf(r).toEqualTypeOf<
        PartialRouteDefinition<
          "layout",
          Record<string, never>,
          undefined,
          undefined
        >
      >();
    });

    it("returns OpaqueRouteDefinition when id is not provided and component is not provided", () => {
      const r = route({ path: "/about" });
      expectTypeOf(r).toEqualTypeOf<OpaqueRouteDefinition>();
    });
  });

  describe("routeState() without component returns PartialRouteDefinition", () => {
    it("returns PartialRouteDefinition with state type", () => {
      type MyState = { tab: string };
      const r = routeState<MyState>()({
        id: "settings",
        path: "/settings",
      });
      expectTypeOf(r).toEqualTypeOf<
        PartialRouteDefinition<
          "settings",
          Record<string, never>,
          MyState,
          undefined
        >
      >();
    });

    it("returns PartialRouteDefinition with state and loader", () => {
      type MyState = { filter: string };
      const r = routeState<MyState>()({
        id: "products",
        path: "/products/:category",
        loader: () => ({ items: [] as string[] }),
      });
      expectTypeOf(r).toEqualTypeOf<
        PartialRouteDefinition<
          "products",
          { category: string },
          MyState,
          { items: string[] }
        >
      >();
    });

    it("returns PartialRouteDefinition for pathless route with state", () => {
      type MyState = { expanded: boolean };
      const r = routeState<MyState>()({ id: "layout" });
      expectTypeOf(r).toEqualTypeOf<
        PartialRouteDefinition<
          "layout",
          Record<string, never>,
          MyState,
          undefined
        >
      >();
    });
  });

  describe("bindRoute() type inference", () => {
    it("returns TypefulOpaqueRouteDefinition from PartialRouteDefinition", () => {
      const partial = route({
        id: "user",
        path: "/users/:userId",
        loader: () => ({ name: "John" }),
      });
      const bound = bindRoute(partial, { component: () => null });
      expectTypeOf(bound).toEqualTypeOf<
        TypefulOpaqueRouteDefinition<
          "user",
          { userId: string },
          undefined,
          { name: string }
        >
      >();
    });

    it("returns OpaqueRouteDefinition from OpaqueRouteDefinition", () => {
      const opaque = route({ path: "/about" });
      const bound = bindRoute(opaque, { component: () => null });
      expectTypeOf(bound).toEqualTypeOf<OpaqueRouteDefinition>();
    });

    it("preserves state type through bindRoute", () => {
      type MyState = { tab: string };
      const partial = routeState<MyState>()({
        id: "settings",
        path: "/settings",
      });
      const bound = bindRoute(partial, { component: () => null });
      expectTypeOf(bound).toEqualTypeOf<
        TypefulOpaqueRouteDefinition<
          "settings",
          Record<string, never>,
          MyState,
          undefined
        >
      >();
    });
  });

  describe("type extraction utilities with PartialRouteDefinition", () => {
    it("ExtractRouteId works with PartialRouteDefinition", () => {
      const r = route({ id: "user", path: "/users/:userId" });
      type Id = ExtractRouteId<typeof r>;
      expectTypeOf<Id>().toEqualTypeOf<"user">();
    });

    it("ExtractRouteParams works with PartialRouteDefinition", () => {
      const r = route({ id: "user", path: "/users/:userId" });
      type Params = ExtractRouteParams<typeof r>;
      expectTypeOf<Params>().toEqualTypeOf<{ userId: string }>();
    });

    it("ExtractRouteState works with PartialRouteDefinition", () => {
      type MyState = { scrollPos: number };
      const r = routeState<MyState>()({
        id: "scroll",
        path: "/scroll",
      });
      type State = ExtractRouteState<typeof r>;
      expectTypeOf<State>().toEqualTypeOf<MyState>();
    });

    it("ExtractRouteData works with PartialRouteDefinition", () => {
      const r = route({
        id: "user",
        path: "/users/:userId",
        loader: () => ({ name: "John", age: 30 }),
      });
      type Data = ExtractRouteData<typeof r>;
      expectTypeOf<Data>().toEqualTypeOf<{ name: string; age: number }>();
    });
  });

  describe("hooks accept PartialRouteDefinition", () => {
    it("useRouteParams accepts PartialRouteDefinition", () => {
      const r = route({ id: "user", path: "/users/:userId" });
      const params = useRouteParams(r);
      expectTypeOf(params).toEqualTypeOf<{ userId: string }>();
    });

    it("useRouteState accepts PartialRouteDefinition", () => {
      type MyState = { scrollPos: number };
      const r = routeState<MyState>()({
        id: "scroll",
        path: "/scroll",
      });
      const state = useRouteState(r);
      expectTypeOf(state).toEqualTypeOf<MyState | undefined>();
    });

    it("useRouteData accepts PartialRouteDefinition", () => {
      const r = route({
        id: "user",
        path: "/users/:userId",
        loader: () => ({ name: "John", age: 30 }),
      });
      const data = useRouteData(r);
      expectTypeOf(data).toEqualTypeOf<{ name: string; age: number }>();
    });
  });

  describe("RouteComponentPropsOf with PartialRouteDefinition", () => {
    it("extracts RouteComponentProps for partial route without loader", () => {
      const r = route({ id: "user", path: "/users/:userId" });
      type Props = RouteComponentPropsOf<typeof r>;
      expectTypeOf<Props>().toEqualTypeOf<
        RouteComponentProps<{ userId: string }, undefined>
      >();
    });

    it("extracts RouteComponentPropsWithData for partial route with loader", () => {
      const r = route({
        id: "user",
        path: "/users/:userId",
        loader: () => ({ name: "John", age: 30 }),
      });
      type Props = RouteComponentPropsOf<typeof r>;
      expectTypeOf<Props>().toEqualTypeOf<
        RouteComponentPropsWithData<
          { userId: string },
          { name: string; age: number },
          undefined
        >
      >();
    });

    it("extracts props with state type from routeState partial", () => {
      type MyState = { scrollPos: number };
      const r = routeState<MyState>()({
        id: "scroll",
        path: "/scroll",
      });
      type Props = RouteComponentPropsOf<typeof r>;
      expectTypeOf<Props>().toEqualTypeOf<
        RouteComponentProps<Record<string, never>, MyState>
      >();
    });
  });
});
