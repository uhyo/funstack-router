import { CodeBlock } from "../components/CodeBlock.js";

export function LearnLoadersPage() {
  return (
    <div className="learn-content">
      <h2>How Loaders Run</h2>

      <p className="page-intro">
        Loaders fetch data for a route before the UI renders. This page explains
        when loaders execute, how results are cached, and how different types of
        navigation affect loader behavior.
      </p>

      <section>
        <h3>Defining a Loader</h3>
        <p>
          A loader is a function on a route definition that receives the route
          params, a <code>Request</code>, and an <code>AbortSignal</code>. It
          can return any value &mdash; typically a Promise from a fetch call:
        </p>
        <CodeBlock language="tsx">{`import { route } from "@funstack/router";

const userRoute = route({
  path: "/users/:id",
  loader: async ({ params, request, signal }) => {
    const res = await fetch(\`/api/users/\${params.id}\`, { signal });
    return res.json();
  },
  component: UserPage,
});`}</CodeBlock>
        <p>
          The component receives the loader&rsquo;s return value as the{" "}
          <code>data</code> prop. For async loaders this is a{" "}
          <code>Promise</code>, which you unwrap with React&rsquo;s{" "}
          <code>use()</code> hook inside a <code>Suspense</code> boundary:
        </p>
        <CodeBlock language="tsx">{`import { use, Suspense } from "react";

function UserPage({ data }: { data: Promise<User> }) {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <UserDetail data={data} />
    </Suspense>
  );
}

function UserDetail({ data }: { data: Promise<User> }) {
  const user = use(data);
  return <h1>{user.name}</h1>;
}`}</CodeBlock>
      </section>

      <section>
        <h3>When Loaders Execute</h3>
        <p>Loaders run at two points in the lifecycle:</p>
        <ol>
          <li>
            <strong>Initial page load</strong> &mdash; When the Router first
            renders, it matches the current URL against the route definitions
            and executes all matching loaders immediately.
          </li>
          <li>
            <strong>Navigation events</strong> &mdash; When the user navigates
            (by clicking a link, submitting a form, or calling{" "}
            <code>navigate()</code>), the Router matches the destination URL and
            executes loaders for the matched routes.
          </li>
        </ol>
        <p>
          In both cases, all loaders in the matched route stack (parent and
          child) run <strong>in parallel</strong>. The navigation completes once
          every loader&rsquo;s Promise has resolved.
        </p>
      </section>

      <section>
        <h3>Caching by Navigation Entry</h3>
        <p>
          Loader results are cached using the{" "}
          <strong>navigation entry ID</strong> from the Navigation API. Each
          time you navigate to a new URL, the browser creates a new navigation
          entry with a unique ID. The Router uses this ID as the cache key, so:
        </p>
        <ul>
          <li>
            Re-renders of the same page <strong>do not</strong> re-execute
            loaders &mdash; the cached result is returned.
          </li>
          <li>
            Navigating to a new URL always creates a new entry and{" "}
            <strong>always</strong> executes loaders, even if the URL is the
            same as a previous navigation.
          </li>
        </ul>
        <p>
          This design ensures that loaders run exactly once per navigation while
          preventing unnecessary re-fetches during React re-renders.
        </p>
      </section>

      <section>
        <h3>Navigation Types and Loader Behavior</h3>
        <p>
          Different types of navigation have different effects on whether
          loaders run:
        </p>

        <h4>Push and Replace</h4>
        <p>
          A <strong>push</strong> navigation (the default when clicking a link
          or calling <code>navigate()</code>) creates a new navigation entry.
          Since the entry is new, loaders always execute. A{" "}
          <strong>replace</strong> navigation behaves the same way &mdash; it
          creates a new entry that replaces the current one, so loaders execute
          fresh.
        </p>

        <h4>Traverse (Back / Forward)</h4>
        <p>
          When the user goes back or forward in history, the browser revisits an{" "}
          <strong>existing</strong> navigation entry. Because the entry ID is
          the same as when the page was originally visited, the cached loader
          results are returned <strong>without re-executing</strong> the
          loaders. This makes back/forward navigation instant.
        </p>

        <h4>Reload</h4>
        <p>
          A reload navigation stays on the same navigation entry, but the Router
          generates a <strong>fresh cache key</strong> so that all loaders{" "}
          <strong>re-execute</strong>. This is useful when you want to refresh
          data without navigating away from the current page.
        </p>
        <p>
          You can trigger a reload programmatically using the Navigation
          API&rsquo;s <code>navigation.reload()</code> method:
        </p>
        <CodeBlock language="tsx">{`function RefreshButton() {
  return (
    <button onClick={() => navigation.reload()}>
      Refresh Data
    </button>
  );
}`}</CodeBlock>
        <p>
          During a reload, the old cached data remains available for the{" "}
          <strong>pending UI</strong>. Because the Router wraps navigations in a
          React transition, the previous UI stays on screen while the new data
          loads. Once the new loaders resolve, the UI updates. This means users
          see the existing content while the refresh is in progress, rather than
          a blank screen or loading spinner.
        </p>
        <p>
          Consecutive reloads work correctly &mdash; each reload increments an
          internal counter to produce a unique cache key, and stale caches are
          pruned automatically.
        </p>

        <h4>Form Submissions</h4>
        <p>
          When a <code>{'<form method="post">'}</code> is submitted, the Router
          runs the matched route&rsquo;s <code>action</code> first, then clears
          the loader cache for the current entry and re-executes all loaders.
          The action&rsquo;s return value is passed to each loader as{" "}
          <code>actionResult</code>. See the{" "}
          <a href="/learn/actions">Form Actions</a> page for details.
        </p>
      </section>

      <section>
        <h3>Nested Route Loaders</h3>
        <p>
          When routes are nested, each route in the matched stack can define its
          own loader. All loaders in the stack execute in parallel, and each
          component receives its own loader&rsquo;s result:
        </p>
        <CodeBlock language="tsx">{`const routes = [
  route({
    path: "/dashboard",
    loader: () => fetchDashboardLayout(),
    component: DashboardLayout,
    children: [
      route({
        path: "/stats",
        loader: () => fetchStats(),
        component: StatsPage,
      }),
    ],
  }),
];

// When navigating to /dashboard/stats:
// → fetchDashboardLayout() and fetchStats() run in parallel
// → DashboardLayout receives the layout data
// → StatsPage receives the stats data`}</CodeBlock>
        <p>
          On reload, <strong>all</strong> loaders in the matched stack
          re-execute, not just the deepest one.
        </p>
      </section>

      <section>
        <h3>Cache Cleanup</h3>
        <p>
          Cached loader results are automatically cleaned up when a navigation
          entry is <strong>disposed</strong>. The browser disposes entries when
          they are removed from the history stack (for example, when the user
          navigates forward from a point in the middle of the history stack, the
          entries ahead are discarded). The Router listens for these dispose
          events and removes the corresponding cached data.
        </p>
      </section>

      <section>
        <h3>Summary</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Navigation type</th>
              <th>Loaders run?</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Push / Replace</td>
              <td>Yes</td>
              <td>New navigation entry, no cache</td>
            </tr>
            <tr>
              <td>Traverse (Back / Forward)</td>
              <td>No</td>
              <td>Existing entry, cached results returned</td>
            </tr>
            <tr>
              <td>Reload</td>
              <td>Yes</td>
              <td>Fresh cache key generated</td>
            </tr>
            <tr>
              <td>Form submission (POST)</td>
              <td>Yes</td>
              <td>Cache cleared after action runs</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
