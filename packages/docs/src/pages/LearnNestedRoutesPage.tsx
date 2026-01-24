import { CodeBlock } from "../components/CodeBlock.js";

export function LearnNestedRoutesPage() {
  return (
    <div className="learn-content">
      <h2>Nested Routes</h2>

      <p className="page-intro">
        <b>Nested routes</b> let you build complex page layouts where parts of
        the UI persist across navigation while other parts change. Think of a
        dashboard with a sidebar that stays in place while the main content area
        updates&mdash;that's nested routing in action.
      </p>

      <section>
        <h3>Why Nested Routes?</h3>
        <p>
          Consider a typical dashboard application. You have a header, a
          sidebar, and a main content area. When users navigate between
          different dashboard pages, the header and sidebar should remain
          visible while only the main content changes.
        </p>
        <p>Without nested routes, you'd have two options:</p>
        <ul>
          <li>
            <strong>Duplicate the layout</strong> in every page component,
            leading to repetition and maintenance headaches
          </li>
          <li>
            <strong>Use conditional rendering</strong> based on the current
            route, which quickly becomes complex and hard to manage
          </li>
        </ul>
        <p>
          Nested routes solve this elegantly by letting you compose layouts
          hierarchically. Parent routes define the persistent UI, and child
          routes fill in the changing parts.
        </p>
      </section>

      <section>
        <h3>The Outlet Component</h3>
        <p>
          The key to nested routing is the <code>{"<Outlet>"}</code> component.
          It acts as a placeholder in a parent route's component where child
          routes will be rendered.
        </p>
        <CodeBlock language="tsx">{`import { Outlet } from "@funstack/router";

function DashboardLayout() {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <nav>
          <a href="/dashboard">Overview</a>
          <a href="/dashboard/analytics">Analytics</a>
          <a href="/dashboard/settings">Settings</a>
        </nav>
      </aside>
      <main className="content">
        {/* Child routes render here */}
        <Outlet />
      </main>
    </div>
  );
}`}</CodeBlock>
        <p>
          When you navigate to <code>/dashboard/analytics</code>, the{" "}
          <code>DashboardLayout</code> component renders the sidebar, and the{" "}
          <code>{"<Outlet>"}</code> renders the Analytics page component.
        </p>
      </section>

      <section>
        <h3>Defining Nested Routes</h3>
        <p>
          Nested routes are defined using the <code>children</code> property in
          your route definitions. Each child route's path is{" "}
          <strong>relative to its parent</strong>.
        </p>
        <CodeBlock language="tsx">{`import { route } from "@funstack/router";

const routes = [
  route({
    path: "/dashboard",
    component: DashboardLayout,
    children: [
      // Matches "/dashboard" exactly
      route({
        path: "/",
        component: DashboardOverview,
      }),
      // Matches "/dashboard/analytics"
      route({
        path: "/analytics",
        component: AnalyticsPage,
      }),
      // Matches "/dashboard/settings"
      route({
        path: "/settings",
        component: SettingsPage,
      }),
    ],
  }),
];`}</CodeBlock>
        <p>
          Notice how child paths start with <code>/</code> but are relative to
          the parent. The path <code>/analytics</code> under a parent with path{" "}
          <code>/dashboard</code> matches the full URL{" "}
          <code>/dashboard/analytics</code>.
        </p>
      </section>

      <section>
        <h3>Route Matching Behavior</h3>
        <p>
          Understanding how routes match URLs is crucial for nested routing. The
          router uses different matching strategies depending on whether a route
          has children.
        </p>

        <h4>Parent Routes: Prefix Matching</h4>
        <p>
          Routes with <code>children</code> use <strong>prefix matching</strong>
          . They match any URL that starts with their path, allowing child
          routes to match the remaining portion.
        </p>
        <CodeBlock language="tsx">{`route({
  path: "/dashboard",  // Matches "/dashboard", "/dashboard/settings", etc.
  component: DashboardLayout,
  children: [
    // Children handle the rest of the URL
  ],
})`}</CodeBlock>
        <p>
          When you navigate to <code>/dashboard/settings/profile</code>, the
          parent route <code>/dashboard</code> matches and consumes that portion
          of the URL. The remaining <code>/settings/profile</code> is then
          matched against its children.
        </p>

        <h4>Leaf Routes: Exact Matching</h4>
        <p>
          Routes without <code>children</code> (leaf routes) use{" "}
          <strong>exact matching</strong> by default. They only match when the
          URL exactly matches their full path.
        </p>
        <CodeBlock language="tsx">{`route({
  path: "/dashboard",
  component: DashboardLayout,
  children: [
    route({
      path: "/settings",  // Only matches "/dashboard/settings" exactly
      component: SettingsPage,
    }),
  ],
})`}</CodeBlock>
        <p>
          With this configuration, <code>/dashboard/settings</code> matches, but{" "}
          <code>/dashboard/settings/advanced</code> does not&mdash;there's no
          child route to handle <code>/advanced</code>.
        </p>

        <h4>The Index Route Pattern</h4>
        <p>
          A common pattern is using <code>path: "/"</code> as an index route.
          This matches when the parent's path is matched exactly with no
          additional segments.
        </p>
        <CodeBlock language="tsx">{`route({
  path: "/dashboard",
  component: DashboardLayout,
  children: [
    route({
      path: "/",  // Matches "/dashboard" exactly
      component: DashboardHome,
    }),
    route({
      path: "/settings",  // Matches "/dashboard/settings"
      component: SettingsPage,
    }),
  ],
})`}</CodeBlock>
        <p>
          Here, navigating to <code>/dashboard</code> renders{" "}
          <code>DashboardLayout</code> with <code>DashboardHome</code> in its
          outlet. Navigating to <code>/dashboard/settings</code> renders{" "}
          <code>DashboardLayout</code> with <code>SettingsPage</code> instead.
        </p>

        <h4>Forcing Exact Matching</h4>
        <p>
          Sometimes you want a parent route to only match its exact path, not
          act as a prefix. Use the <code>exact</code> option:
        </p>
        <CodeBlock language="tsx">{`route({
  path: "/blog",
  exact: true,  // Only matches "/blog", not "/blog/post-1"
  component: BlogIndex,
  children: [
    route({
      path: "/:slug",  // This won't match because parent requires exact
      component: BlogPost,
    }),
  ],
})`}</CodeBlock>
        <p>
          With <code>exact: true</code>, the route only matches when the URL is
          exactly <code>/blog</code>. URLs like <code>/blog/post-1</code> won't
          match this route at all. This is rarely needed but useful when you
          want a route to behave as a leaf even though it has children defined.
        </p>

        <h4>Requiring Children to Match</h4>
        <p>
          By default, parent routes <strong>require</strong> at least one child
          route to match. If no children match, the parent doesn't match
          either&mdash;allowing other routes (like a catch-all) to handle the
          URL instead.
        </p>
        <CodeBlock language="tsx">{`const routes = [
  route({
    path: "/dashboard",
    component: DashboardLayout,
    children: [
      route({ path: "/", component: DashboardHome }),
      route({ path: "/settings", component: SettingsPage }),
    ],
  }),
  route({
    path: "/*",  // Catch-all for unmatched routes
    component: NotFoundPage,
  }),
];

// /dashboard → matches DashboardLayout + DashboardHome
// /dashboard/settings → matches DashboardLayout + SettingsPage
// /dashboard/unknown → matches NotFoundPage (not DashboardLayout)`}</CodeBlock>
        <p>
          This behavior ensures that catch-all routes work intuitively. Without
          it, <code>/dashboard/unknown</code> would match the dashboard layout
          with an empty outlet, which is usually not desired.
        </p>
        <p>
          If you want a parent route to match even when no children match, set{" "}
          <code>requireChildren: false</code>. The <code>{"<Outlet>"}</code>{" "}
          will render <code>null</code> in this case.
        </p>
        <CodeBlock language="tsx">{`route({
  path: "/files",
  component: FileExplorer,
  requireChildren: false,  // Match even without child matches
  children: [
    route({ path: "/:fileId", component: FileDetails }),
  ],
});

// /files → matches FileExplorer (outlet is null)
// /files/123 → matches FileExplorer + FileDetails`}</CodeBlock>
      </section>

      <section>
        <h3>Multiple Levels of Nesting</h3>
        <p>
          You can nest routes as deeply as your application requires. Each level
          can have its own layout component with an <code>{"<Outlet>"}</code>.
        </p>
        <CodeBlock language="tsx">{`const routes = [
  route({
    path: "/",
    component: RootLayout,  // Header, footer
    children: [
      route({
        path: "/",
        component: HomePage,
      }),
      route({
        path: "/dashboard",
        component: DashboardLayout,  // Adds sidebar
        children: [
          route({
            path: "/",
            component: DashboardHome,
          }),
          route({
            path: "/settings",
            component: SettingsLayout,  // Adds settings tabs
            children: [
              route({
                path: "/",
                component: GeneralSettings,
              }),
              route({
                path: "/security",
                component: SecuritySettings,
              }),
              route({
                path: "/notifications",
                component: NotificationSettings,
              }),
            ],
          }),
        ],
      }),
    ],
  }),
];`}</CodeBlock>
        <p>
          When you navigate to <code>/dashboard/settings/security</code>, the
          rendering stack looks like:
        </p>
        <ol>
          <li>
            <code>RootLayout</code> renders the header and footer with an{" "}
            <code>{"<Outlet>"}</code>
          </li>
          <li>
            <code>DashboardLayout</code> renders the sidebar with an{" "}
            <code>{"<Outlet>"}</code>
          </li>
          <li>
            <code>SettingsLayout</code> renders the settings tabs with an{" "}
            <code>{"<Outlet>"}</code>
          </li>
          <li>
            <code>SecuritySettings</code> renders the actual page content
          </li>
        </ol>
      </section>

      <section>
        <h3>Sharing Data with Loaders</h3>
        <p>
          Parent routes can load data that child routes need. This is
          particularly useful for loading user information, permissions, or
          other shared data once at the parent level.
        </p>
        <CodeBlock language="tsx">{`import { use, Suspense } from "react";
import { route, Outlet, useRouteData } from "@funstack/router";

// Define the parent route with a loader
const teamRoute = route({
  id: "team",
  path: "/teams/:teamId",
  component: TeamLayout,
  loader: async ({ params }) => {
    const response = await fetch(\`/api/teams/\${params.teamId}\`);
    return response.json();
  },
});

// Parent layout loads team data once
function TeamLayoutContent({
  data,
}: {
  data: Promise<{ name: string; members: string[] }>;
}) {
  const team = use(data);
  return (
    <div>
      <h1>{team.name}</h1>
      <nav>
        <a href="members">Members ({team.members.length})</a>
        <a href="settings">Settings</a>
      </nav>
      <Outlet />
    </div>
  );
}

function TeamLayout(props: {
  data: Promise<{ name: string; members: string[] }>;
}) {
  return (
    <Suspense fallback={<div>Loading team...</div>}>
      <TeamLayoutContent {...props} />
    </Suspense>
  );
}`}</CodeBlock>
        <p>
          Child routes can access the parent's loaded data using the{" "}
          <code>useRouteData</code> hook with the parent's route ID:
        </p>
        <CodeBlock language="tsx">{`function TeamMembers() {
  // Access parent route's data by route ID
  const teamData = useRouteData(teamRoute);
  const team = use(teamData);

  return (
    <ul>
      {team.members.map((member) => (
        <li key={member}>{member}</li>
      ))}
    </ul>
  );
}`}</CodeBlock>
      </section>

      <section>
        <h3>Layout Routes Without Paths</h3>
        <p>
          Sometimes you want to wrap a group of routes in a layout without
          adding a path segment. These are called <b>pathless routes</b>
          &mdash;routes that provide UI structure without affecting the URL.
        </p>
        <CodeBlock language="tsx">{`const routes = [
  route({
    path: "/",
    component: RootLayout,
    children: [
      route({ path: "/", component: HomePage }),
      route({ path: "/about", component: AboutPage }),

      // Pathless route - doesn't add to the URL
      route({
        component: AuthenticatedLayout,  // No path property
        children: [
          route({ path: "/dashboard", component: Dashboard }),
          route({ path: "/profile", component: Profile }),
          route({ path: "/settings", component: Settings }),
        ],
      }),
    ],
  }),
];`}</CodeBlock>
        <p>
          The <code>AuthenticatedLayout</code> component wraps{" "}
          <code>/dashboard</code>, <code>/profile</code>, and{" "}
          <code>/settings</code> without adding anything to their URLs. This is
          perfect for:
        </p>
        <ul>
          <li>Authentication wrappers that check if users are logged in</li>
          <li>Feature flag wrappers that conditionally show features</li>
          <li>Context providers that supply data to a group of routes</li>
          <li>Error boundaries for a subset of your application</li>
        </ul>
      </section>

      <section>
        <h3>Building a Complete Example</h3>
        <p>
          Let's put it all together with a realistic example&mdash;a project
          management application with nested layouts.
        </p>
        <CodeBlock language="tsx">{`import { Router, route, Outlet } from "@funstack/router";
import { Suspense } from "react";

// Root layout with app-wide header
function AppLayout() {
  return (
    <div className="app">
      <header>
        <h1>Project Manager</h1>
        <nav>
          <a href="/">Home</a>
          <a href="/projects">Projects</a>
        </nav>
      </header>
      <Outlet />
      <footer>© 2024 Project Manager</footer>
    </div>
  );
}

// Projects section layout with project list sidebar
function ProjectsLayout() {
  return (
    <div className="projects-layout">
      <aside className="project-list">
        <h2>Your Projects</h2>
        {/* Project list would be loaded here */}
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

// Individual project layout with project-specific navigation
function ProjectLayout({ params }: { params: { projectId: string } }) {
  return (
    <div className="project">
      <nav className="project-nav">
        <a href={\`/projects/\${params.projectId}\`}>Overview</a>
        <a href={\`/projects/\${params.projectId}/tasks\`}>Tasks</a>
        <a href={\`/projects/\${params.projectId}/team\`}>Team</a>
      </nav>
      <Outlet />
    </div>
  );
}

// Route definitions
const routes = [
  route({
    path: "/",
    component: AppLayout,
    children: [
      route({
        path: "/",
        component: HomePage,
      }),
      route({
        path: "/projects",
        component: ProjectsLayout,
        children: [
          route({
            path: "/",
            component: ProjectListPage,
          }),
          route({
            path: "/:projectId",
            component: ProjectLayout,
            children: [
              route({
                path: "/",
                component: ProjectOverview,
              }),
              route({
                path: "/tasks",
                component: ProjectTasks,
              }),
              route({
                path: "/tasks/:taskId",
                component: TaskDetail,
              }),
              route({
                path: "/team",
                component: ProjectTeam,
              }),
            ],
          }),
        ],
      }),
    ],
  }),
];

function App() {
  return <Router routes={routes} />;
}`}</CodeBlock>
        <p>With this structure:</p>
        <ul>
          <li>
            <code>/</code> shows <code>AppLayout</code> &rarr;{" "}
            <code>HomePage</code>
          </li>
          <li>
            <code>/projects</code> shows <code>AppLayout</code> &rarr;{" "}
            <code>ProjectsLayout</code> &rarr; <code>ProjectListPage</code>
          </li>
          <li>
            <code>/projects/123</code> shows <code>AppLayout</code> &rarr;{" "}
            <code>ProjectsLayout</code> &rarr; <code>ProjectLayout</code> &rarr;{" "}
            <code>ProjectOverview</code>
          </li>
          <li>
            <code>/projects/123/tasks/456</code> shows <code>AppLayout</code>{" "}
            &rarr; <code>ProjectsLayout</code> &rarr; <code>ProjectLayout</code>{" "}
            &rarr; <code>TaskDetail</code> (with both{" "}
            <code>projectId: "123"</code> and <code>taskId: "456"</code>)
          </li>
        </ul>
      </section>

      <section>
        <h3>Key Takeaways</h3>
        <ul>
          <li>
            Use <code>{"<Outlet>"}</code> to mark where child routes should
            render
          </li>
          <li>Child route paths are relative to their parent route's path</li>
          <li>
            Parent routes use prefix matching; leaf routes use exact matching
          </li>
          <li>Use pathless routes for layouts that don't affect the URL</li>
          <li>
            Parent route loaders run before children, making them ideal for
            shared data
          </li>
          <li>
            Deep nesting is supported&mdash;compose as many layout levels as you
            need
          </li>
        </ul>
      </section>
    </div>
  );
}
