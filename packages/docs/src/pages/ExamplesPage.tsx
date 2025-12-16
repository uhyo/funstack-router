export function ExamplesPage() {
  return (
    <div className="page docs-page">
      <h1>Examples</h1>

      <section>
        <h2>Basic Routing</h2>
        <p>A simple example with home and about pages:</p>
        <pre className="code-block">
          <code>{`import { Router, route, Outlet, useNavigate } from "@funstack/router";

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
}`}</code>
        </pre>
      </section>

      <section>
        <h2>Dynamic Routes with Params</h2>
        <p>
          Handle dynamic URL segments with parameters. Components receive params
          via props:
        </p>
        <pre className="code-block">
          <code>{`import { route } from "@funstack/router";

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
];`}</code>
        </pre>
      </section>

      <section>
        <h2>Nested Routes</h2>
        <p>Create complex layouts with nested routing:</p>
        <pre className="code-block">
          <code>{`import { route, Outlet } from "@funstack/router";

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
});`}</code>
        </pre>
      </section>

      <section>
        <h2>Data Loading</h2>
        <p>
          Load data with loaders. When a loader returns a Promise, the component
          receives that Promise and uses React's <code>use</code> hook to unwrap
          it. Use <code>&lt;Suspense&gt;</code> within your pages or layouts to
          handle loading states.
        </p>
        <pre className="code-block">
          <code>{`import { use, Suspense } from "react";
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
});`}</code>
        </pre>
      </section>

      <section>
        <h2>Search Parameters</h2>
        <p>Work with URL query parameters:</p>
        <pre className="code-block">
          <code>{`import { useSearchParams } from "@funstack/router";

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
}`}</code>
        </pre>
      </section>

      <section>
        <h2>Navigation Callback</h2>
        <p>
          React to navigation events. The callback receives the{" "}
          <code>NavigateEvent</code> from the Navigation API and the matched
          routes:
        </p>
        <pre className="code-block">
          <code>{`import { Router, route, type OnNavigateCallback } from "@funstack/router";

function App() {
  const handleNavigate: OnNavigateCallback = (event) => {
    // Track page views
    const url = new URL(event.destination.url);
    analytics.track("page_view", {
      path: url.pathname,
      search: url.search,
    });

    // You can call event.preventDefault() to cancel the navigation
  };

  return (
    <Router
      routes={routes}
      onNavigate={handleNavigate}
    />
  );
}`}</code>
        </pre>
      </section>
    </div>
  );
}
