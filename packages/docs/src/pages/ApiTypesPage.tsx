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
          <code>RouteDefinition</code>
        </h3>
        <p>
          When using the <code>route()</code> or <code>routeState()</code>{" "}
          helper, component types are inferred automatically. Components always
          receive <code>params</code>, <code>state</code>, <code>setState</code>
          , <code>setStateSync</code>, <code>resetState</code>, and{" "}
          <code>info</code> props, and receive a <code>data</code> prop when a
          loader is defined.
        </p>
        <CodeBlock language="tsx">{`// With loader: component receives { data, params, state, setState, setStateSync, resetState, info }
// Without loader: component receives { params, state, setState, setStateSync, resetState, info }

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
