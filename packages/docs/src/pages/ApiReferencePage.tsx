import { Outlet, useLocation } from "@funstack/router";

const apiNavItems = [
  { path: "/funstack-router/api/components", label: "Components" },
  { path: "/funstack-router/api/hooks", label: "Hooks" },
  { path: "/funstack-router/api/utilities", label: "Utilities" },
  { path: "/funstack-router/api/types", label: "Types" },
];

export function ApiReferencePage() {
  const location = useLocation();
  const isIndex = location.pathname === "/funstack-router/api";

  return (
    <div className="page docs-page api-page">
      <h1>API Reference</h1>

      <nav className="api-nav">
        {apiNavItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={location.pathname === item.path ? "active" : ""}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {isIndex ? (
        <div className="api-overview">
          <p>
            Complete API documentation for <code>@funstack/router</code>. Select
            a category above or browse below.
          </p>

          <section className="api-category">
            <h2>
              <a href="/funstack-router/api/components">Components</a>
            </h2>
            <p>
              Core components for building routing in your React application.
            </p>
            <ul>
              <li>
                <code>{"<Router>"}</code> — The main router component that
                provides routing context
              </li>
              <li>
                <code>{"<Outlet>"}</code> — Renders child route components for
                nested layouts
              </li>
            </ul>
          </section>

          <section className="api-category">
            <h2>
              <a href="/funstack-router/api/hooks">Hooks</a>
            </h2>
            <p>React hooks for accessing router state and navigation.</p>
            <ul>
              <li>
                <code>useNavigate()</code> — Programmatic navigation
              </li>
              <li>
                <code>useLocation()</code> — Current location object
              </li>
              <li>
                <code>useParams()</code> — Route parameters
              </li>
              <li>
                <code>useSearchParams()</code> — Search query management
              </li>
            </ul>
          </section>

          <section className="api-category">
            <h2>
              <a href="/funstack-router/api/utilities">Utilities</a>
            </h2>
            <p>Helper functions for defining routes and managing state.</p>
            <ul>
              <li>
                <code>route()</code> — Route definition helper with type
                inference
              </li>
              <li>
                <code>routeState()</code> — Typed navigation state management
              </li>
            </ul>
          </section>

          <section className="api-category">
            <h2>
              <a href="/funstack-router/api/types">Types</a>
            </h2>
            <p>TypeScript types and interfaces exported by the router.</p>
            <ul>
              <li>
                <code>RouteComponentProps</code> — Props type for route
                components
              </li>
              <li>
                <code>RouteComponentPropsWithData</code> — Props type with
                loader data
              </li>
              <li>
                <code>PathParams</code> — Extract parameters from path patterns
              </li>
              <li>
                <code>RouteDefinition</code> — Route definition type
              </li>
              <li>
                <code>LoaderArgs</code>, <code>Location</code>,{" "}
                <code>NavigateOptions</code>
              </li>
            </ul>
          </section>
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  );
}
