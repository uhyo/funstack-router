import { CodeBlock } from "../components/CodeBlock.js";

export function FaqPage() {
  return (
    <div className="page docs-page">
      <h1>FAQ</h1>

      <section>
        <h2>Browser doesn't scroll to top after navigation</h2>
        <p>
          According to the Navigation API specification, the browser should
          automatically scroll to the top of the page after a same-document
          navigation. However, as of now, Chrome and Safari do not follow this
          part of the spec.
        </p>
        <p>
          As a workaround, you can listen to the <code>navigatesuccess</code>{" "}
          event and scroll to the top manually:
        </p>
        <CodeBlock language="tsx">{`import { useEffect } from "react";

function App() {
  useEffect(() => {
    const navigation = window.navigation;
    if (!navigation) {
      return;
    }
    const controller = new AbortController();
    navigation.addEventListener(
      "navigatesuccess",
      () => {
        const transition = navigation.transition;
        if (
          transition.navigationType === "push" ||
          transition.navigationType === "replace"
        ) {
          // Safari ignores scrolling immediately after navigation,
          // so we wait a bit before scrolling
          setTimeout(() => {
            window.scrollTo(0, -1);
          }, 10);
        }
      },
      { signal: controller.signal },
    );
    return () => {
      controller.abort();
    };
  }, []);

  return <Router routes={routes} />;
}`}</CodeBlock>
      </section>

      <section>
        <h2>
          <code>location.href</code> and <code>location.reload()</code> doesn't
          hard navigate
        </h2>
        <p>
          When you use <code>location.href = "..."</code> or{" "}
          <code>location.reload()</code> in an app with FUNSTACK Router, the
          router intercepts the navigation and handles it as a client-side route
          change instead of performing a full page reload.
        </p>
        <p>
          This is because the Navigation API, which FUNSTACK Router is built on,
          intercepts these navigations by default.
        </p>
        <p>
          If you need a true hard navigation or reload that bypasses the router,
          use <code>hardNavigate</code> or <code>hardReload</code>:
        </p>
        <CodeBlock language="tsx">{`import { hardReload, hardNavigate } from "@funstack/router";

// Full page reload — bypasses the router and all blockers
hardReload();

// Full page navigation — bypasses the router and all blockers
hardNavigate("/other-page");`}</CodeBlock>
      </section>
      <section>
        <h2>Handling loader errors</h2>
        <p>
          When a loader throws an error (or returns a rejected promise), the
          error is surfaced as a rejected promise in the component's{" "}
          <code>data</code> prop. When you call <code>use(data)</code>, React
          re-throws the rejection, which can be caught by an{" "}
          <a href="https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary">
            Error Boundary
          </a>
          .
        </p>
        <p>
          The recommended pattern is to place an error boundary in your{" "}
          <b>root layout route</b>. This catches errors from any loader in the
          route tree without crashing the entire application:
        </p>
        <CodeBlock language="tsx">{`import { Router, route, Outlet } from "@funstack/router";
import { ErrorBoundary } from "./ErrorBoundary";

function RootLayout() {
  return (
    <div>
      <header>My App</header>
      <ErrorBoundary fallback={<div>Something went wrong.</div>}>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}

const routes = [
  route({
    path: "/",
    component: RootLayout,
    children: [
      route({
        path: "/",
        component: HomePage,
      }),
      route({
        path: "/users/:id",
        component: UserPage,
        loader: async ({ params }) => {
          const res = await fetch(\`/api/users/\${params.id}\`);
          if (!res.ok) throw new Error("Failed to load user");
          return res.json();
        },
      }),
    ],
  }),
];

function App() {
  return <Router routes={routes} />;
}`}</CodeBlock>
        <p>
          This works for both synchronous and asynchronous loaders. The router
          internally converts synchronous loader errors into rejected promises,
          so the behavior is consistent regardless of whether a loader is sync
          or async.
        </p>
        <p>
          You can also place error boundaries at more granular levels (e.g.,
          wrapping individual route components or <code>{"<Suspense>"}</code>{" "}
          boundaries) for fine-grained error handling.
        </p>
      </section>
    </div>
  );
}
