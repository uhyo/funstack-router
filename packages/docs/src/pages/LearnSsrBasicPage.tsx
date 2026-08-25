import { CodeBlock } from "../components/CodeBlock.js";
import { PageHead } from "../components/PageHead.js";

export function LearnSsrBasicPage() {
  return (
    <div className="learn-content">
      <PageHead
        title="Server-Side Rendering"
        description="FUNSTACK Router's two-stage SSR model: pathless layout routes render an app shell on the server, while path-based routes and loaders activate after client hydration."
      />
      <h2>How SSR Works</h2>

      <p className="page-intro">
        FUNSTACK Router supports server-side rendering with a two-stage model. During SSR, pathless
        (layout) routes without loaders render to produce an app shell, while path-based routes and
        loaders activate only after client hydration.
      </p>

      <section>
        <h3>Two-Stage Rendering</h3>
        <p>
          FUNSTACK Router uses a two-stage rendering model that separates what renders on the server
          from what renders on the client:
        </p>
        <p>
          <strong>Stage 1 &mdash; Server:</strong> No URL is available on the server. The router
          matches only pathless routes (routes without a <code>path</code> property) that do not
          have a loader. This produces the app shell &mdash; layouts, headers, navigation chrome,
          and other structural markup.
        </p>
        <p>
          <strong>Stage 2 &mdash; Client hydration:</strong> Once the browser hydrates the page, the
          actual URL becomes available via the Navigation API. Path-based routes now match, loaders
          execute, and page-specific content renders.
        </p>
        <CodeBlock language="tsx">{`// What renders at each stage:

// Stage 1 (Server)                   Stage 2 (Client)
// ───────────────────────────        ─────────────────
// App shell (pathless routes)        App shell (pathless)
//                                    ✓ Path routes match
// ✗ No loaders                       ✓ Loaders execute
// ✗ No URL available                 ✓ URL from Navigation API`}</CodeBlock>
      </section>

      <section>
        <h3>Pathless Routes as the App Shell</h3>
        <p>
          Pathless routes (routes without a <code>path</code> property) always match regardless of
          the current URL. This makes them ideal for defining the SSR app shell &mdash; the parts of
          your UI that should be visible immediately while the rest of the page loads.
        </p>
        <p>
          Consider the following route tree. During SSR, only the pathless <code>AppShell</code>{" "}
          route renders. The page routes require a URL to match, so they are skipped:
        </p>
        <CodeBlock language="tsx">{`const routes = [
  route({
    component: AppShell, // Pathless — renders during SSR ✓
    children: [
      route({ path: "/", component: HomePage }),   // Has path — skipped during SSR
      route({ path: "/about", component: AboutPage }), // Has path — skipped during SSR
    ],
  }),
];`}</CodeBlock>
        <p>
          In this example, <code>AppShell</code> might render a header, sidebar, and footer &mdash;
          the structural parts of your application. After hydration, the router matches the actual
          URL and renders <code>HomePage</code> or <code>AboutPage</code> inside the shell.
        </p>
      </section>

      <section>
        <h3>Hooks and SSR</h3>
        <p>
          Because no URL is available during SSR, hooks that depend on the current URL will throw
          errors if called during server rendering. The affected hooks are <code>useLocation</code>{" "}
          and <code>useSearchParams</code>.
        </p>
        <CodeBlock language="tsx">{`// These hooks throw during SSR:
useLocation();
// Error: "useLocation: URL is not available during SSR."

useSearchParams();
// Error: "useSearchParams: URL is not available during SSR."`}</CodeBlock>
        <p>
          To avoid these errors, either use URL-dependent hooks only in components rendered by
          path-based routes, or read the current path inside a client-side effect (e.g.,{" "}
          <code>useLayoutEffect</code> + <code>navigation.currentEntry</code>) so the value is only
          accessed after hydration:
        </p>
        <CodeBlock language="tsx">{`// ✗ Bad: AppShell renders during SSR, useLocation will throw
function AppShell() {
  const location = useLocation(); // Throws during SSR!
  return <div>{/* ... */}</div>;
}

// ✓ Good: Read the path in a client-side effect
function useCurrentPath() {
  const [path, setPath] = useState<string | undefined>(undefined);
  useLayoutEffect(() => {
    setPath(navigation.currentEntry?.url
      ? new URL(navigation.currentEntry.url).pathname
      : undefined);
  }, []);
  return path;
}

function AppShell() {
  const path = useCurrentPath(); // undefined during SSR, string after hydration
  const isActive = (p: string) => path === p;
  return <nav>{/* ... */}</nav>;
}

// ✓ Good: HomePage only renders after hydration (has a path)
function HomePage() {
  const location = useLocation(); // Safe — URL is available
  return <div>Current path: {location.pathname}</div>;
}`}</CodeBlock>
      </section>

      <section>
        <h3>
          Deferring Outlet Content with <code>pathlessSSROutletDeferral</code>
        </h3>
        <p>
          During pathless SSR, an <code>{"<Outlet />"}</code> whose child routes are all path-based
          renders <code>null</code> on the server, while the same outlet renders content in the
          browser. React Canary's{" "}
          <a href="https://react.dev/reference/react-dom/browser">
            <code>browser()</code>
          </a>{" "}
          API offers a cleaner way to express this: the <code>pathlessSSROutletDeferral</code>{" "}
          feature flag makes such outlets call <code>use(browser())</code> instead, suspending
          server rendering at the nearest <code>{"<Suspense>"}</code> boundary and deferring the
          outlet content to the browser.
        </p>
        <CodeBlock language="tsx">{`// Opt in via the Router's features prop:
<Router routes={routes} features={{ pathlessSSROutletDeferral: true }} />

// Each outlet that can be unmatched during pathless SSR
// must be wrapped in a Suspense boundary:
function AppShell() {
  return (
    <div>
      <header>My App</header>
      <main>
        <Suspense fallback={<p>Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}`}</CodeBlock>
        <p>
          The server-rendered HTML then contains the Suspense fallback in place of the outlet, and
          the browser renders the matched route content there after hydration &mdash; without
          hydration mismatches.
        </p>
        <p>
          This feature requires a React build that exports <code>browser</code> from{" "}
          <code>react-dom</code> (currently React Canary). On builds without the API, enabling the
          flag throws an error when the Router renders.
        </p>
        <p>
          <code>pathlessSSROutletDeferral</code> is opt-in in the current major version and will
          become the default behavior in the next major version of FUNSTACK Router.
        </p>
      </section>

      <section>
        <h3>
          The <code>fallback="static"</code> Mode
        </h3>
        <p>
          When the Navigation API is unavailable (e.g., in older browsers), the router's{" "}
          <code>fallback</code> prop controls what happens. With <code>fallback="static"</code>, the
          router reads the current URL from <code>window.location</code> and renders matched routes
          without navigation interception. Links cause full page reloads (MPA behavior).
        </p>
        <p>
          This is different from SSR: in static fallback mode, a URL <em>is</em> available (from{" "}
          <code>window.location</code>), so path-based routes match and loaders execute normally.
          During SSR, no URL is available at all.
        </p>
        <CodeBlock language="tsx">{`import { Router } from "@funstack/router";

// Static fallback: renders routes using window.location
// when Navigation API is unavailable
<Router routes={routes} fallback="static" />`}</CodeBlock>
      </section>

      <section>
        <h3>Going Beyond the App Shell</h3>
        <p>
          The default SSR behavior produces only the app shell. This is perfect for ordinary SPAs
          where only one HTML page is served and the client takes over all routing. SSR can still be
          useful in this scenario, normally with a static site generator, to improve perceived
          performance by showing the shell immediately while the rest of the page loads.
        </p>
        <p>
          If your server or build tool knows the URL being rendered, you can use the{" "}
          <code>ssr</code> prop to match path-based routes during SSR for richer output:
        </p>
        <ul>
          <li>
            <a href="/learn/ssr/static-site-generation">Static Site Generation</a> &mdash;
            pre-render pages at known paths without running loaders
          </li>
          <li>
            <a href="/learn/ssr/with-loaders">SSR with Loaders</a> &mdash; render pages with loader
            data on the server for fully dynamic SSR
          </li>
        </ul>
      </section>

      <section>
        <h3>Key Takeaways</h3>
        <ul>
          <li>
            Only pathless routes without loaders render during SSR (no URL is available on the
            server)
          </li>
          <li>
            Pathless routes are ideal for app shell markup (headers, footers, layout structure)
          </li>
          <li>
            Avoid <code>useLocation</code> and <code>useSearchParams</code> in components that
            render during SSR; use a client-side effect (e.g., <code>useLayoutEffect</code>) to read
            location information in the app shell
          </li>
          <li>Once the client hydrates, the real URL from the Navigation API takes over</li>
        </ul>
      </section>
    </div>
  );
}
