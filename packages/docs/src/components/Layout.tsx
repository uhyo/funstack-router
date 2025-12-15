import { Outlet, useLocation, useNavigate } from "@funstack/router";

const navItems = [
  { path: "/funstack-router/", label: "Home" },
  { path: "/funstack-router/getting-started", label: "Getting Started" },
  { path: "/funstack-router/api", label: "API Reference" },
  { path: "/funstack-router/examples", label: "Examples" },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <a
              href="/funstack-router/"
              onClick={(e) => {
                e.preventDefault();
                navigate("/funstack-router/");
              }}
            >
              FUNSTACK Router
            </a>
          </h1>
          <nav className="nav">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`nav-link ${location.pathname === item.path || (item.path === "/funstack-router/" && location.pathname === "/funstack-router") ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="https://github.com/user/funstack-router"
            className="github-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>
          Built with <strong>@funstack/router</strong> &mdash; A modern React
          router based on the Navigation API
        </p>
      </footer>
    </div>
  );
}
