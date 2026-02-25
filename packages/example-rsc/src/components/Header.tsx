import { NavLink } from "./NavLink.js";

const navItems = [
  { path: "/", label: "Dashboard", exact: true },
  { path: "/tasks", label: "Tasks" },
  { path: "/settings/profile", label: "Settings" },
];

export function Header() {
  return (
    <header className="header">
      <h1 className="header-title">Task Manager</h1>
      <nav className="header-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            href={item.path}
            className="nav-link"
            activeClassName="active"
            exact={item.exact}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
