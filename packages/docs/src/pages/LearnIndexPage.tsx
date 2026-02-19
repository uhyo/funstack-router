export function LearnIndexPage() {
  return (
    <div className="learn-overview">
      <p className="page-intro">
        These guides teach you how to use <code>@funstack/router</code> through
        practical, use-case-driven examples. Each guide builds on real-world
        scenarios to help you understand not just how, but why.
      </p>

      <section className="learn-category">
        <h2>
          <a href="/learn/navigation-api">Navigation API</a>
        </h2>
        <p>
          Understand the Navigation API that powers FUNSTACK Router. Learn how
          it differs from the History API, why native <code>{"<a>"}</code>{" "}
          elements work for SPA navigation, and how to access Navigation API
          events directly when needed.
        </p>
      </section>

      <section className="learn-category">
        <h2>
          <a href="/learn/nested-routes">Nested Routes</a>
        </h2>
        <p>
          Learn how to create layouts that persist across navigation, build
          hierarchical page structures, and share data between parent and child
          routes. This guide covers the core concepts of nested routing
          including the <code>{"<Outlet>"}</code> component, parameter
          inheritance, and practical layout patterns.
        </p>
      </section>

      <section className="learn-category">
        <h2>
          <a href="/learn/type-safety">Type Safety</a>
        </h2>
        <p>
          Discover how to access route params, navigation state, and loader data
          in a fully type-safe manner. This guide covers two approaches:
          receiving typed data via component props (recommended) and using hooks
          for advanced scenarios like accessing parent route data or avoiding
          prop drilling.
        </p>
      </section>
      <section className="learn-category">
        <h2>
          <a href="/learn/server-side-rendering">Server-Side Rendering</a>
        </h2>
        <p>
          Learn how FUNSTACK Router behaves during server-side rendering.
          Pathless routes without loaders render on the server to produce an app
          shell, while path-based routes and loaders activate only after client
          hydration.
        </p>
      </section>
      <section className="learn-category">
        <h2>
          <a href="/learn/static-site-generation">Static Site Generation</a>
        </h2>
        <p>
          Use the <code>ssr</code> prop to match path-based routes during SSR
          for richer server-rendered output. This guide covers how to pre-render
          pages at known paths for static site generation and improved SEO.
        </p>
      </section>
      <section className="learn-category">
        <h2>
          <a href="/learn/react-server-components">React Server Components</a>
        </h2>
        <p>
          Learn how to use FUNSTACK Router with React Server Components. Define
          routes in server modules using the{" "}
          <code>@funstack/router/server</code> entry point and keep your client
          bundle lean by separating route definitions from runtime router code.
        </p>
      </section>
      <section className="learn-category">
        <h2>
          <a href="/learn/transitions">Controlling Transitions</a>
        </h2>
        <p>
          Learn how FUNSTACK Router uses React transitions to keep the old UI
          visible during navigation. Discover how to show pending indicators
          with <code>useIsPending</code>, why sync state updates via{" "}
          <code>setStateSync</code> bypass transitions for instant
          responsiveness, and how to opt out of transitions by keying Suspense
          boundaries.
        </p>
      </section>
    </div>
  );
}
