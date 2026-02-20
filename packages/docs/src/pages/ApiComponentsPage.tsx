import { CodeBlock } from "../components/CodeBlock.js";

export function ApiComponentsPage() {
  return (
    <div className="page docs-page api-page">
      <h1>Components</h1>
      <p className="page-intro">
        Core components for building routing in your React application.
      </p>

      <article className="api-item">
        <h3>
          <code>{"<Router>"}</code>
        </h3>
        <p>The main router component that provides routing context.</p>
        <CodeBlock language="tsx">{`import { Router } from "@funstack/router";

<Router
  routes={routes}
  onNavigate={(event, info) => {
    console.log("Navigating to:", event.destination.url);
    console.log("Matched routes:", info.matches);
    console.log("Will intercept:", info.intercepting);
  }}
/>`}</CodeBlock>
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
              <td>
                Callback fired before navigation is intercepted. Receives the
                NavigateEvent and an info object with matched routes and whether
                the router will intercept the navigation.
              </td>
            </tr>
            <tr>
              <td>
                <code>fallback</code>
              </td>
              <td>
                <code>{'"none" | "static"'}</code>
              </td>
              <td>
                Fallback mode when Navigation API is unavailable.{" "}
                <code>"none"</code> (default) renders nothing;{" "}
                <code>"static"</code> renders matched routes using{" "}
                <code>window.location</code> without navigation interception
                (MPA behavior).
              </td>
            </tr>
            <tr>
              <td>
                <code>ssr</code>
              </td>
              <td>
                <code>SSRConfig</code>
              </td>
              <td>
                SSR configuration for route matching during server-side
                rendering. Accepts an object with <code>path</code> (the
                pathname to match against) and an optional{" "}
                <code>runLoaders</code> boolean (defaults to <code>false</code>
                ). When <code>runLoaders</code> is <code>false</code>, routes
                with loaders are skipped during SSR. Once the client hydrates,
                the real URL from the Navigation API takes over. See the{" "}
                <a href="/learn/ssr">SSR guide</a> for details.
              </td>
            </tr>
          </tbody>
        </table>
      </article>

      <article className="api-item">
        <h3>
          <code>{"<Outlet>"}</code>
        </h3>
        <p>
          Renders the child route's component. Used in parent routes for nested
          layouts.
        </p>
        <CodeBlock language="tsx">{`import { Outlet } from "@funstack/router";

function Layout() {
  return (
    <div>
      <header>My App</header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}`}</CodeBlock>
      </article>
    </div>
  );
}
