import { useNavigate } from "@funstack/router";

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="page home-page">
      <section className="hero">
        <h1>FUNSTACK Router</h1>
        <p className="tagline">
          A modern React router built on the{" "}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API"
            target="_blank"
            rel="noopener noreferrer"
          >
            Navigation API
          </a>
        </p>
        <div className="hero-buttons">
          <a
            href="/funstack-router/getting-started"
            className="button primary"
            onClick={(e) => {
              e.preventDefault();
              navigate("/funstack-router/getting-started");
            }}
          >
            Get Started
          </a>
          <a
            href="/funstack-router/api"
            className="button secondary"
            onClick={(e) => {
              e.preventDefault();
              navigate("/funstack-router/api");
            }}
          >
            API Reference
          </a>
        </div>
      </section>

      <section className="features">
        <h2>Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>Navigation API</h3>
            <p>
              Built on the modern Navigation API instead of the History API for
              better navigation handling and state management.
            </p>
          </div>
          <div className="feature-card">
            <h3>URLPattern Matching</h3>
            <p>
              Uses the URLPattern API for powerful and flexible path matching
              with support for parameters and wildcards.
            </p>
          </div>
          <div className="feature-card">
            <h3>Nested Routes</h3>
            <p>
              First-class support for nested routing with the Outlet component
              for building complex layouts.
            </p>
          </div>
          <div className="feature-card">
            <h3>Data Loading</h3>
            <p>
              Built-in async data loading with loaders that run before route
              components render.
            </p>
          </div>
          <div className="feature-card">
            <h3>Type Safe</h3>
            <p>
              Written in TypeScript with full type safety for routes, params,
              and navigation.
            </p>
          </div>
          <div className="feature-card">
            <h3>Lightweight</h3>
            <p>
              Minimal bundle size with zero external dependencies beyond React.
            </p>
          </div>
        </div>
      </section>

      <section className="quick-start">
        <h2>Quick Start</h2>
        <pre className="code-block">
          <code>{`npm install @funstack/router`}</code>
        </pre>
        <pre className="code-block">
          <code>{`import { Router, route } from "@funstack/router";

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
    </div>
  );
}
