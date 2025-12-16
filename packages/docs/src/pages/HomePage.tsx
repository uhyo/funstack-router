import { CodeBlock } from "../components/CodeBlock";

export function HomePage() {
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
        <img
          src="/funstack-router/FUNSTACK_Router_Hero_small.png"
          alt="FUNSTACK Router"
          className="hero-image"
        />
        <p>
          FUNSTACK Router is in a <strong>PoC stage</strong> and is not yet
          recommended for production use. It aims to provide a picture of a
          modern routing solution for React applications by leveraging the
          latest web APIs.
        </p>
        <div className="hero-buttons">
          <a href="/funstack-router/getting-started" className="button primary">
            Get Started
          </a>
          <a href="/funstack-router/api" className="button secondary">
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
        </div>
      </section>

      <section className="quick-start">
        <h2>Quick Start</h2>
        <CodeBlock language="bash">{`npm install @funstack/router`}</CodeBlock>
        <CodeBlock language="tsx">{`import { Router, route } from "@funstack/router";

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
}`}</CodeBlock>
      </section>
    </div>
  );
}
