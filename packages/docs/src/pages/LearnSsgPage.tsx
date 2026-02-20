import { CodeBlock } from "../components/CodeBlock.js";

export function LearnSsgPage() {
  return (
    <div className="learn-content">
      <h2>Static Site Generation</h2>

      <p className="page-intro">
        When your server or static site generator knows the URL being rendered,
        you can use the <code>ssr</code> prop to match path-based routes during
        SSR. This produces richer server-rendered HTML &mdash; users see page
        content immediately instead of just the app shell.
      </p>

      <section>
        <h3>
          How the <code>ssr</code> Prop Works
        </h3>
        <p>
          As described in the <a href="/learn/ssr">How SSR Works</a> guide, the
          router normally has no URL during SSR and only renders pathless
          routes. The <code>ssr</code> prop provides a pathname so path-based
          routes can also match during SSR:
        </p>
        <CodeBlock language="tsx">{`// Server knows the requested URL and passes it to the router
<Router routes={routes} ssr={{ path: "/about" }} />`}</CodeBlock>
        <p>
          When <code>ssr</code> is provided, the router matches path-based
          routes against <code>ssr.path</code> just as it would match against
          the real URL on the client. Route params are extracted normally.
          Routes with loaders are skipped by default &mdash; the parent route
          renders as a shell, and loader content fills in after hydration.
        </p>
        <p>
          Once the client hydrates, the real URL from the Navigation API takes
          over and <code>ssr</code> is ignored.
        </p>
        <CodeBlock language="tsx">{`// What renders at each stage with ssr:

// Stage 1 (Server)                   Stage 2 (Client)
// ───────────────────────────        ─────────────────
// App shell (pathless routes)        App shell (pathless)
// ✓ Path routes match                ✓ Path routes match
//   (against ssr.path)                 (against real URL)
// ✗ No loaders                       ✓ Loaders execute`}</CodeBlock>
      </section>

      <section>
        <h3>Example</h3>
        <p>
          Consider a route tree with a mix of static pages and loader-based
          routes:
        </p>
        <CodeBlock language="tsx">{`const routes = [
  route({
    component: AppShell,
    children: [
      route({ path: "/", component: HomePage }),      // Matches ssr.path="/"
      route({ path: "/about", component: AboutPage }),// Matches ssr.path="/about"
      route({
        path: "/dashboard",
        component: DashboardPage,
        loader: dashboardLoader, // Skipped during SSR (has loader)
      }),
    ],
  }),
];

// With ssr={{ path: "/about" }}:
// - AppShell renders (pathless, no loader) ✓
// - AboutPage renders (path matches, no loader) ✓
// - DashboardPage would NOT render with ssr={{ path: "/dashboard" }}
//   because it has a loader`}</CodeBlock>
      </section>

      <section>
        <h3>
          When to Use <code>ssr</code>
        </h3>
        <p>
          Use the <code>ssr</code> prop when your server or static site
          generator knows the URL being rendered and you want to include
          page-specific content in the SSR output. This is particularly useful
          for:
        </p>
        <ul>
          <li>
            Improving perceived performance by showing page content immediately
            instead of a blank shell
          </li>
          <li>
            SEO &mdash; search engine crawlers see the full page content rather
            than just the app shell
          </li>
          <li>
            Static site generation where each page is pre-rendered at a known
            path
          </li>
        </ul>
      </section>

      <section>
        <h3>Routes with Loaders</h3>
        <p>
          Routes with loaders are skipped by default during SSR. If your
          application has a server runtime that can execute loaders at request
          time, see the <a href="/learn/ssr/with-loaders">SSR with Loaders</a>{" "}
          guide.
        </p>
      </section>

      <section>
        <h3>Key Takeaways</h3>
        <ul>
          <li>
            Use <code>ssr</code> to enable path-based route matching during SSR
            for richer server-rendered output
          </li>
          <li>
            Routes with loaders are skipped during SSR by default; the parent
            route renders as a shell and loader content fills in after hydration
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
