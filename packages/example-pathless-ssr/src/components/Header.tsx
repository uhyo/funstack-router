import { NavLink } from "./NavLink.js";

const navItems = [
  { path: "/", label: "Home", exact: true },
  { path: "/recipes", label: "Recipes" },
  { path: "/favorites", label: "Favorites" },
];

export function Header() {
  return (
    <header className="header">
      <h1 className="header-title">Recipe Book</h1>
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
