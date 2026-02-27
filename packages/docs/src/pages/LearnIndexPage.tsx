export function LearnIndexPage() {
  return (
    <div className="learn-overview">
      <p className="page-intro">
        These guides teach you how to use <code>@funstack/router</code> through
        practical, use-case-driven examples.
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
        <h2>Server-Side Rendering</h2>
        <p>
          FUNSTACK Router supports three SSR modes depending on your deployment
          model. These guides cover each use case:
        </p>
        <ul>
          <li>
            <a href="/learn/ssr">How SSR Works</a> &mdash; the default two-stage
            model where pathless routes produce an app shell and path-based
            routes activate after client hydration
          </li>
          <li>
            <a href="/learn/ssr/static-site-generation">
              Static Site Generation
            </a>{" "}
            &mdash; use the <code>ssr</code> prop to match path-based routes
            during SSR for richer pre-rendered output
          </li>
          <li>
            <a href="/learn/ssr/with-loaders">SSR with Loaders</a> &mdash; set{" "}
            <code>runLoaders: true</code> for fully dynamic server-side
            rendering including loader data
          </li>
        </ul>
      </section>

      <section className="learn-category">
        <h2>React Server Components</h2>
        <p>
          FUNSTACK Router is designed to work with React Server Components.
          These guides cover how to define routes in server modules and use
          route features alongside RSC:
        </p>
        <ul>
          <li>
            <a href="/learn/rsc">React Server Components</a> &mdash; define
            routes in server modules using the{" "}
            <code>@funstack/router/server</code> entry point and keep your
            client bundle lean
          </li>
          <li>
            <a href="/learn/rsc/route-features">RSC with Route Features</a>{" "}
            &mdash; use loaders, typed hooks, and navigation state alongside RSC
            by splitting route definitions with <code>bindRoute()</code>
          </li>
        </ul>
      </section>

      <section className="learn-category">
        <h2>
          <a href="/learn/actions">Form Actions</a>
        </h2>
        <p>
          Learn how the router intercepts POST form submissions and runs action
          functions on the client. This guide covers the action/loader data flow
          and includes important guidance on progressive enhancement &mdash;
          your server should always be ready to handle POST requests as a
          baseline.
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
