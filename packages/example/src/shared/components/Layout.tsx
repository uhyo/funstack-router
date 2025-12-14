import { Outlet, useLocation } from "@funstack/router";

export function Layout() {
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
