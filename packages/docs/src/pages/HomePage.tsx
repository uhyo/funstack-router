import { CodeBlock } from "../components/CodeBlock.js";

export function HomePage() {
  return (
    <div className="page home-page">
      <section className="hero">
        <h1>FUNSTACK Router</h1>
        <p className="tagline">
          A <em>truly</em> modern router for React SPA
        </p>
        <img
          src="/FUNSTACK_Router_Hero_small.png"
          alt="FUNSTACK Router"
          className="hero-image"
        />
        <div className="hero-buttons">
          <a href="/getting-started" className="button primary">
            Get Started
          </a>
          <a href="/api" className="button secondary">
            API Reference
          </a>
        </div>
      </section>

      <section className="selling-points">
        <div className="selling-point">
          <h2>Built on the Navigation API</h2>
          <p>
            FUNSTACK Router is built entirely on the{" "}
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API"
              target="_blank"
              rel="noopener noreferrer"
            >
              Navigation API
            </a>
            , the modern replacement for the History API. There is no fallback
            to the History API&mdash;FUNSTACK Router fully commits to the new
            standard. This means cleaner navigation handling, built-in
            interception of navigations, and a more predictable routing
            experience. Native <code>&lt;a&gt;</code> elements just work for
            client-side navigation&mdash;no special <code>Link</code> component
            needed.
          </p>
        </div>
        <div className="selling-point">
          <h2>
            Designed for{" "}
            <a
              href="https://github.com/reactwg/async-react"
              target="_blank"
              rel="noopener noreferrer"
            >
              Async React
            </a>
          </h2>
          <p>
            In FUNSTACK Router, navigations are treated as{" "}
            <strong>transitions</strong>. This integrates seamlessly with
            React&apos;s concurrent features&mdash;Suspense boundaries are
            respected during navigation, and the previous page remains visible
            until the next one is ready. No need for manual loading
            states&mdash;your router and React work together out of the box.
          </p>
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
            <h3>Transitions</h3>
            <p>
              Navigations are wrapped in React transitions, keeping the previous
              page visible while the next one loads.
            </p>
          </div>
          <div className="feature-card">
            <h3>RSC Compatible</h3>
            <p>
              Designed to work with React Server Components.{" "}
              <a href="/learn/rsc">Learn more</a>
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
