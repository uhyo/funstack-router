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
import { route } from "@funstack/router/server";
import { ClientApp } from "./ClientApp.js";

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
  return <ClientApp routes={routes} />;
}`}</CodeBlock>
        <p>
          In this example, <code>App</code> is a server component. It builds the
          route array on the server side and passes it to <code>ClientApp</code>
          , which renders the actual <code>Router</code>.
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
          The <code>Router</code> component is a client component &mdash; it
          subscribes to the Navigation API and manages React state. You need a
          thin client wrapper that receives the route definitions from the
          server and renders the router:
        </p>
        <CodeBlock language="tsx">{`// ClientApp.tsx — a Client Component
"use client";

import { Router, type RouteDefinition } from "@funstack/router";

export function ClientApp({ routes }: { routes: RouteDefinition[] }) {
  return <Router routes={routes} />;
}`}</CodeBlock>
        <p>
          This is the <code>"use client"</code> boundary. Everything above it
          (the route definitions, the page component imports) stays in the
          server module graph. The <code>Router</code> and its runtime
          dependencies are in the client bundle.
        </p>
      </section>

      <section>
        <h3>Defining Routes in the Server Context</h3>
        <p>
          Because route definitions are plain data (paths, component references,
          loaders, and children), they can be constructed entirely on the
          server. The <code>route()</code> helper from{" "}
          <code>@funstack/router/server</code> produces the same{" "}
          <code>RouteDefinition</code> objects as the one from the main entry
          point &mdash; the only difference is that it does not pull in
          client-side code.
        </p>
        <p>
          This means you can take advantage of server-only features when
          building your route tree:
        </p>
        <CodeBlock language="tsx">{`// App.tsx — Server Component
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
      route({
        path: "/dashboard",
        component: DashboardPage,
        loader: async ({ params }) => fetchDashboardData(),
      }),
      route({ path: "/settings", component: SettingsPage }),
    ],
  }),
];`}</CodeBlock>
        <p>
          Note that page components referenced in route definitions can be
          either server components or client components. When a page component
          uses hooks or browser APIs, it should have the{" "}
          <code>"use client"</code> directive. Otherwise, it can remain a server
          component for optimal performance.
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
import { route } from "@funstack/router/server";
import { ClientApp } from "./ClientApp.js";
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
  return <ClientApp routes={routes} />;
}`}</CodeBlock>
        <CodeBlock language="tsx">{`// ClientApp.tsx — Client Component (renders the Router)
"use client";

import { Router, type RouteDefinition } from "@funstack/router";

export function ClientApp({ routes }: { routes: RouteDefinition[] }) {
  return <Router routes={routes} fallback="static" />;
}`}</CodeBlock>
        <p>
          In this setup, <code>Root</code> and <code>App</code> are server
          components. The route definitions are constructed on the server and
          passed through the <code>"use client"</code> boundary into{" "}
          <code>ClientApp</code>, which renders the <code>Router</code>.
        </p>
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
            The <code>Router</code> component is a client component &mdash; wrap
            it in a thin <code>"use client"</code> module that receives routes
            as props
          </li>
          <li>
            Route definitions are plain data and can be constructed entirely on
            the server
          </li>
          <li>
            Page components can be either server components or client components
            depending on whether they need browser APIs or hooks
          </li>
          <li>
            See also the{" "}
            <a href="/funstack-router/learn/server-side-rendering">
              Server-Side Rendering
            </a>{" "}
            guide for how the router handles SSR and hydration
          </li>
        </ul>
      </section>
    </div>
  );
}
