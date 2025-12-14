import { use, Suspense } from "react";
import {
  Router,
  Outlet,
  useLocation,
  useSearchParams,
  useNavigate,
  route,
} from "@funstack/router";

// Types
type User = { id: string; name: string; role: string };

// Sample user data (simulating a database)
const users: User[] = [
  { id: "1", name: "Alice", role: "Admin" },
  { id: "2", name: "Bob", role: "User" },
  { id: "3", name: "Charlie", role: "User" },
];

// Simulated async data fetching (would be API calls in real app)
async function fetchUsers(): Promise<User[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return users;
}

async function fetchUser(id: string): Promise<User | null> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return users.find((u) => u.id === id) || null;
}

// Layout component with navigation
function Layout() {
  const location = useLocation();

  return (
    <div>
      <nav>
        {/* Native <a> tags work for basic navigation thanks to Navigation API */}
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/users">Users</a>
        <a href="/search?q=react">Search</a>
      </nav>
      <main>
        <p style={{ color: "#666", fontSize: "0.9rem" }}>
          Current path: <code>{location.pathname}</code>
          {location.search && (
            <>
              {" "}
              | Search: <code>{location.search}</code>
            </>
          )}
        </p>
        <Outlet />
      </main>
    </div>
  );
}

// Home page
function Home() {
  return (
    <div>
      <h1>Welcome to FUNSTACK Router</h1>
      <p>This is a demo of the router based on the Navigation API.</p>
      <h2>Features demonstrated:</h2>
      <ul>
        <li>
          <a href="/about">Basic navigation</a> (native &lt;a&gt; tag)
        </li>
        <li>
          <a href="/users">Data loaders with Suspense</a> - async data fetching
        </li>
        <li>
          <a href="/users/1">Route parameters with loaders</a>
        </li>
        <li>
          <a href="/search?q=hello&page=1">Search parameters</a>
        </li>
        <li>
          See About page for <code>useNavigate()</code> hook demo
        </li>
      </ul>
      <h2>Data Loader Features:</h2>
      <ul>
        <li>
          Loaders execute before component renders (parallel with navigation)
        </li>
        <li>Results are cached - instant back/forward navigation</li>
        <li>Components receive loader result as a prop</li>
        <li>
          For async loaders, use React's <code>use()</code> hook with Suspense
        </li>
      </ul>
    </div>
  );
}

// About page
function About() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>About</h1>
      <p>
        FUNSTACK Router is a modern React router built on the Navigation API.
      </p>
      <button onClick={() => navigate("/")}>Go Home (programmatic)</button>
    </div>
  );
}

// Users list page - receives Promise from loader, uses React's use() to suspend
function Users({ data }: { data: Promise<User[]> }) {
  const userList = use(data);

  return (
    <div>
      <h1>Users</h1>
      <p style={{ color: "#666", fontSize: "0.9rem" }}>
        (Data loaded via async loader with Suspense)
      </p>
      <div>
        {userList.map((user) => (
          <div key={user.id} className="user-card">
            <strong>{user.name}</strong> - {user.role}
            <br />
            <a href={`/users/${user.id}`}>View Profile</a>
          </div>
        ))}
      </div>
    </div>
  );
}

// User detail page - receives Promise from loader
function UserDetail({ data }: { data: Promise<User | null> }) {
  const user = use(data);
  const navigate = useNavigate();

  if (!user) {
    return (
      <div>
        <h1>User Not Found</h1>
        <p>The requested user does not exist.</p>
        <button onClick={() => navigate("/users")}>Back to Users</button>
      </div>
    );
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p style={{ color: "#666", fontSize: "0.9rem" }}>
        (Data loaded via async loader with Suspense)
      </p>
      <p>
        <strong>ID:</strong> {user.id}
      </p>
      <p>
        <strong>Role:</strong> {user.role}
      </p>
      <button onClick={() => navigate("/users")}>Back to Users</button>
    </div>
  );
}

// Search page demonstrating useSearchParams
function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const page = searchParams.get("page") || "1";

  return (
    <div>
      <h1>Search</h1>
      <p>
        <strong>Query:</strong> {query || "(none)"}
      </p>
      <p>
        <strong>Page:</strong> {page}
      </p>

      <div style={{ marginTop: "1rem" }}>
        <input
          type="text"
          value={query}
          onChange={(e) =>
            setSearchParams((prev) => {
              prev.set("q", e.target.value);
              return prev;
            })
          }
          placeholder="Search..."
          style={{ padding: "0.5rem", marginRight: "0.5rem" }}
        />
        <button
          onClick={() =>
            setSearchParams((prev) => {
              prev.set("page", String(Number(page) + 1));
              return prev;
            })
          }
        >
          Next Page
        </button>
      </div>
    </div>
  );
}

// 404 page
function NotFound() {
  const location = useLocation();

  return (
    <div>
      <h1>404 - Not Found</h1>
      <p>
        The page <code>{location.pathname}</code> does not exist.
      </p>
      <a href="/">Go Home</a>
    </div>
  );
}

// Route configuration using route() helper for type safety
const routes = [
  route({
    path: "/",
    component: Layout,
    children: [
      route({ path: "", component: Home }),
      route({ path: "about", component: About }),
      // Async loader - component receives Promise and uses use() to suspend
      route({
        path: "users",
        component: Users,
        loader: () => fetchUsers(),
      }),
      // Async loader with params
      route({
        path: "users/:id",
        component: UserDetail,
        loader: ({ params }) => fetchUser(params.id),
      }),
      route({ path: "search", component: Search }),
    ],
  }),
];

// Loading fallback for Suspense
function LoadingSpinner() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Loading...</p>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Router routes={routes} />
    </Suspense>
  );
}
