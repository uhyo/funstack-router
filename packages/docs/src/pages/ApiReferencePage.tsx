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
          <p>Returns the route parameters as an object.</p>
          <pre className="code-block">
            <code>{`import { useParams } from "@funstack/router";

// For route: /users/:userId/posts/:postId

function PostPage() {
  const params = useParams();

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
            Helper function to define routes with proper typing. Returns the
            route definition object.
          </p>
          <pre className="code-block">
            <code>{`import { route } from "@funstack/router";

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
                <td>React component to render</td>
              </tr>
              <tr>
                <td>
                  <code>loader</code>
                </td>
                <td>
                  <code>(args: LoaderArgs) =&gt; Promise&lt;T&gt;</code>
                </td>
                <td>Async function to load data</td>
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
            <code>RouteDefinition</code>
          </h3>
          <pre className="code-block">
            <code>{`interface RouteDefinition<T = unknown> {
  path: string;
  component: ComponentType<{ data: T }>;
  loader?: (args: LoaderArgs) => Promise<T>;
  children?: RouteDefinition[];
}`}</code>
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
