import { CodeBlock } from "../components/CodeBlock";

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
  onNavigate={(location) => {
    console.log("Navigated to:", location.pathname);
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
