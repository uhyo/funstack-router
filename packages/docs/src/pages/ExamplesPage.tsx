"use client";

import { CodeBlock } from "../components/CodeBlock";

export function ExamplesPage() {
  return (
    <div className="page docs-page">
      <h1>Examples</h1>

      <section>
        <h2>Basic Routing</h2>
        <p>A simple example with home and about pages:</p>
        <CodeBlock language="tsx">{`import { Router, route, Outlet, useNavigate } from "@funstack/router";

function Home() {
  return <h1>Home Page</h1>;
}

function About() {
  return <h1>About Page</h1>;
}

function Layout() {
  const navigate = useNavigate();

  return (
    <div>
      <nav>
        <button onClick={() => navigate("/")}>Home</button>
        <button onClick={() => navigate("/about")}>About</button>
      </nav>
      <Outlet />
    </div>
  );
}

const routes = [
  route({
    path: "/",
    component: Layout,
    children: [
      route({ path: "/", component: Home }),
      route({ path: "/about", component: About }),
    ],
  }),
];

function App() {
  return <Router routes={routes} />;
}`}</CodeBlock>
      </section>

      <section>
        <h2>Dynamic Routes with Params</h2>
        <p>
          Handle dynamic URL segments with parameters. Components receive params
          via props:
        </p>
        <CodeBlock language="tsx">{`import { route } from "@funstack/router";

function UserProfile({ params }: { params: { userId: string } }) {
  return <h1>Viewing user: {params.userId}</h1>;
}

function PostDetail({
  params,
}: {
  params: { userId: string; postId: string };
}) {
  return (
    <div>
      <h1>Post {params.postId}</h1>
      <p>By user {params.userId}</p>
    </div>
  );
}

const routes = [
  route({
    path: "/users/:userId",
    component: UserProfile,
  }),
  route({
    path: "/users/:userId/posts/:postId",
    component: PostDetail,
  }),
];`}</CodeBlock>
      </section>

      <section>
        <h2>Nested Routes</h2>
        <p>Create complex layouts with nested routing:</p>
        <CodeBlock language="tsx">{`import { route, Outlet } from "@funstack/router";

function Dashboard() {
  return (
    <div className="dashboard">
      <aside>
        <nav>Dashboard Menu</nav>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

function DashboardHome() {
  return <h2>Dashboard Overview</h2>;
}

function DashboardSettings() {
  return <h2>Settings</h2>;
}

function DashboardProfile() {
  return <h2>Your Profile</h2>;
}

const dashboardRoutes = route({
  path: "/dashboard",
  component: Dashboard,
  children: [
    route({ path: "/", component: DashboardHome }),
    route({ path: "/settings", component: DashboardSettings }),
    route({ path: "/profile", component: DashboardProfile }),
  ],
});`}</CodeBlock>
      </section>

      <section>
        <h2>Data Loading</h2>
        <p>
          Load data with loaders. When a loader returns a Promise, the component
          receives that Promise and uses React's <code>use</code> hook to unwrap
          it. Use <code>&lt;Suspense&gt;</code> within your pages or layouts to
          handle loading states.
        </p>
        <CodeBlock language="tsx">{`import { use, Suspense } from "react";
import { route } from "@funstack/router";

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

// When the loader returns a Promise, the component receives that Promise.
// Use React's \`use\` hook to unwrap the Promise.
function UserPostsContent({
  data,
  params,
}: {
  data: Promise<Post[]>;
  params: { userId: string };
}) {
  const posts = use(data);
  return (
    <div>
      <h2>Posts by user {params.userId}</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}

// Wrap the content with Suspense at the page level
function UserPosts(props: {
  data: Promise<Post[]>;
  params: { userId: string };
}) {
  return (
    <Suspense fallback={<div>Loading posts...</div>}>
      <UserPostsContent {...props} />
    </Suspense>
  );
}

const userPostsRoute = route({
  path: "/users/:userId/posts",
  component: UserPosts,
  loader: async ({ params }): Promise<Post[]> => {
    const response = await fetch(
      \`https://jsonplaceholder.typicode.com/posts?userId=\${params.userId}\`
    );
    return response.json();
  },
});`}</CodeBlock>
      </section>

      <section>
        <h2>Search Parameters</h2>
        <p>Work with URL query parameters:</p>
        <CodeBlock language="tsx">{`import { useSearchParams } from "@funstack/router";

function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get("category") || "all";
  const sortBy = searchParams.get("sort") || "name";

  const handleCategoryChange = (newCategory: string) => {
    setSearchParams({
      category: newCategory,
      sort: sortBy,
    });
  };

  const handleSortChange = (newSort: string) => {
    setSearchParams({
      category,
      sort: newSort,
    });
  };

  return (
    <div>
      <select value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
        <option value="all">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>

      <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
        <option value="name">Sort by Name</option>
        <option value="price">Sort by Price</option>
      </select>

      <p>Showing {category} products, sorted by {sortBy}</p>
    </div>
  );
}`}</CodeBlock>
      </section>

      <section>
        <h2>Pathless Routes</h2>
        <p>
          Routes without a <code>path</code> are called "pathless routes". They
          always match and don't consume any pathname, making them ideal for
          layout wrappers that don't affect the URL structure.
        </p>
        <CodeBlock language="tsx">{`import { route, Outlet } from "@funstack/router";

// A layout wrapper that provides authentication context
function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

// A layout wrapper that provides a sidebar
function DashboardLayout() {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

const routes = [
  route({
    path: "/",
    component: RootLayout,
    children: [
      route({ path: "/", component: HomePage }),
      route({ path: "/about", component: AboutPage }),
      // Pathless route wraps authenticated pages
      route({
        component: AuthLayout,
        children: [
          // Another pathless route for dashboard layout
          route({
            component: DashboardLayout,
            children: [
              route({ path: "/dashboard", component: DashboardHome }),
              route({ path: "/dashboard/settings", component: Settings }),
              route({ path: "/dashboard/profile", component: Profile }),
            ],
          }),
        ],
      }),
    ],
  }),
];`}</CodeBlock>
        <p>Key behaviors of pathless routes:</p>
        <ul>
          <li>
            <strong>Always match</strong> - They don't participate in path
            matching
          </li>
          <li>
            <strong>Consume no pathname</strong> - Children receive the full
            remaining pathname
          </li>
          <li>
            <strong>No params</strong> - The <code>params</code> prop is always
            an empty object
          </li>
          <li>
            <strong>Can have loaders</strong> - Pathless routes can still load
            data
          </li>
        </ul>
        <h3>Catch-All Routes</h3>
        <p>
          A pathless route at the end of a route list can serve as a catch-all
          for unmatched paths:
        </p>
        <CodeBlock language="tsx">{`const routes = [
  route({ path: "/", component: HomePage }),
  route({ path: "/about", component: AboutPage }),
  // Catch-all: matches any unmatched path
  route({ component: NotFoundPage }),
];`}</CodeBlock>
      </section>

      <section>
        <h2>Navigation Callback</h2>
        <p>
          React to navigation events. The callback receives the{" "}
          <code>NavigateEvent</code> from the Navigation API and an info object
          containing matched routes and whether the navigation will be
          intercepted:
        </p>
        <CodeBlock language="tsx">{`import { Router, route, type OnNavigateCallback } from "@funstack/router";

function App() {
  const handleNavigate: OnNavigateCallback = (event, info) => {
    // Track page views
    const url = new URL(event.destination.url);
    analytics.track("page_view", {
      path: url.pathname,
      search: url.search,
    });

    // info.matches contains the matched routes (or null if no match)
    // info.intercepting indicates if the router will handle this navigation
    console.log("Matched routes:", info.matches);
    console.log("Intercepting:", info.intercepting);

    // You can call event.preventDefault() to cancel the navigation
  };

  return (
    <Router
      routes={routes}
      onNavigate={handleNavigate}
    />
  );
}`}</CodeBlock>
      </section>
    </div>
  );
}
