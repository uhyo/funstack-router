"use client";

export function ApiReferenceIndexPage() {
  return (
    <div className="api-overview">
      <p>
        Complete API documentation for <code>@funstack/router</code>. Select a
        category above or browse below.
      </p>

      <section className="api-category">
        <h2>
          <a href="/funstack-router/api/components">Components</a>
        </h2>
        <p>Core components for building routing in your React application.</p>
        <ul>
          <li>
            <code>{"<Router>"}</code> — The main router component that provides
            routing context
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
            <code>useSearchParams()</code> — Search query management
          </li>
          <li>
            <code>useBlocker()</code> — Prevent navigation away from current
            route
          </li>
          <li>
            <code>useRouteParams()</code> — Type-safe route parameters
          </li>
          <li>
            <code>useRouteState()</code> — Type-safe navigation state
          </li>
          <li>
            <code>useRouteData()</code> — Type-safe loader data
          </li>
          <li>
            <code>useIsPending()</code> — Navigation transition pending state
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
            <code>route()</code> — Route definition helper with type inference
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
            <code>RouteComponentProps</code> — Props type for route components
          </li>
          <li>
            <code>RouteComponentPropsWithData</code> — Props type with loader
            data
          </li>
          <li>
            <code>PathParams</code> — Extract parameters from path patterns
          </li>
          <li>
            <code>TypefulOpaqueRouteDefinition</code> — Type-safe route
            definition
          </li>
          <li>
            <code>ExtractRouteId</code>, <code>ExtractRouteParams</code>,{" "}
            <code>ExtractRouteState</code>, <code>ExtractRouteData</code> — Type
            extraction utilities
          </li>
          <li>
            <code>RouteDefinition</code>, <code>LoaderArgs</code>,{" "}
            <code>Location</code>, <code>NavigateOptions</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
