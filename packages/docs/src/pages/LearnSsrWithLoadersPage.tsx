import { CodeBlock } from "../components/CodeBlock.js";

export function LearnSsrWithLoadersPage() {
  return (
    <div className="learn-content">
      <h2>SSR with Loaders</h2>

      <p className="page-intro">
        When you have a server runtime that can execute loaders at request time,
        set <code>runLoaders: true</code> in the <code>ssr</code> config to
        produce fully rendered HTML &mdash; including loader data &mdash; on the
        server.
      </p>

      <section>
        <h3>
          How <code>runLoaders</code> Works
        </h3>
        <p>
          As described in the{" "}
          <a href="/learn/ssr/static-site-generation">Static Site Generation</a>{" "}
          guide, the <code>ssr</code> prop enables path-based route matching
          during SSR. By default, routes with loaders are skipped. Setting{" "}
          <code>runLoaders: true</code> changes this: those routes are matched
          and their loaders execute during SSR.
        </p>
        <CodeBlock language="tsx">{`// Without runLoaders (default): loaders are skipped
<Router routes={routes} ssr={{ path: "/dashboard" }} />

// With runLoaders: loaders execute during SSR
<Router routes={routes} ssr={{ path: "/dashboard", runLoaders: true }} />`}</CodeBlock>
        <p>
          When loaders run during SSR, their results are passed to components as
          the <code>data</code> prop. The server-rendered HTML includes the
          loader content, so users see the full page immediately.
        </p>
        <CodeBlock language="tsx">{`// What renders at each stage with ssr + runLoaders:

// Stage 1 (Server)                   Stage 2 (Client)
// ───────────────────────────        ─────────────────
// App shell (pathless routes)        App shell (pathless)
// ✓ Path routes match                ✓ Path routes match
//   (against ssr.path)                 (against real URL)
// ✓ Loaders execute                  ✓ Loaders execute`}</CodeBlock>
      </section>

      <section>
        <h3>Example</h3>
        <p>Consider a dashboard route with a loader that fetches user data:</p>
        <CodeBlock language="tsx">{`const routes = [
  route({
    component: AppShell,
    children: [
      route({ path: "/", component: HomePage }),
      route({
        path: "/dashboard",
        component: DashboardPage,
        loader: dashboardLoader,
      }),
    ],
  }),
];

// Without runLoaders: DashboardPage is skipped during SSR.
// Users see only the app shell; dashboard content fills in after hydration.
<Router routes={routes} ssr={{ path: "/dashboard" }} />

// With runLoaders: dashboardLoader executes during SSR.
// DashboardPage renders with data — users see the full page immediately.
<Router routes={routes} ssr={{ path: "/dashboard", runLoaders: true }} />`}</CodeBlock>
      </section>

      <section>
        <h3>Server Setup</h3>
        <p>
          Unlike{" "}
          <a href="/learn/ssr/static-site-generation">static site generation</a>
          , SSR with loaders requires a server runtime that can handle requests
          and render pages dynamically. Your server needs to know the requested
          pathname and pass it to the router:
        </p>
        <CodeBlock language="tsx">{`// App.tsx — receives the pathname from the server
export default function App({ pathname }: { pathname: string }) {
  return (
    <Router
      routes={routes}
      fallback="static"
      ssr={{ path: pathname, runLoaders: true }}
    />
  );
}`}</CodeBlock>
        <p>
          Because loaders run during SSR, they must be able to execute in the
          server environment. If your loaders call browser-only APIs, you may
          need to adjust them or use environment checks.
        </p>
      </section>

      <section>
        <h3>
          Comparison with <code>ssr</code> (No Loaders)
        </h3>
        <p>
          The choice between <code>ssr</code> alone and{" "}
          <code>ssr + runLoaders</code> depends on your deployment model:
        </p>
        <ul>
          <li>
            <strong>
              <code>{"ssr={{ path }}"}</code>
            </strong>{" "}
            &mdash; Ideal for static site generation. Pages without loaders are
            fully pre-rendered. Pages with loaders show the app shell during SSR
            and fill in data after hydration. No server runtime needed.
          </li>
          <li>
            <strong>
              <code>{"ssr={{ path, runLoaders: true }}"}</code>
            </strong>{" "}
            &mdash; Ideal for dynamic SSR with a server runtime. All matched
            routes render during SSR, including those with loaders. Users see
            the complete page immediately.
          </li>
        </ul>
      </section>

      <section>
        <h3>Key Takeaways</h3>
        <ul>
          <li>
            Set <code>runLoaders: true</code> to execute loaders during SSR for
            fully rendered server output
          </li>
          <li>
            Loader results are passed to components as the <code>data</code>{" "}
            prop during SSR, just as they are on the client
          </li>
          <li>
            This mode requires a server runtime that handles requests
            dynamically
          </li>
          <li>
            After hydration, the real URL from the Navigation API takes over and{" "}
            <code>ssr</code> is ignored
          </li>
        </ul>
      </section>
    </div>
  );
}
