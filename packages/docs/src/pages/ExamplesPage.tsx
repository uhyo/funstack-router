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
        <p>Handle dynamic URL segments with parameters:</p>
        <pre className="code-block">
          <code>{`import { route, useParams } from "@funstack/router";

function UserProfile() {
  const { userId } = useParams();
  return <h1>Viewing user: {userId}</h1>;
}

function PostDetail() {
  const { userId, postId } = useParams();
  return (
    <div>
      <h1>Post {postId}</h1>
      <p>By user {userId}</p>
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
          <code>{`import { route, Outlet, useParams } from "@funstack/router";

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
        <p>Fetch data before rendering with loaders:</p>
        <pre className="code-block">
          <code>{`import { route } from "@funstack/router";

interface Post {
  id: number;
  title: string;
  body: string;
}

interface PostListData {
  posts: Post[];
}

function PostList({ data }: { data: PostListData }) {
  return (
    <ul>
      {data.posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

const postsRoute = route({
  path: "/posts",
  component: PostList,
  loader: async (): Promise<PostListData> => {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts");
    const posts = await response.json();
    return { posts: posts.slice(0, 10) };
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
        <p>React to navigation events:</p>
        <pre className="code-block">
          <code>{`import { Router, route, type Location } from "@funstack/router";

function App() {
  const handleNavigate = (location: Location) => {
    // Track page views
    analytics.track("page_view", {
      path: location.pathname,
      search: location.search,
    });

    // Scroll to top on navigation
    window.scrollTo(0, 0);
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
