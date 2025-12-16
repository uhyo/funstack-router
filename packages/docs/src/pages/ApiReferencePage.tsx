export function ApiReferencePage() {
  return (
    <div className="page docs-page api-page">
      <h1>API Reference</h1>

      <nav className="api-nav">
        <a href="#components">Components</a>
        <a href="#hooks">Hooks</a>
        <a href="#utilities">Utilities</a>
        <a href="#types">Types</a>
      </nav>

      <section id="components">
        <h2>Components</h2>

        <article className="api-item">
          <h3>
            <code>{"<Router>"}</code>
          </h3>
          <p>The main router component that provides routing context.</p>
          <pre className="code-block">
            <code>{`import { Router } from "@funstack/router";

<Router
  routes={routes}
  onNavigate={(location) => {
    console.log("Navigated to:", location.pathname);
  }}
/>`}</code>
          </pre>
          <h4>Props</h4>
          <table className="props-table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>routes</code>
                </td>
                <td>
                  <code>RouteDefinition[]</code>
                </td>
                <td>Array of route definitions</td>
              </tr>
              <tr>
                <td>
                  <code>onNavigate</code>
                </td>
                <td>
                  <code>OnNavigateCallback</code>
                </td>
                <td>Callback fired after navigation completes</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article className="api-item">
          <h3>
            <code>{"<Outlet>"}</code>
          </h3>
          <p>
            Renders the child route's component. Used in parent routes for
            nested layouts.
          </p>
          <pre className="code-block">
            <code>{`import { Outlet } from "@funstack/router";

function Layout() {
  return (
    <div>
      <header>My App</header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}`}</code>
          </pre>
        </article>
      </section>

      <section id="hooks">
        <h2>Hooks</h2>

        <article className="api-item">
          <h3>
            <code>useNavigate()</code>
          </h3>
          <p>Returns a function to programmatically navigate.</p>
          <pre className="code-block">
            <code>{`import { useNavigate } from "@funstack/router";

function MyComponent() {
  const navigate = useNavigate();

  // Navigate to a path
  navigate("/about");

  // Navigate with options
  navigate("/users/123", {
    replace: true,  // Replace current history entry
    state: { from: "home" },  // Pass state data
  });
}`}</code>
          </pre>
        </article>

        <article className="api-item">
          <h3>
            <code>useLocation()</code>
          </h3>
          <p>Returns the current location object.</p>
          <pre className="code-block">
            <code>{`import { useLocation } from "@funstack/router";

function MyComponent() {
  const location = useLocation();

  console.log(location.pathname);  // "/users/123"
  console.log(location.search);    // "?tab=profile"
  console.log(location.hash);      // "#section"
}`}</code>
          </pre>
        </article>

        <article className="api-item">
          <h3>
            <code>useParams()</code>
          </h3>
          <p>
            Returns the route parameters as an object. This is an alternative to
            receiving params via props—use whichever style you prefer.
          </p>
          <pre className="code-block">
            <code>{`import { useParams } from "@funstack/router";

// For route: /users/:userId/posts/:postId

function PostPage() {
  const params = useParams<{ userId: string; postId: string }>();

  console.log(params.userId);  // "123"
  console.log(params.postId);  // "456"
}

// Alternatively, receive params via props (recommended):
function PostPage({ params }: { params: { userId: string; postId: string } }) {
  console.log(params.userId);  // "123"
  console.log(params.postId);  // "456"
}`}</code>
          </pre>
        </article>

        <article className="api-item">
          <h3>
            <code>useSearchParams()</code>
          </h3>
          <p>
            Returns a tuple of the current search params and a setter function.
          </p>
          <pre className="code-block">
            <code>{`import { useSearchParams } from "@funstack/router";

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q");

  const handleSearch = (newQuery: string) => {
    setSearchParams({ q: newQuery });
  };
}`}</code>
          </pre>
        </article>
      </section>

      <section id="utilities">
        <h2>Utilities</h2>

        <article className="api-item">
          <h3>
            <code>route()</code>
          </h3>
          <p>
            Helper function to define routes with proper typing. The component
            always receives a <code>params</code> prop with types inferred from
            the path pattern. When a <code>loader</code> is defined, the
            component also receives a <code>data</code> prop.
          </p>
          <pre className="code-block">
            <code>{`import { route } from "@funstack/router";

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
});`}</code>
          </pre>
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
                <td>
                  Function to load data. May be synchronous or asynchronous
                </td>
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
      </section>

      <section id="types">
        <h2>Types</h2>

        <article className="api-item">
          <h3>
            <code>PathParams&lt;T&gt;</code>
          </h3>
          <p>
            Utility type that extracts parameter types from a path pattern
            string.
          </p>
          <pre className="code-block">
            <code>{`import type { PathParams } from "@funstack/router";

// PathParams<"/users/:userId"> = { userId: string }
// PathParams<"/users/:userId/posts/:postId"> = { userId: string; postId: string }
// PathParams<"/about"> = Record<string, never>

type MyParams = PathParams<"/users/:userId">;
// { userId: string }`}</code>
          </pre>
        </article>

        <article className="api-item">
          <h3>
            <code>RouteDefinition</code>
          </h3>
          <p>
            When using the <code>route()</code> helper, component types are
            inferred automatically. Components always receive a{" "}
            <code>params</code> prop, and receive a <code>data</code> prop when
            a loader is defined.
          </p>
          <pre className="code-block">
            <code>{`// With loader: component receives { data: T; params: PathParams<Path> }
// Without loader: component receives { params: PathParams<Path> }

// Example:
route({
  path: "/users/:userId",
  component: UserPage,  // { params: { userId: string } }
});

route({
  path: "/users/:userId",
  component: UserPage,  // { data: User; params: { userId: string } }
  loader: () => fetchUser(),
});`}</code>
          </pre>
        </article>

        <article className="api-item">
          <h3>
            <code>LoaderArgs</code>
          </h3>
          <pre className="code-block">
            <code>{`interface LoaderArgs {
  params: Record<string, string>;
  request: Request;
  signal: AbortSignal;
}`}</code>
          </pre>
        </article>

        <article className="api-item">
          <h3>
            <code>Location</code>
          </h3>
          <pre className="code-block">
            <code>{`interface Location {
  pathname: string;
  search: string;
  hash: string;
}`}</code>
          </pre>
        </article>

        <article className="api-item">
          <h3>
            <code>NavigateOptions</code>
          </h3>
          <pre className="code-block">
            <code>{`interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}`}</code>
          </pre>
        </article>
      </section>
    </div>
  );
}
