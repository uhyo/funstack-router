"use client";

import { CodeBlock } from "../components/CodeBlock.js";

export function LearnSsrPage() {
  return (
    <div className="learn-content">
      <h2>Server-Side Rendering</h2>

      <p className="page-intro">
        FUNSTACK Router supports server-side rendering with a two-stage model.
        During SSR, pathless (layout) routes without loaders render to produce
        an app shell, while path-based routes and loaders activate only after
        client hydration.
      </p>

      <section>
        <h3>How SSR Works</h3>
        <p>
          FUNSTACK Router uses a two-stage rendering model that separates what
          renders on the server from what renders on the client:
        </p>
        <p>
          <strong>Stage 1 &mdash; Server:</strong> No URL is available on the
          server. The router matches only pathless routes (routes without a{" "}
          <code>path</code> property) that do not have a loader. Pathless routes
          with loaders are skipped because there is no request context to run
          them. This produces the app shell &mdash; layouts, headers, navigation
          chrome, and other structural markup.
        </p>
        <p>
          <strong>Stage 2 &mdash; Client hydration:</strong> Once the browser
          hydrates the page, the actual URL becomes available via the Navigation
          API. Path-based routes now match, loaders execute, and page-specific
          content renders.
        </p>
        <CodeBlock language="tsx">{`// What renders at each stage:

// Stage 1 (Server)         Stage 2 (Client)
// ─────────────────        ─────────────────
// App shell (pathless      App shell (pathless)
//   without loader)
// ✗ No path routes         ✓ Path routes match
// ✗ No loaders             ✓ Loaders execute
// ✗ No URL available       ✓ URL from Navigation API`}</CodeBlock>
      </section>

      <section>
        <h3>Pathless Routes as the App Shell</h3>
        <p>
          Pathless routes (routes without a <code>path</code> property) always
          match regardless of the current URL. This makes them ideal for
          defining the SSR app shell &mdash; the parts of your UI that should be
          visible immediately while the rest of the page loads.
        </p>
        <p>
          Consider the following route tree. During SSR, only the pathless{" "}
          <code>AppShell</code> route renders. The page routes require a URL to
          match, so they are skipped:
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
          In this example, <code>AppShell</code> might render a header, sidebar,
          and footer &mdash; the structural parts of your application. After
          hydration, the router matches the actual URL and renders{" "}
          <code>HomePage</code> or <code>AboutPage</code> inside the shell.
        </p>
      </section>

      <section>
        <h3>Hooks and SSR</h3>
        <p>
          Because no URL is available during SSR, hooks that depend on the
          current URL will throw errors if called during server rendering. The
          affected hooks are <code>useLocation</code> and{" "}
          <code>useSearchParams</code>.
        </p>
        <CodeBlock language="tsx">{`// These hooks throw during SSR:
useLocation();
// Error: "useLocation: URL is not available during SSR."

useSearchParams();
// Error: "useSearchParams: URL is not available during SSR."`}</CodeBlock>
        <p>
          To avoid these errors, either use URL-dependent hooks only in
          components rendered by path-based routes, or read the current path
          inside a client-side effect (e.g., <code>useLayoutEffect</code> +{" "}
          <code>navigation.currentEntry</code>) so the value is only accessed
          after hydration:
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
          The <code>fallback="static"</code> Mode
        </h3>
        <p>
          When the Navigation API is unavailable (e.g., in older browsers), the
          router's <code>fallback</code> prop controls what happens. With{" "}
          <code>fallback="static"</code>, the router reads the current URL from{" "}
          <code>window.location</code> and renders matched routes without
          navigation interception. Links cause full page reloads (MPA behavior).
        </p>
        <p>
          This is different from SSR: in static fallback mode, a URL <em>is</em>{" "}
          available (from <code>window.location</code>), so path-based routes
          match and loaders execute normally. During SSR, no URL is available at
          all.
        </p>
        <CodeBlock language="tsx">{`import { Router } from "@funstack/router";

// Static fallback: renders routes using window.location
// when Navigation API is unavailable
<Router routes={routes} fallback="static" />`}</CodeBlock>
      </section>

      <section>
        <h3>Key Takeaways</h3>
        <ul>
          <li>
            During SSR, only pathless routes without loaders render (no URL or
            request context is available on the server)
          </li>
          <li>
            Path-based routes, loaders, and pathless routes with loaders
            activate after client hydration
          </li>
          <li>
            Pathless routes are ideal for app shell markup (headers, footers,
            layout structure)
          </li>
          <li>
            Avoid <code>useLocation</code> and <code>useSearchParams</code> in
            components that render during SSR; use a client-side effect (e.g.,{" "}
            <code>useLayoutEffect</code>) to read location information in the
            app shell
          </li>
          <li>
            This two-stage model keeps SSR output lightweight while enabling
            full interactivity on the client
          </li>
        </ul>
      </section>
    </div>
  );
}
