import { Outlet, useLocation } from "@funstack/router";
import { NavLink } from "./NavLink";

export function Layout() {
  const location = useLocation();

  return (
    <div>
      <nav style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {/* Using NavLink for active styling */}
        <NavLink href="/">Home</NavLink>
        <NavLink href="/about">About</NavLink>
        <NavLink href="/users" match="prefix">
          Users
        </NavLink>
        <NavLink href="/search" match="prefix">
          Search
        </NavLink>
        <NavLink href="/edit">Edit Form</NavLink>
        <NavLink href="/counter">Counter</NavLink>
        <NavLink href="/nav-options">Nav Options</NavLink>
        <NavLink href="/settings" match="prefix">
          Settings
        </NavLink>
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
          {location.hash && (
            <>
              {" "}
              | Hash: <code>{location.hash}</code>
            </>
          )}
        </p>
        <Outlet />
      </main>
    </div>
  );
}
