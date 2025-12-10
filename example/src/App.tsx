import {
  Router,
  Link,
  Outlet,
  useLocation,
  useParams,
  useSearchParams,
  useNavigate,
  type RouteDefinition,
} from "@funstack/router";

// Sample user data
const users = [
  { id: "1", name: "Alice", role: "Admin" },
  { id: "2", name: "Bob", role: "User" },
  { id: "3", name: "Charlie", role: "User" },
];

// Layout component with navigation
function Layout() {
  const location = useLocation();

  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/users">Users</Link>
        <Link to="/search?q=react">Search</Link>
      </nav>
      <main>
        <p style={{ color: "#666", fontSize: "0.9rem" }}>
          Current path: <code>{location.pathname}</code>
          {location.search && <> | Search: <code>{location.search}</code></>}
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
          <Link to="/about">Basic navigation</Link>
        </li>
        <li>
          <Link to="/users">Nested routes</Link>
        </li>
        <li>
          <Link to="/users/1">Route parameters</Link>
        </li>
        <li>
          <Link to="/search?q=hello&page=1">Search parameters</Link>
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

// Users list page
function Users() {
  return (
    <div>
      <h1>Users</h1>
      <div>
        {users.map((user) => (
          <div key={user.id} className="user-card">
            <strong>{user.name}</strong> - {user.role}
            <br />
            <Link to={`/users/${user.id}`}>View Profile</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// User detail page
function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = users.find((u) => u.id === id);

  if (!user) {
    return (
      <div>
        <h1>User Not Found</h1>
        <p>No user with ID "{id}" exists.</p>
        <button onClick={() => navigate("/users")}>Back to Users</button>
      </div>
    );
  }

  return (
    <div>
      <h1>{user.name}</h1>
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
      <Link to="/">Go Home</Link>
    </div>
  );
}

// Route configuration
const routes: RouteDefinition[] = [
  {
    path: "/",
    component: Layout,
    children: [
      { path: "", component: Home },
      { path: "about", component: About },
      { path: "users", component: Users },
      { path: "users/:id", component: UserDetail },
      { path: "search", component: Search },
    ],
  },
];

export function App() {
  return <Router routes={routes} />;
}
