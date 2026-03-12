import { CodeBlock } from "../components/CodeBlock.js";

export function LearnErrorHandlingPage() {
  return (
    <div className="learn-content">
      <h2>Error Handling</h2>

      <p className="page-intro">
        The recommended way to handle route errors is to place an Error Boundary
        inside a layout route and wrap its <code>{"<Outlet />"}</code>. That
        keeps shared UI like headers and navigation visible while errors from
        child routes fall back to a recovery screen.
      </p>

      <section>
        <h3>Put the Boundary in a Layout Route</h3>
        <p>
          In FUNSTACK Router, child routes render inside their parent
          route&rsquo;s <code>{"<Outlet />"}</code>. This makes a root layout a
          great place for a top-level Error Boundary: it can catch errors from
          all nested routes without replacing the layout itself.
        </p>
        <p>
          A boundary <strong>outside</strong> the Router can still act as a
          last-resort safeguard, but it cannot use router hooks like{" "}
          <code>useLocation()</code> to reset on navigation. For day-to-day
          route errors, prefer a boundary <strong>inside</strong> your root
          layout:
        </p>
        <CodeBlock language="tsx">{`import { Outlet, useLocation } from "@funstack/router";
import { ErrorBoundary } from "react-error-boundary";

function RootLayout() {
  const { entryId } = useLocation();

  return (
    <div>
      <header>My App</header>
      <nav>
        <a href="/">Home</a>
        <a href="/users/1">User</a>
      </nav>

      <ErrorBoundary
        resetKeys={[entryId]}
        fallbackRender={() => <p>Something went wrong.</p>}
      >
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}`}</CodeBlock>
        <p>
          With this structure, an error in a child page, child loader, or nested
          layout below <code>RootLayout</code> shows the fallback UI while the
          outer layout stays mounted.
        </p>
      </section>

      <section>
        <h3>Reset the Boundary on Navigation</h3>
        <p>
          Error Boundaries keep showing their fallback until they are reset. The
          easiest way to reset them when the user navigates is to key that reset
          off <code>useLocation().entryId</code>.
        </p>
        <p>
          <code>entryId</code> comes from the Navigation API&rsquo;s current
          history entry. It changes when the router moves to a different entry,
          so using it in <code>resetKeys</code> lets the boundary recover when
          the user clicks another link or goes back/forward to a different page.
        </p>
        <p>
          If you place more boundaries deeper in the tree, apply the same
          pattern there as well. The nearest boundary above the failing route is
          the one that catches the error.
        </p>
      </section>

      <section>
        <h3>How Loader Errors Propagate</h3>
        <p>
          Loader errors follow the same Error Boundary rules as rendering
          errors, but they can surface in two slightly different ways:
        </p>
        <ul>
          <li>
            <strong>Synchronous loader throws</strong> &mdash; when React
            renders that route&rsquo;s <code>{"<Outlet />"}</code>, the error is
            thrown there, so the nearest Error Boundary above that outlet
            catches it.
          </li>
          <li>
            <strong>Asynchronous loader rejects</strong> &mdash; the route
            component receives a Promise and the rejection surfaces when you
            call <code>use(data)</code>. That rejection is also caught by the
            nearest Error Boundary.
          </li>
        </ul>
        <CodeBlock language="tsx">{`import { Suspense, use } from "react";

function UserPage({ data }: { data: Promise<User> }) {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <UserDetails data={data} />
    </Suspense>
  );
}

function UserDetails({ data }: { data: Promise<User> }) {
  const user = use(data); // A rejected loader Promise throws here
  return <h1>{user.name}</h1>;
}`}</CodeBlock>
        <p>
          This means you usually do not need special loader-specific error
          plumbing. Put boundaries where you want recovery UI to appear, and
          loader failures in that part of the route tree will bubble there.
        </p>
      </section>

      <section>
        <h3>Nested Boundaries for Finer-Grained Recovery</h3>
        <p>
          A root layout boundary is a good default, but you can also add
          boundaries to nested layouts when a section of the app should recover
          independently. For example, a dashboard layout can catch errors from
          dashboard child routes while the rest of the application keeps
          working.
        </p>
        <p>
          Think of each boundary as owning the routes rendered through its{" "}
          <code>{"<Outlet />"}</code>. Put the boundary as high as needed to
          preserve surrounding UI, but as low as possible when you want more
          specific fallback screens.
        </p>
      </section>

      <section>
        <h3>See Also: How Loaders Run</h3>
        <p>
          This page focuses on recovery and error propagation. For when loaders
          execute, how results are cached, and when they re-run after navigation
          or form submissions, see <a href="/learn/loaders">How Loaders Run</a>.
        </p>
      </section>
    </div>
  );
}
