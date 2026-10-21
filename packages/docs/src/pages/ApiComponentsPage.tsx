import { CodeBlock } from "../components/CodeBlock.js";
import { PageHead } from "../components/PageHead.js";

export function ApiComponentsPage() {
  return (
    <div className="page docs-page api-page">
      <PageHead
        title="Components API"
        description="API reference for FUNSTACK Router components, including Router, RouteDisplay, and Outlet."
      />
      <h1>Components</h1>
      <p className="page-intro">Core components for building routing in your React application.</p>

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
        <div className="table-scroll">
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
                  Callback fired before navigation is intercepted. Receives the NavigateEvent and an
                  info object with matched routes and whether the router will intercept the
                  navigation.
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
                  Fallback mode when Navigation API is unavailable. <code>"none"</code> (default)
                  renders nothing; <code>"static"</code> renders matched routes using{" "}
                  <code>window.location</code> without navigation interception (MPA behavior).
                </td>
              </tr>
              <tr>
                <td>
                  <code>trailingSlash</code>
                </td>
                <td>
                  <code>{'"ignore" | "strict"'}</code>
                </td>
                <td>
                  How trailing slashes are treated during route matching. <code>"ignore"</code>{" "}
                  (default) ignores a single trailing slash on the pathname or on route{" "}
                  <code>path</code> patterns, so <code>/users/</code> matches{" "}
                  <code>path: "/users"</code>; the URL itself is never rewritten.{" "}
                  <code>"strict"</code> requires pathnames to match patterns exactly.
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
                  SSR configuration for route matching during server-side rendering. Accepts an
                  object with <code>path</code> (the pathname to match against) and an optional{" "}
                  <code>runLoaders</code> boolean (defaults to <code>false</code>
                  ). When <code>runLoaders</code> is <code>false</code>, routes with loaders are
                  skipped during SSR. Once the client hydrates, the real URL from the Navigation API
                  takes over. See the <a href="/learn/ssr">SSR guide</a> for details.
                </td>
              </tr>
              <tr>
                <td>
                  <code>transitionTypes</code>
                </td>
                <td>
                  <code>GetTransitionTypes</code>
                </td>
                <td>
                  Function returning the React transition types to attach to each navigation via{" "}
                  <code>addTransitionType</code> (React 19.3+). Receives the destination{" "}
                  <code>url</code> and <code>navigationType</code>; the returned types replace the
                  default <code>["navigation"]</code>. See the{" "}
                  <a href="/learn/transitions">Transitions guide</a> for details.
                </td>
              </tr>
              <tr>
                <td>
                  <code>features</code>
                </td>
                <td>
                  <code>RouterFeatures</code>
                </td>
                <td>
                  Opt-in feature flags that change the Router's behavior. Currently supports{" "}
                  <code>pathlessSSROutletDeferral</code>, which uses React's <code>browser()</code>{" "}
                  API (React 19.3+) to defer unmatched outlet content to the browser during pathless
                  SSR (this will become the default behavior in the next major version). See the{" "}
                  <a href="/learn/ssr">SSR guide</a> for details.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article className="api-item">
        <h3>
          <code>{"<RouteDisplay>"}</code>
        </h3>
        <p>
          Renders the routes matching the current URL, without client-side routing. Unlike{" "}
          <code>{"<Router>"}</code>, it does not intercept navigations: links and form submissions
          cause regular full page loads. Use it for multi-page applications (MPAs) where each page
          is a separate document but still uses route definitions to decide what to render. It works
          in all browsers, with or without the Navigation API.
        </p>
        <CodeBlock language="tsx">{`import { RouteDisplay } from "@funstack/router";

// Client: matches routes against the current page URL
<RouteDisplay routes={routes} />

// Server: matches routes against the given path
<RouteDisplay routes={routes} ssr={{ path: "/about", runLoaders: true }} />`}</CodeBlock>
        <p>
          Hooks that read the location (<code>useLocation</code>, <code>useSearchParams</code>,{" "}
          <code>useRouteParams</code>, <code>useRouteData</code>, etc.) work as usual. It follows
          the current location the same way as <code>{"<Router>"}</code>: when the Navigation API is
          available, the current entry's id, key and state are exposed (so route state works too),
          and same-document entry changes such as fragment navigations are rendered in a transition.
          Without the Navigation API, these values are <code>null</code> / <code>undefined</code>.
        </p>
        <p>
          Setters that navigate (such as the one from <code>useSearchParams</code>, or a route's{" "}
          <code>setState</code>) perform a full page navigation. With the Navigation API, the new
          entry keeps the given state; without it, the state is lost. <code>setStateSync</code>{" "}
          updates the current entry's state in place without navigating (Navigation API only).
          Features that depend on intercepting navigations are inert: <code>useBlocker</code> never
          blocks, and route actions are not run (forms submit to the server).
        </p>
        <h4>Props</h4>
        <div className="table-scroll">
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
                  <code>ssr</code>
                </td>
                <td>
                  <code>SSRConfig</code>
                </td>
                <td>
                  Same as <code>{"<Router>"}</code>'s <code>ssr</code> prop. Used only during SSR
                  and hydration; afterwards, the page URL from <code>window.location</code> takes
                  over.
                </td>
              </tr>
              <tr>
                <td>
                  <code>trailingSlash</code>
                </td>
                <td>
                  <code>{'"ignore" | "strict"'}</code>
                </td>
                <td>
                  Same as <code>{"<Router>"}</code>'s <code>trailingSlash</code> prop.
                </td>
              </tr>
              <tr>
                <td>
                  <code>features</code>
                </td>
                <td>
                  <code>RouterFeatures</code>
                </td>
                <td>
                  Same as <code>{"<Router>"}</code>'s <code>features</code> prop.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article className="api-item">
        <h3>
          <code>{"<Outlet>"}</code>
        </h3>
        <p>Renders the child route's component. Used in parent routes for nested layouts.</p>
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
