import { CodeBlock } from "../components/CodeBlock";

export function ApiUtilitiesPage() {
  return (
    <div className="page docs-page api-page">
      <h1>Utilities</h1>
      <p className="page-intro">
        Helper functions for defining routes and managing state.
      </p>

      <article className="api-item">
        <h3>
          <code>route()</code>
        </h3>
        <p>
          Helper function to define routes with proper typing. The component
          always receives a <code>params</code> prop with types inferred from
          the path pattern. When a <code>loader</code> is defined, the component
          also receives a <code>data</code> prop. Components also receive{" "}
          <code>state</code>, <code>setState</code>, <code>setStateSync</code>,
          and <code>resetState</code> props for navigation state management.
        </p>
        <CodeBlock language="tsx">{`import { route } from "@funstack/router";

// Route without loader - component receives params prop
function ProfileTab({ params }: { params: { userId: string } }) {
  return <div>Profile for user {params.userId}</div>;
}

// Route with loader - component receives both data and params props
function UserPage({
  data,
  params,
}: {
  data: User;
  params: { userId: string };
}) {
  return <h1>{data.name} (ID: {params.userId})</h1>;
}

const myRoute = route({
  path: "/users/:userId",
  component: UserPage,
  loader: async ({ params }) => {
    return fetchUser(params.userId);
  },
  children: [
    route({ path: "/profile", component: ProfileTab }),
    route({ path: "/settings", component: SettingsTab }),
  ],
});`}</CodeBlock>
        <h4>Options</h4>
        <table className="props-table">
          <thead>
            <tr>
              <th>Option</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>path</code>
              </td>
              <td>
                <code>string</code>
              </td>
              <td>
                URL path pattern (supports <code>:param</code> syntax)
              </td>
            </tr>
            <tr>
              <td>
                <code>component</code>
              </td>
              <td>
                <code>ComponentType</code>
              </td>
              <td>
                React component to render. Receives <code>params</code> prop
                (and <code>data</code> prop if loader is defined)
              </td>
            </tr>
            <tr>
              <td>
                <code>loader</code>
              </td>
              <td>
                <code>(args: LoaderArgs) =&gt; T</code>
              </td>
              <td>Function to load data. May be synchronous or asynchronous</td>
            </tr>
            <tr>
              <td>
                <code>children</code>
              </td>
              <td>
                <code>RouteDefinition[]</code>
              </td>
              <td>Nested child routes</td>
            </tr>
          </tbody>
        </table>
      </article>

      <article className="api-item">
        <h3>
          <code>routeState&lt;TState&gt;()</code>
        </h3>
        <p>
          Curried helper function for defining routes with typed navigation
          state. Use this when your route component needs to manage state that
          persists across browser back/forward navigation.
        </p>
        <CodeBlock language="tsx">{`import { routeState, type RouteComponentProps } from "@funstack/router";

type PageState = { scrollPosition: number; selectedTab: string };

function UserPage({
  params,
  state,
  setState,
  setStateSync,
  resetState,
}: RouteComponentProps<{ userId: string }, PageState>) {
  // state is PageState | undefined (undefined on first visit)
  const scrollPosition = state?.scrollPosition ?? 0;
  const selectedTab = state?.selectedTab ?? "posts";

  // Async state update (recommended for most cases)
  const handleTabChange = async (tab: string) => {
    await setState({ scrollPosition, selectedTab: tab });
  };

  // Sync state update (for immediate updates like scroll position)
  const handleScroll = (position: number) => {
    setStateSync({ scrollPosition: position, selectedTab });
  };

  return (
    <div>
      <h1>User {params.userId}</h1>
      <button onClick={() => resetState()}>Clear State</button>
    </div>
  );
}

// Use routeState<TState>() for typed state management
const userRoute = routeState<PageState>()({
  path: "/users/:userId",
  component: UserPage,
});

// With loader
const productRoute = routeState<{ filter: string }>()({
  path: "/products",
  component: ProductList,
  loader: async () => fetchProducts(),
});`}</CodeBlock>
        <h4>How It Works</h4>
        <p>
          Navigation state is stored in the browser's{" "}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API"
            target="_blank"
            rel="noopener noreferrer"
          >
            Navigation API
          </a>
          . The router provides two methods to update state:
        </p>
        <ul>
          <li>
            <code>setState</code> - Async method that uses replace navigation.
            Returns a Promise that resolves when the navigation completes.
          </li>
          <li>
            <code>setStateSync</code> - Sync method that uses{" "}
            <code>navigation.updateCurrentEntry()</code>. Updates state
            immediately without waiting.
          </li>
        </ul>
        <p>Navigation state characteristics:</p>
        <ul>
          <li>State persists when navigating back/forward in history</li>
          <li>Each history entry has its own independent state</li>
          <li>
            State must be serializable (no functions, Symbols, or DOM nodes)
          </li>
        </ul>
        <h4>Internal Storage</h4>
        <p>
          The router stores state internally using a <code>__routeStates</code>{" "}
          array indexed by route match position. This enables each nested route
          to maintain independent state:
        </p>
        <CodeBlock language="typescript">{`// Internal structure stored in NavigationHistoryEntry
{
  __routeStates: [
    { sidebarOpen: true },    // Layout (index 0)
    { selectedTab: "posts" }, // UserPage (index 1)
    { scrollY: 500 },         // PostsPage (index 2)
  ]
}`}</CodeBlock>
      </article>
    </div>
  );
}
