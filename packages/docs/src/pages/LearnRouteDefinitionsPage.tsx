import { CodeBlock } from "../components/CodeBlock.js";

export function LearnRouteDefinitionsPage() {
  return (
    <div className="learn-content">
      <h2>RSC with Route Features</h2>

      <p className="page-intro">
        When using React Server Components as route components, you may also
        want route features like loaders, typed hooks (
        <code>useRouteParams</code>, <code>useRouteData</code>), and navigation
        state. The challenge is that route definitions referencing server
        components cannot be imported from client modules. This guide shows how
        to split a route definition into a <strong>shared part</strong>{" "}
        (importable by client components for type safety) and a{" "}
        <strong>server part</strong> (where the component is attached), enabling
        full route features alongside RSC.
      </p>

      <section>
        <h3>The Problem</h3>
        <p>
          In an RSC architecture, server modules and client modules cannot
          freely import from each other. This creates a dilemma for type-safe
          routing:
        </p>
        <ul>
          <li>
            <strong>If routes live in a server module</strong> &mdash; they can
            reference server components, but client components cannot import the
            route objects for type-safe hooks like <code>useRouteParams</code>{" "}
            or <code>useRouteData</code>.
          </li>
          <li>
            <strong>If routes live in a shared module</strong> &mdash; client
            components can import them, but server components cannot be
            referenced (importing a server component makes a module
            server-only).
          </li>
        </ul>
        <p>
          There is no single location where route objects can both reference
          server components <em>and</em> be imported by client components.
        </p>
      </section>

      <section>
        <h3>The Key Insight</h3>
        <p>
          The only part of a route definition that is inherently server-specific
          is the <strong>component</strong> (because it may be a server
          component). Everything else &mdash; <code>id</code>, <code>path</code>
          , <code>loader</code>, <code>action</code>, and navigation state
          &mdash; is client-safe. Loaders and actions run in the browser during
          navigation, so they can live in shared modules.
        </p>
        <p>
          This means we can split a route definition at exactly one point: the
          component reference. FUNSTACK Router supports this split through
          partial route definitions and <code>bindRoute()</code>.
        </p>
      </section>

      <section>
        <h3>Step 1: Define the Route (Shared Module)</h3>
        <p>
          Call <code>route()</code> <strong>without</strong> a{" "}
          <code>component</code> property to create a partial route definition.
          This object carries all type information and is safe to import from
          client modules:
        </p>
        <CodeBlock language="typescript">{`// src/pages/user/loader.ts
"use client";
import type { User } from "../../types";

export async function loadUser({ params, signal }) {
  const res = await fetch(\`/api/users/\${params.userId}\`, { signal });
  return res.json() as Promise<User>;
}`}</CodeBlock>
        <CodeBlock language="typescript">{`// src/pages/user/route.ts — shared module (no "use client" directive)
import { route } from "@funstack/router/server";
import { loadUser } from "./loader";

export const userRoute = route({
  id: "user",
  path: "/:userId",
  loader: loadUser,
});
// Inferred types:
//   Params = { userId: string }  — from path
//   Data   = User                — from loader return type`}</CodeBlock>
        <p>
          The <code>id</code> property is required for partial routes &mdash; it
          is used at runtime to match the route context and at the type level to
          carry type information for hooks.
        </p>
      </section>

      <section>
        <h3>Step 2: Bind the Component (Server Module)</h3>
        <p>
          Use <code>bindRoute()</code> from <code>@funstack/router/server</code>{" "}
          to attach a component to the partial route. This produces a full route
          definition for <code>{"<Router />"}</code>:
        </p>
        <CodeBlock language="tsx">{`// src/App.tsx — Server Component
import { bindRoute } from "@funstack/router/server";
import { Router } from "@funstack/router";
import { userRoute } from "./pages/user/route";
import { UserProfile } from "./pages/user/UserProfile";

const routes = [
  bindRoute(userRoute, {
    component: <UserProfile />,
  }),
];

export default function App() {
  return <Router routes={routes} />;
}`}</CodeBlock>
        <p>
          Because <code>bindRoute()</code> lives in the server entry point, the
          component can be a server component. The resulting route definition is
          fully compatible with <code>{"<Router />"}</code> &mdash; it is the
          same type as what <code>route()</code> with a component produces.
        </p>
        <p>
          <code>bindRoute()</code> also accepts optional <code>children</code>,{" "}
          <code>exact</code>, and <code>requireChildren</code> properties in the
          second argument, just like the regular <code>route()</code> function.
        </p>
      </section>

      <section>
        <h3>Type-Safe Hooks in Client Components</h3>
        <p>
          The partial route object from Step 1 can be imported in client
          components and passed to hooks for full type safety:
        </p>
        <CodeBlock language="tsx">{`// src/pages/user/UserActions.tsx
"use client";
import { useRouteParams, useRouteData } from "@funstack/router";
import { userRoute } from "./route";

export function UserActions() {
  const { userId } = useRouteParams(userRoute);
  // userId: string ✓

  const user = useRouteData(userRoute);
  // user: User ✓

  return (
    <div>
      <h2>{user.name}</h2>
      <p>User ID: {userId}</p>
    </div>
  );
}`}</CodeBlock>
        <p>
          All typed hooks &mdash; <code>useRouteParams</code>,{" "}
          <code>useRouteData</code>, and <code>useRouteState</code> &mdash;
          accept both partial route definitions and full route definitions. The
          type information flows naturally from path patterns, loader return
          types, and <code>routeState</code>.
        </p>
      </section>

      <section>
        <h3>Navigation State</h3>
        <p>
          <code>routeState()</code> also supports partial route definitions.
          When called without a <code>component</code>, it produces a partial
          route carrying the state type:
        </p>
        <CodeBlock language="typescript">{`// src/pages/settings/route.ts — shared module
import { routeState } from "@funstack/router/server";

type SettingsState = { tab: string };

export const settingsRoute = routeState<SettingsState>()({
  id: "settings",
  path: "/settings",
});
// Params = {}, State = { tab: string }`}</CodeBlock>
        <CodeBlock language="tsx">{`// src/pages/settings/SettingsPanel.tsx
"use client";
import { useRouteState } from "@funstack/router";
import { settingsRoute } from "./route";

export function SettingsPanel() {
  const state = useRouteState(settingsRoute);
  // state: { tab: string } | undefined ✓
  // ...
}`}</CodeBlock>
      </section>

      <section>
        <h3>Nested Routes</h3>
        <p>
          Partial routes use relative path segments, the same as regular routes.
          Use <code>bindRoute()</code> with <code>children</code> to build
          nested route trees:
        </p>
        <CodeBlock language="typescript">{`// src/pages/users/route.ts
import { route } from "@funstack/router/server";
export const usersRoute = route({ id: "users", path: "/users" });

// src/pages/users/profile/route.ts
import { route } from "@funstack/router/server";
import { fetchUser } from "./fetchUser"; // "use client" module
export const userProfileRoute = route({
  id: "userProfile",
  path: "/:userId",       // relative to parent
  loader: fetchUser,
});

// src/pages/users/settings/route.ts
import { route } from "@funstack/router/server";
export const userSettingsRoute = route({
  id: "userSettings",
  path: "/:userId/settings",  // relative to parent
});`}</CodeBlock>
        <CodeBlock language="tsx">{`// src/App.tsx
const routes = [
  bindRoute(usersRoute, {
    component: <Outlet />,
    children: [
      bindRoute(userProfileRoute, {
        component: <UserProfile />,
      }),
      bindRoute(userSettingsRoute, {
        component: <UserSettings />,
      }),
    ],
  }),
];`}</CodeBlock>
        <p>
          For layout routes that don't need typed hooks, <code>id</code> is
          optional. A route without <code>id</code> can still be used with{" "}
          <code>bindRoute()</code>:
        </p>
        <CodeBlock language="typescript">{`import { route, bindRoute } from "@funstack/router/server";
const layout = route({ path: "/dashboard" });
bindRoute(layout, { component: <Outlet />, children: [...] });`}</CodeBlock>
      </section>

      <section>
        <h3>Recommended Project Structure</h3>
        <p>
          This pattern encourages <strong>collocating</strong> each route
          definition with the page components that use it:
        </p>
        <CodeBlock language="bash">{`src/
  pages/
    user/
      route.ts            ← Step 1: id, path (shared module)
      loader.ts           ← "use client" — loader function
      UserProfile.tsx     ← Server component (the page)
      UserActions.tsx     ← "use client" — imports ./route for hooks
    settings/
      route.ts            ← Step 1: id, path, routeState (shared module)
      Settings.tsx        ← Server component (the page)
      SettingsPanel.tsx   ← "use client" — imports ./route for hooks
  App.tsx                 ← Step 2: bindRoute() assembles route tree`}</CodeBlock>
        <p>This structure provides several benefits:</p>
        <ul>
          <li>
            <strong>Locality</strong> &mdash; The route definition sits next to
            the components that use it. Imports are short and obvious.
          </li>
          <li>
            <strong>Encapsulation</strong> &mdash; Each page "owns" its route.
            Adding a new page means adding a folder with a route and components,
            then one <code>bindRoute()</code> call in <code>App.tsx</code>.
          </li>
          <li>
            <strong>Local type safety</strong> &mdash; Path params and loader
            data types are defined once in <code>route.ts</code> and consumed by
            sibling client components. No separate type declarations needed.
          </li>
        </ul>
      </section>
    </div>
  );
}
