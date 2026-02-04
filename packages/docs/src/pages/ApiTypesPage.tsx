"use client";

import { CodeBlock } from "../components/CodeBlock";

export function ApiTypesPage() {
  return (
    <div className="page docs-page api-page">
      <h1>Types</h1>
      <p className="page-intro">
        TypeScript types and interfaces exported by the router.
      </p>

      <article className="api-item">
        <h3>
          <code>RouteComponentProps&lt;TParams, TState&gt;</code>
        </h3>
        <p>
          Props type for route components without a loader. Includes navigation
          state management props.
        </p>
        <CodeBlock language="typescript">{`import type { RouteComponentProps } from "@funstack/router";

type Props = RouteComponentProps<
  { userId: string },      // TParams - path parameters
  { scrollPosition: number } // TState - navigation state type
>;

// Equivalent to:
type Props = {
  params: { userId: string };
  state: { scrollPosition: number } | undefined;
  // Async state update via replace navigation
  setState: (
    state: { scrollPosition: number } |
           ((prev: { scrollPosition: number } | undefined) => { scrollPosition: number })
  ) => Promise<void>;
  // Sync state update via updateCurrentEntry
  setStateSync: (
    state: { scrollPosition: number } |
           ((prev: { scrollPosition: number } | undefined) => { scrollPosition: number })
  ) => void;
  resetState: () => void;
  info: unknown; // Ephemeral navigation info
};`}</CodeBlock>
        <p>
          <strong>setState vs setStateSync:</strong>
        </p>
        <ul>
          <li>
            <code>setState</code> - Async method that returns a Promise. Uses
            replace navigation internally, ensuring the state update goes
            through the full navigation cycle.
          </li>
          <li>
            <code>setStateSync</code> - Synchronous method that updates state
            immediately using <code>navigation.updateCurrentEntry()</code>.
          </li>
        </ul>
      </article>

      <article className="api-item">
        <h3>
          <code>RouteComponentPropsWithData&lt;TParams, TData, TState&gt;</code>
        </h3>
        <p>
          Props type for route components with a loader. Extends{" "}
          <code>RouteComponentProps</code> with a <code>data</code> prop.
        </p>
        <CodeBlock language="typescript">{`import type { RouteComponentPropsWithData } from "@funstack/router";

type Props = RouteComponentPropsWithData<
  { userId: string },        // TParams - path parameters
  User,                      // TData - loader return type
  { selectedTab: string }    // TState - navigation state type
>;

// Equivalent to:
type Props = {
  params: { userId: string };
  data: User;
  state: { selectedTab: string } | undefined;
  setState: (state: ...) => Promise<void>;  // async
  setStateSync: (state: ...) => void;       // sync
  resetState: () => void;
  info: unknown; // Ephemeral navigation info
};`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>PathParams&lt;T&gt;</code>
        </h3>
        <p>
          Utility type that extracts parameter types from a path pattern string.
        </p>
        <CodeBlock language="tsx">{`import type { PathParams } from "@funstack/router";

// PathParams<"/users/:userId"> = { userId: string }
// PathParams<"/users/:userId/posts/:postId"> = { userId: string; postId: string }
// PathParams<"/about"> = Record<string, never>

type MyParams = PathParams<"/users/:userId">;
// { userId: string }`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>
            TypefulOpaqueRouteDefinition&lt;Id, Params, State, Data&gt;
          </code>
        </h3>
        <p>
          A route definition that carries type information. Created when using{" "}
          <code>route()</code> or <code>routeState()</code> with an{" "}
          <code>id</code> property. This enables type-safe access to route
          params, state, and data via hooks.
        </p>
        <CodeBlock language="tsx">{`import { route, routeState } from "@funstack/router";
import type { TypefulOpaqueRouteDefinition } from "@funstack/router";

// Route with id gets TypefulOpaqueRouteDefinition type
const userRoute = route({
  id: "user",
  path: "/users/:userId",
  loader: () => ({ name: "John" }),
  component: UserPage,
});
// Type: TypefulOpaqueRouteDefinition<"user", { userId: string }, undefined, { name: string }>

// Route without id gets OpaqueRouteDefinition (no type info)
const aboutRoute = route({
  path: "/about",
  component: AboutPage,
});
// Type: OpaqueRouteDefinition`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>Type Extraction Utilities</h3>
        <p>
          Helper types to extract type information from{" "}
          <code>TypefulOpaqueRouteDefinition</code>. Useful for advanced type
          manipulation.
        </p>
        <CodeBlock language="tsx">{`import type {
  ExtractRouteId,
  ExtractRouteParams,
  ExtractRouteState,
  ExtractRouteData,
} from "@funstack/router";

const userRoute = route({
  id: "user",
  path: "/users/:userId",
  loader: () => ({ name: "John", age: 30 }),
  component: UserPage,
});

type Id = ExtractRouteId<typeof userRoute>;
// "user"

type Params = ExtractRouteParams<typeof userRoute>;
// { userId: string }

type State = ExtractRouteState<typeof userRoute>;
// undefined

type Data = ExtractRouteData<typeof userRoute>;
// { name: string; age: number }`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>RouteComponentPropsOf&lt;T&gt;</code>
        </h3>
        <p>
          Utility type that extracts the component props type from a route
          definition. Returns <code>RouteComponentProps</code> for routes
          without a loader, or <code>RouteComponentPropsWithData</code> for
          routes with a loader. This is useful for typing route components
          separately from the route definition.
        </p>
        <CodeBlock language="tsx">{`import { route, routeState } from "@funstack/router";
import type { RouteComponentPropsOf } from "@funstack/router";

// Route without loader
const userRoute = route({
  id: "user",
  path: "/users/:userId",
  component: UserPage,
});

type UserPageProps = RouteComponentPropsOf<typeof userRoute>;
// RouteComponentProps<{ userId: string }, undefined>

function UserPage({ params }: UserPageProps) {
  return <h1>User: {params.userId}</h1>;
}

// Route with loader
const profileRoute = route({
  id: "profile",
  path: "/profile/:userId",
  loader: () => ({ name: "John", age: 30 }),
  component: ProfilePage,
});

type ProfilePageProps = RouteComponentPropsOf<typeof profileRoute>;
// RouteComponentPropsWithData<{ userId: string }, { name: string; age: number }, undefined>

// Route with state
type MyState = { tab: string };
const settingsRoute = routeState<MyState>()({
  id: "settings",
  path: "/settings",
  component: SettingsPage,
});

type SettingsPageProps = RouteComponentPropsOf<typeof settingsRoute>;
// RouteComponentProps<Record<string, never>, MyState>`}</CodeBlock>
        <p>
          <strong>Note:</strong> This utility requires a route with an{" "}
          <code>id</code> property. Using it with a route without{" "}
          <code>id</code> will result in a type error.
        </p>
      </article>

      <article className="api-item">
        <h3>
          <code>RouteDefinition</code>
        </h3>
        <p>
          The <code>component</code> field accepts two forms:
        </p>
        <ul>
          <li>
            <strong>Component reference</strong> (e.g.,{" "}
            <code>component: UserPage</code>): Router automatically injects
            props (<code>params</code>, <code>state</code>,{" "}
            <code>setState</code>, <code>setStateSync</code>,{" "}
            <code>resetState</code>, <code>info</code>, and <code>data</code>{" "}
            when a loader is defined).
          </li>
          <li>
            <strong>JSX element</strong> (e.g.,{" "}
            <code>component: &lt;UserPage /&gt;</code>): Rendered as-is without
            router props injection. Useful for static components or when you
            want to pass custom props.
          </li>
        </ul>
        <CodeBlock language="tsx">{`// Component reference: router injects props automatically
route({
  path: "/users/:userId",
  component: UserPage,  // receives { params, state, setState, ... }
});

// JSX element: rendered as-is, no props injection
route({
  path: "/about",
  component: <AboutPage title="About Us" />,  // custom props only
});

// With loader and state:
routeState<{ tab: string }>()({
  path: "/users/:userId",
  component: UserPage,  // receives { data, params, state, ... }
  loader: () => fetchUser(),
});`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>LoaderArgs</code>
        </h3>
        <CodeBlock language="typescript">{`interface LoaderArgs {
  params: Record<string, string>;
  request: Request;
  signal: AbortSignal;
}`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>Location</code>
        </h3>
        <CodeBlock language="typescript">{`interface Location {
  pathname: string;
  search: string;
  hash: string;
}`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>NavigateOptions</code>
        </h3>
        <CodeBlock language="typescript">{`interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
  info?: unknown;  // Ephemeral, not persisted in history
}`}</CodeBlock>
        <p>
          <strong>Note:</strong> <code>state</code> is persisted in history and
          available across back/forward navigation. <code>info</code> is
          ephemeral and only available during the navigation that triggered it.
        </p>
      </article>
    </div>
  );
}
