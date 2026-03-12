import { CodeBlock } from "../components/CodeBlock.js";

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
  // Async reset via replace navigation
  resetState: () => Promise<void>;
  // Sync reset via updateCurrentEntry
  resetStateSync: () => void;
  info: unknown; // Ephemeral navigation info
  isPending: boolean; // Whether a navigation transition is pending
};`}</CodeBlock>
        <p>
          <strong>setState vs setStateSync:</strong>
        </p>
        <ul>
          <li>
            <code>setState</code> - Async method that returns a Promise. Uses
            replace navigation internally, ensuring the state update goes
            through the full navigation cycle. Because it performs a navigation,
            it is wrapped in a React transition and may set{" "}
            <code>isPending</code> to <code>true</code>.
          </li>
          <li>
            <code>setStateSync</code> - Synchronous method that updates state
            immediately using <code>navigation.updateCurrentEntry()</code>. This
            is <strong>not</strong> a navigation, so it bypasses React
            transitions and will never set <code>isPending</code> to{" "}
            <code>true</code>.
          </li>
          <li>
            <code>resetState</code> - Async method that clears navigation state
            via replace navigation. Like <code>setState</code>, it goes through
            a React transition and may set <code>isPending</code> to{" "}
            <code>true</code>.
          </li>
          <li>
            <code>resetStateSync</code> - Clears navigation state synchronously.
            Like <code>setStateSync</code>, this bypasses React transitions and
            will never set <code>isPending</code> to <code>true</code>.
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
  resetState: () => Promise<void>;          // async
  resetStateSync: () => void;               // sync
  info: unknown; // Ephemeral navigation info
  isPending: boolean; // Whether a navigation transition is pending
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
            <code>resetState</code>, <code>resetStateSync</code>,{" "}
            <code>info</code>, <code>isPending</code>, and <code>data</code>{" "}
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
          <code>ActionArgs</code>
        </h3>
        <p>
          Arguments passed to route action functions. The <code>request</code>{" "}
          carries the POST method and <code>FormData</code> body from the form
          submission.
        </p>
        <CodeBlock language="typescript">{`interface ActionArgs<Params> {
  params: Params;
  request: Request;  // method: "POST", body: FormData
  signal: AbortSignal;
}`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>LoaderArgs</code>
        </h3>
        <p>
          Arguments passed to route loader functions. The optional{" "}
          <code>actionResult</code> parameter contains the return value of the
          route's action when the loader runs after a form submission.
        </p>
        <CodeBlock language="typescript">{`interface LoaderArgs<Params, ActionResult = undefined> {
  params: Params;
  request: Request;
  signal: AbortSignal;
  actionResult: ActionResult | undefined;
}`}</CodeBlock>
        <p>
          On normal navigations, <code>actionResult</code> is{" "}
          <code>undefined</code>. After a form submission, it contains the
          action's return value (awaited if the action is async).
        </p>
      </article>

      <article className="api-item">
        <h3>
          <code>Location</code>
        </h3>
        <CodeBlock language="typescript">{`interface Location {
  pathname: string;
  search: string;
  hash: string;
  entryId: string | null;   // NavigationHistoryEntry.id
  entryKey: string | null;  // NavigationHistoryEntry.key
}`}</CodeBlock>
        <p>
          <code>entryId</code> and <code>entryKey</code> expose the
          corresponding properties from the Navigation API's{" "}
          <code>NavigationHistoryEntry</code>. <code>entryId</code> is a unique
          identifier for the entry — a new id is assigned when the entry is
          replaced. <code>entryKey</code> represents the slot in the entry list
          and is stable across replacements. Both are <code>null</code> when the
          Navigation API is unavailable (e.g., in static fallback mode).
        </p>
        <p>
          <strong>Warning:</strong> Do not render these values directly in DOM,
          as they are not available during SSR and will cause a hydration
          mismatch. They are best suited for use as a React <code>key</code> or
          in effects/callbacks.
        </p>
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
