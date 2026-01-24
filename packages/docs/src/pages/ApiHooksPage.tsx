import { CodeBlock } from "../components/CodeBlock";

export function ApiHooksPage() {
  return (
    <div className="page docs-page api-page">
      <h1>Hooks</h1>
      <p className="page-intro">
        React hooks for accessing router state and navigation.
      </p>

      <article className="api-item">
        <h3>
          <code>useNavigate()</code>
        </h3>
        <p>Returns a function to programmatically navigate.</p>
        <CodeBlock language="tsx">{`import { useNavigate } from "@funstack/router";

function MyComponent() {
  const navigate = useNavigate();

  // Navigate to a path
  navigate("/about");

  // Navigate with options
  navigate("/users/123", {
    replace: true,  // Replace current history entry
    state: { from: "home" },  // Persistent state (survives back/forward)
    info: { referrer: "home" },  // Ephemeral info (only for this navigation)
  });
}`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>useLocation()</code>
        </h3>
        <p>Returns the current location object.</p>
        <CodeBlock language="tsx">{`import { useLocation } from "@funstack/router";

function MyComponent() {
  const location = useLocation();

  console.log(location.pathname);  // "/users/123"
  console.log(location.search);    // "?tab=profile"
  console.log(location.hash);      // "#section"
}`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>useSearchParams()</code>
        </h3>
        <p>
          Returns a tuple of the current search params and a setter function.
        </p>
        <CodeBlock language="tsx">{`import { useSearchParams } from "@funstack/router";

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q");

  const handleSearch = (newQuery: string) => {
    setSearchParams({ q: newQuery });
  };
}`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>useBlocker(options)</code>
        </h3>
        <p>
          Prevents navigation away from the current route. Useful for scenarios
          like unsaved form data, ongoing file uploads, or any state that would
          be lost on navigation.
        </p>
        <CodeBlock language="tsx">{`import { useBlocker } from "@funstack/router";
import { useState, useCallback } from "react";

function EditForm() {
  const [isDirty, setIsDirty] = useState(false);

  useBlocker({
    shouldBlock: useCallback(() => {
      if (isDirty) {
        return !confirm("You have unsaved changes. Leave anyway?");
      }
      return false;
    }, [isDirty]),
  });

  const handleSave = () => {
    // Save logic...
    setIsDirty(false);
  };

  return (
    <form>
      <input onChange={() => setIsDirty(true)} />
      <button type="button" onClick={handleSave}>
        Save
      </button>
    </form>
  );
}`}</CodeBlock>
        <h4>Options</h4>
        <ul>
          <li>
            <code>shouldBlock</code>: A function that returns <code>true</code>{" "}
            to block navigation, or <code>false</code> to allow it. You can call{" "}
            <code>confirm()</code> inside this function to show a confirmation
            dialog. Wrap with <code>useCallback</code> when the function depends
            on state.
          </li>
        </ul>
        <h4>Notes</h4>
        <ul>
          <li>
            Multiple blockers can coexist in the component tree. If any blocker
            returns <code>true</code>, navigation is blocked.
          </li>
          <li>
            This hook only handles SPA navigations (links, programmatic
            navigation). For hard navigations (tab close, refresh), handle{" "}
            <code>beforeunload</code> separately.
          </li>
        </ul>
      </article>

      <h2>Type-Safe Hooks</h2>
      <p>
        These hooks provide type-safe access to route data when using routes
        defined with an <code>id</code>. They extract type information from{" "}
        <code>TypefulOpaqueRouteDefinition</code> and validate at runtime that
        the specified route exists in the current route hierarchy.
      </p>
      <p>
        In nested routes, these hooks can access data from any ancestor route in
        the hierarchy. For example, a child route component can use{" "}
        <code>useRouteParams(parentRoute)</code> to access the parent route's
        parameters.
      </p>

      <article className="api-item">
        <h3>
          <code>useRouteParams(route)</code>
        </h3>
        <p>
          Returns typed route parameters for the given route definition. The
          parameter types are automatically inferred from the route's path
          pattern.
        </p>
        <CodeBlock language="tsx">{`import { route, useRouteParams } from "@funstack/router";

// Define route with id for type-safe access
const userRoute = route({
  id: "user",
  path: "/users/:userId",
  component: UserPage,
});

function UserPage() {
  // params is typed as { userId: string }
  const params = useRouteParams(userRoute);

  return <div>User ID: {params.userId}</div>;
}

// In nested routes, access parent route params:
const orgRoute = route({
  id: "org",
  path: "/org/:orgId",
  component: OrgLayout,
  children: [teamRoute],
});

function TeamPage() {
  // Access parent route's params
  const { orgId } = useRouteParams(orgRoute);
  return <div>Org: {orgId}</div>;
}`}</CodeBlock>
        <h4>Errors</h4>
        <ul>
          <li>Throws if called outside a route component (no RouteContext).</li>
          <li>
            Throws if the specified route's <code>id</code> is not found in the
            current route hierarchy (neither the current route nor any
            ancestor).
          </li>
        </ul>
      </article>

      <article className="api-item">
        <h3>
          <code>useRouteState(route)</code>
        </h3>
        <p>
          Returns typed navigation state for the given route definition. Use
          this with routes defined via <code>routeState&lt;T&gt;()</code> to get
          properly typed state.
        </p>
        <CodeBlock language="tsx">{`import { routeState, useRouteState } from "@funstack/router";

type ScrollState = { scrollPos: number };

const scrollRoute = routeState<ScrollState>()({
  id: "scroll",
  path: "/page",
  component: ScrollPage,
});

function ScrollPage() {
  // state is typed as ScrollState | undefined
  const state = useRouteState(scrollRoute);

  return <div>Scroll position: {state?.scrollPos ?? 0}</div>;
}`}</CodeBlock>
        <h4>Return Value</h4>
        <p>
          Returns <code>State | undefined</code>. State is{" "}
          <code>undefined</code> on initial visit and when navigating to a new
          entry without state.
        </p>
        <h4>Errors</h4>
        <ul>
          <li>Throws if called outside a route component (no RouteContext).</li>
          <li>
            Throws if the specified route's <code>id</code> is not found in the
            current route hierarchy (neither the current route nor any
            ancestor).
          </li>
        </ul>
      </article>

      <article className="api-item">
        <h3>
          <code>useRouteData(route)</code>
        </h3>
        <p>
          Returns typed loader data for the given route definition. The data
          type is automatically inferred from the route's <code>loader</code>{" "}
          function.
        </p>
        <CodeBlock language="tsx">{`import { route, useRouteData } from "@funstack/router";

const userRoute = route({
  id: "user",
  path: "/users/:userId",
  loader: async ({ params }) => {
    const res = await fetch(\`/api/users/\${params.userId}\`);
    return res.json() as Promise<{ name: string; age: number }>;
  },
  component: UserPage,
});

function UserPage() {
  // data is typed as Promise<{ name: string; age: number }>
  const data = useRouteData(userRoute);

  // Use with React.use() or Suspense
  const user = use(data);
  return <div>User: {user.name}</div>;
}`}</CodeBlock>
        <h4>Errors</h4>
        <ul>
          <li>Throws if called outside a route component (no RouteContext).</li>
          <li>
            Throws if the specified route's <code>id</code> is not found in the
            current route hierarchy (neither the current route nor any
            ancestor).
          </li>
        </ul>
      </article>
    </div>
  );
}
