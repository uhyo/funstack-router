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
  setState: (
    state: { scrollPosition: number } |
           ((prev: { scrollPosition: number } | undefined) => { scrollPosition: number })
  ) => void;
  resetState: () => void;
};`}</CodeBlock>
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
  setState: (state: ...) => void;
  resetState: () => void;
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
          <code>RouteDefinition</code>
        </h3>
        <p>
          When using the <code>route()</code> or <code>routeState()</code>{" "}
          helper, component types are inferred automatically. Components always
          receive <code>params</code>, <code>state</code>, <code>setState</code>
          , and <code>resetState</code> props, and receive a <code>data</code>{" "}
          prop when a loader is defined.
        </p>
        <CodeBlock language="tsx">{`// With loader: component receives { data, params, state, setState, resetState }
// Without loader: component receives { params, state, setState, resetState }

// Example without state type:
route({
  path: "/users/:userId",
  component: UserPage,  // state is undefined
});

// Example with state type:
routeState<{ tab: string }>()({
  path: "/users/:userId",
  component: UserPage,  // state is { tab: string } | undefined
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
}`}</CodeBlock>
      </article>
    </div>
  );
}
