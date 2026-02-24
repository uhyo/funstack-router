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
          would fail.
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
          <code>Router</code> component from <code>@funstack/router</code> which
          is a client component.
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
        <h3>Defining Routes in the Server Context</h3>
        <p>
          Route definitions can be defined in server modules because they are{" "}
          <strong>plain data structures</strong> except for page components and
          loader functions. Fortunately, it is possible to import both of these
          from client modules which results in client references that can be
          passed from the server to the client through the <code>routes</code>{" "}
          prop.
        </p>
        <CodeBlock language="tsx">{`// App.tsx — Server Component
import { Router } from "@funstack/router";
import { route } from "@funstack/router/server";
import { lazy } from "react";

// Import page components from client modules
import HomePage from "./pages/HomePage.js";
import DashboardPage from "./pages/DashboardPage.js";
import SettingsPage from "./pages/SettingsPage.js";

const routes = [
  route({
    component: Layout,
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
    component: Layout,
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
        <h3>Using Server Components as Route Components</h3>
        <p>
          All examples so far have used client components as route components,
          but you can go even further and{" "}
          <strong>use server components as route components</strong>. Actually,
          this is the primary use case for the RSC support in FUNSTACK Router
          &mdash; it allows pre-rendering each route on the server (or at build
          time for static sites).
        </p>

        <h4>Use React Node as Route Components</h4>
        <p>
          When you use server components as route components, the route's{" "}
          <code>component</code> must be a React node (i.e.{" "}
          <code>&lt;MyComponent /&gt;</code>) instead of a component reference
          (i.e. <code>MyComponent</code>) because a references to server
          components cannot be passed to the client.
        </p>
        <CodeBlock language="tsx">{`// App.tsx — Server Component
import { Router } from "@funstack/router";
import { route } from "@funstack/router/server";
import HomePage from "./pages/HomePage.js";
import AboutPage from "./pages/AboutPage.js";

const routes = [
  route({
    component: <Layout />,
    children: [
      route({ path: "/", component: <HomePage /> }),
      route({ path: "/about", component: <AboutPage /> }),
    ],
  }),
];

export default function App() {
  return <Router routes={routes} />;
}`}</CodeBlock>
        <p>
          In this example, <code>HomePage</code> and <code>AboutPage</code> are
          server components. They are rendered on the server and the resulting
          HTML is sent to the client.
        </p>
        <p>
          Due to this nature, a route component defined as a server component{" "}
          <em>cannot</em> receive route props (params, search params, navigation
          state, etc). We are exploring ways to lift this limitation in the
          future, but for now if you need to access route props you will need to
          use client components as route components.
        </p>
        <p>
          For some use cases it is enough to have a client component child as a
          pathless route:
        </p>
        <CodeBlock language="tsx">{`const routes = [
  route({
    path: "/",
    component: <HomePage />, // Server Component
    children: [
      route({
        component: InteractivePartOfHomePage, // Client Component
        loader: someLoaderForHomePage,
      }),
    ],
  }),
];`}</CodeBlock>
        <p>
          In this example, <code>HomePage</code> is a server component that
          renders the static parts of the page while{" "}
          <code>InteractivePartOfHomePage</code> is a client component that can
          access route props (like loader data). <code>HomePage</code> can
          render <code>&lt;Outlet /&gt;</code> to render its child routes.
        </p>
      </section>

      <section>
        <h3>Key Takeaways</h3>
        <ul>
          <li>
            Import <code>route</code> and <code>routeState</code> from{" "}
            <code>@funstack/router/server</code> to define routes in server
            modules
          </li>
          <li>
            <code>Router</code> is a client component and serves as the client
            boundary &mdash; render it directly from your server component
          </li>
          <li>
            Loaders run client-side &mdash; define them in{" "}
            <code>"use client"</code> modules and import them into your route
            definitions
          </li>
          <li>
            Page components can be either server components or client
            components; if using server components, define them as React nodes
            (e.g. <code>&lt;MyPage /&gt;</code>) instead of component references
            (e.g. <code>MyPage</code>)
          </li>
          <li>
            See also the <a href="/learn/ssr">Server-Side Rendering</a> guide
            for how the router handles SSR and hydration
          </li>
          <li>
            For type-safe hooks in client components, see the{" "}
            <a href="/learn/route-definitions">Two-Phase Route Definitions</a>{" "}
            guide which explains how to split route definitions across the
            server/client boundary
          </li>
        </ul>
      </section>
    </div>
  );
}
