import { CodeBlock } from "../components/CodeBlock.js";

export function LearnRscPage() {
  return (
    <div className="learn-content">
      <h2>React Server Components</h2>

      <p className="page-intro">
        FUNSTACK Router is designed to work with React Server Components (RSC).
        The package provides a dedicated server entry point so that route
        definitions can live in server modules, keeping client bundle sizes
        small.
      </p>

      <section>
        <h3>Why RSC Compatibility Matters</h3>
        <p>
          In an RSC architecture, the module graph is split into{" "}
          <strong>server modules</strong> and <strong>client modules</strong>.
          Server modules run at build time (or on the server) and are never sent
          to the browser. Client modules are marked with the{" "}
          <code>"use client"</code> directive and are included in the browser
          bundle.
        </p>
        <p>
          The main <code>@funstack/router</code> entry point is marked{" "}
          <code>"use client"</code> because it exports components and hooks that
          depend on browser APIs (the Navigation API, React context, etc.). This
          means importing from <code>@funstack/router</code> in a server module
          would pull the entire router into the client bundle &mdash; defeating
          the purpose of RSC.
        </p>
        <p>
          To solve this, the package provides a separate entry point:{" "}
          <code>@funstack/router/server</code>.
        </p>
      </section>

      <section>
        <h3>
          The <code>@funstack/router/server</code> Entry Point
        </h3>
        <p>
          The server entry point exports the <code>route()</code> and{" "}
          <code>routeState()</code> helper functions <em>without</em> the{" "}
          <code>"use client"</code> directive. This lets you define your route
          tree in a server module:
        </p>
        <CodeBlock language="tsx">{`// App.tsx — a Server Component (no "use client" directive)
import { Router } from "@funstack/router";
import { route } from "@funstack/router/server";

const routes = [
  route({
    path: "/",
    component: Layout,
    children: [
      route({ path: "/", component: HomePage }),
      route({ path: "/about", component: AboutPage }),
    ],
  }),
];

export default function App() {
  return <Router routes={routes} />;
}`}</CodeBlock>
        <p>
          In this example, <code>App</code> is a server component. It builds the
          route array using <code>route()</code> from{" "}
          <code>@funstack/router/server</code> and renders the{" "}
          <code>Router</code> component from <code>@funstack/router</code>.
          Since <code>Router</code> is a client component, the RSC bundler
          handles the client boundary automatically.
        </p>
        <h4>What the server entry point exports</h4>
        <ul>
          <li>
            <code>route</code> &mdash; Route definition helper (same API as the
            main entry point)
          </li>
          <li>
            <code>routeState</code> &mdash; Route definition helper with typed
            navigation state
          </li>
          <li>
            Types: <code>LoaderArgs</code>, <code>RouteDefinition</code>,{" "}
            <code>PathParams</code>, <code>RouteComponentProps</code>,{" "}
            <code>RouteComponentPropsWithData</code>
          </li>
        </ul>
      </section>

      <section>
        <h3>The Client Boundary</h3>
        <p>
          The <code>Router</code> component subscribes to the Navigation API and
          manages React state, so it is a client component. It serves as the
          client boundary in your component tree &mdash; server components above
          it construct the route definitions, while <code>Router</code> and its
          runtime dependencies run in the browser.
        </p>
        <p>
          Route definitions (paths, component references, children) are plain
          serializable data, so they can be passed from a server component into{" "}
          <code>Router</code> as props.
        </p>
      </section>

      <section>
        <h3>Defining Routes in the Server Context</h3>
        <p>
          Because route definitions are plain data (paths, component references,
          and children), they can be constructed entirely on the server. The{" "}
          <code>route()</code> helper from <code>@funstack/router/server</code>{" "}
          produces the same <code>RouteDefinition</code> objects as the one from
          the main entry point &mdash; the only difference is that it does not
          pull in client-side code.
        </p>
        <CodeBlock language="tsx">{`// App.tsx — Server Component
import { Router } from "@funstack/router";
import { route } from "@funstack/router/server";
import { lazy } from "react";

// Lazy-load page components — these will be code-split
const HomePage = lazy(() => import("./pages/HomePage.js"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.js"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.js"));

const routes = [
  route({
    component: <Layout />,
    children: [
      route({ path: "/", component: HomePage }),
      route({ path: "/dashboard", component: DashboardPage }),
      route({ path: "/settings", component: SettingsPage }),
    ],
  }),
];

export default function App() {
  return <Router routes={routes} />;
}`}</CodeBlock>
        <p>
          Note that page components referenced in route definitions can be
          either server components or client components. When a page component
          uses hooks or browser APIs, it should have the{" "}
          <code>"use client"</code> directive. Otherwise, it can remain a server
          component for optimal performance.
        </p>

        <h4>Loaders in an RSC Context</h4>
        <p>
          Loaders run client-side &mdash; they execute in the browser when a
          route is matched. This means a loader function cannot be defined
          inline within a server module. Instead, define the loader in a client
          module and import it:
        </p>
        <CodeBlock language="tsx">{`// loaders/dashboard.ts — a Client Module
"use client";

export async function dashboardLoader({ params }: LoaderArgs) {
  const res = await fetch(\`/api/dashboard/\${params.id}\`);
  return res.json();
}`}</CodeBlock>
        <CodeBlock language="tsx">{`// App.tsx — Server Component
import { Router } from "@funstack/router";
import { route } from "@funstack/router/server";
import { dashboardLoader } from "./loaders/dashboard.js";

const routes = [
  route({
    component: <Layout />,
    children: [
      route({ path: "/", component: HomePage }),
      route({
        path: "/dashboard/:id",
        component: DashboardPage,
        loader: dashboardLoader,
      }),
    ],
  }),
];

export default function App() {
  return <Router routes={routes} />;
}`}</CodeBlock>
        <p>
          By placing the loader in a <code>"use client"</code> module, it is
          included in the client bundle where it can access browser APIs. The
          server component imports the reference and passes it as part of the
          route definition.
        </p>
      </section>

      <section>
        <h3>A Complete Example</h3>
        <p>
          This documentation site itself uses this pattern. Here is a simplified
          version of how it is structured:
        </p>
        <CodeBlock language="tsx">{`// vite.config.ts
import funstackStatic from "@funstack/static";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    funstackStatic({
      root: "./src/Root.tsx",  // Server Component — HTML shell
      app: "./src/App.tsx",    // Server Component — route definitions
      ssr: true,
    }),
    react(),
  ],
});`}</CodeBlock>
        <CodeBlock language="tsx">{`// Root.tsx — Server Component (HTML shell)
import type { ReactNode } from "react";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <title>My App</title>
      </head>
      <body>{children}</body>
    </html>
  );
}`}</CodeBlock>
        <CodeBlock language="tsx">{`// App.tsx — Server Component (route definitions)
import { Router } from "@funstack/router";
import { route } from "@funstack/router/server";
import { Layout } from "./components/Layout.js";
import { HomePage } from "./pages/HomePage.js";
import { AboutPage } from "./pages/AboutPage.js";

const routes = [
  route({
    component: <Layout />,
    children: [
      route({ path: "/", component: HomePage }),
      route({ path: "/about", component: AboutPage }),
    ],
  }),
];

export default function App() {
  return <Router routes={routes} fallback="static" />;
}`}</CodeBlock>
        <p>
          In this setup, <code>Root</code> and <code>App</code> are server
          components. The route definitions are constructed on the server and
          passed into <code>Router</code>, which acts as the client boundary.
        </p>
        <p>
          If the server knows the requested pathname, you can pass it via the{" "}
          <code>ssrPathname</code> prop so that path-based routes render during
          SSR (see the{" "}
          <a href="/learn/static-site-generation">
            Static Site Generation guide
          </a>{" "}
          for details):
        </p>
        <CodeBlock language="tsx">{`export default function App({ pathname }: { pathname: string }) {
  return (
    <Router
      routes={routes}
      fallback="static"
      ssrPathname={pathname}
    />
  );
}`}</CodeBlock>
      </section>

      <section>
        <h3>Key Takeaways</h3>
        <ul>
          <li>
            Import <code>route</code> and <code>routeState</code> from{" "}
            <code>@funstack/router/server</code> in server modules to avoid
            pulling client code into the server module graph
          </li>
          <li>
            <code>Router</code> is a client component and serves as the client
            boundary &mdash; render it directly from your server component
          </li>
          <li>
            Route definitions are plain data and can be constructed entirely on
            the server
          </li>
          <li>
            Loaders run client-side &mdash; define them in{" "}
            <code>"use client"</code> modules and import them into your route
            definitions
          </li>
          <li>
            Page components can be either server components or client components
            depending on whether they need browser APIs or hooks
          </li>
          <li>
            See also the{" "}
            <a href="/learn/server-side-rendering">Server-Side Rendering</a>{" "}
            guide for how the router handles SSR and hydration
          </li>
        </ul>
      </section>
    </div>
  );
}
