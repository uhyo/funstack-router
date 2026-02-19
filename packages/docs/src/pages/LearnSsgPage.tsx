import { CodeBlock } from "../components/CodeBlock.js";

export function LearnSsgPage() {
  return (
    <div className="learn-content">
      <h2>Static Site Generation</h2>

      <p className="page-intro">
        When your server or static site generator knows the URL being rendered,
        you can use the <code>ssrPathname</code> prop to match path-based routes
        during SSR. This produces richer server-rendered HTML &mdash; users see
        page content immediately instead of just the app shell.
      </p>

      <section>
        <h3>
          How <code>ssrPathname</code> Works
        </h3>
        <p>
          As described in the{" "}
          <a href="/learn/server-side-rendering">Server-Side Rendering</a>{" "}
          guide, the router normally has no URL during SSR and only renders
          pathless routes. The <code>ssrPathname</code> prop provides a pathname
          so path-based routes can also match during SSR:
        </p>
        <CodeBlock language="tsx">{`// Server knows the requested URL and passes it to the router
<Router routes={routes} ssrPathname="/about" />`}</CodeBlock>
        <p>
          When <code>ssrPathname</code> is provided, the router matches
          path-based routes against it just as it would match against the real
          URL on the client. Route params are extracted normally. However,
          routes with loaders are always skipped during SSR regardless of this
          setting &mdash; there is no request context available to run them.
        </p>
        <p>
          Once the client hydrates, the real URL from the Navigation API takes
          over and <code>ssrPathname</code> is ignored.
        </p>
        <CodeBlock language="tsx">{`// What renders at each stage with ssrPathname:

// Stage 1 (Server)                   Stage 2 (Client)
// ───────────────────────────        ─────────────────
// App shell (pathless routes)        App shell (pathless)
// ✓ Path routes match                ✓ Path routes match
//   (against ssrPathname)              (against real URL)
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
      route({ path: "/", component: HomePage }),      // Matches ssrPathname="/"
      route({ path: "/about", component: AboutPage }),// Matches ssrPathname="/about"
      route({
        path: "/dashboard",
        component: DashboardPage,
        loader: dashboardLoader, // Skipped during SSR (has loader)
      }),
    ],
  }),
];

// With ssrPathname="/about":
// - AppShell renders (pathless, no loader) ✓
// - AboutPage renders (path matches, no loader) ✓
// - DashboardPage would NOT render even with ssrPathname="/dashboard"
//   because it has a loader`}</CodeBlock>
      </section>

      <section>
        <h3>
          When to Use <code>ssrPathname</code>
        </h3>
        <p>
          Use <code>ssrPathname</code> when your server or static site generator
          knows the URL being rendered and you want to include page-specific
          content in the SSR output. This is particularly useful for:
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
        <p>
          If your routes have loaders, those routes will still be skipped during
          SSR. The parent route renders as a shell, and the loader content fills
          in after hydration.
        </p>
      </section>

      <section>
        <h3>Key Takeaways</h3>
        <ul>
          <li>
            Use <code>ssrPathname</code> to enable path-based route matching
            during SSR for richer server-rendered output
          </li>
          <li>
            Routes with loaders are always skipped during SSR, regardless of{" "}
            <code>ssrPathname</code>
          </li>
          <li>
            After hydration, the real URL from the Navigation API takes over and{" "}
            <code>ssrPathname</code> is ignored
          </li>
        </ul>
      </section>
    </div>
  );
}
