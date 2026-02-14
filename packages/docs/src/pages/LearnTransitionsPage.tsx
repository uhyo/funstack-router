import { CodeBlock } from "../components/CodeBlock.js";

export function LearnTransitionsPage() {
  return (
    <div className="learn-content">
      <h2>Controlling Transitions</h2>

      <p className="page-intro">
        FUNSTACK Router wraps navigations in React's{" "}
        <code>startTransition</code>, which means the old UI may stay visible
        while the new route loads. Sync state updates (<code>setStateSync</code>{" "}
        and <code>resetStateSync</code>) bypass transitions entirely for
        immediate responsiveness. This page explains how this works and how to
        control it.
      </p>

      <section>
        <h3>Navigations as Transitions</h3>
        <p>
          When the user navigates, the Router updates its location state inside{" "}
          <code>startTransition()</code>. This means React treats navigations as
          transitions: if an existing Suspense boundary suspends (e.g., a
          component loading data with <code>use()</code>), React keeps the old
          UI visible instead of immediately showing the fallback. This behavior
          is{" "}
          <a href="https://react.dev/reference/react/useTransition#building-a-suspense-enabled-router">
            what React recommends for Suspense-enabled routers
          </a>
          .
        </p>
        <p>
          Consider a route with a loader that fetches data. The component uses{" "}
          <code>use()</code> to read the promise. Because the navigation happens
          inside a transition, the previous page remains on screen until the
          data is ready:
        </p>
        <CodeBlock language="tsx">{`const routes = [
  route({
    path: "/user/:id",
    loader: ({ params }) => fetchUser(params.id),
    component: UserDetailPage,
  }),
];

// The route component receives the Promise and provides a Suspense boundary
function UserDetailPage({ data }: { data: Promise<User> }) {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <UserDetail data={data} />
    </Suspense>
  );
}

// A child component uses use() to read the data
function UserDetail({ data }: { data: Promise<User> }) {
  const user = use(data);
  return <div>{user.name}</div>;
}

// When navigating from /user/1 to /user/2:
// → The /user/1 page stays visible while /user/2 data loads
// → Once loaded, the UI swaps to /user/2 instantly`}</CodeBlock>
      </section>

      <section>
        <h3>
          Showing Pending UI with <code>useIsPending</code>
        </h3>
        <p>
          While a transition is in progress, the <code>useIsPending()</code>{" "}
          hook returns <code>true</code>. Use it to give users visual feedback
          that something is loading &mdash; for example, dimming the current
          page or showing a loading bar.
        </p>
        <CodeBlock language="tsx">{`import { useIsPending, Outlet } from "@funstack/router";

function Layout() {
  const isPending = useIsPending();
  return (
    <div>
      {isPending && <div className="loading-bar" />}
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        <Outlet />
      </div>
    </div>
  );
}`}</CodeBlock>
        <p>
          The <code>isPending</code> flag is also available as a prop on route
          components, so you can use it without calling the hook:
        </p>
        <CodeBlock language="tsx">{`function Layout({ isPending }: { isPending: boolean }) {
  return (
    <div style={{ opacity: isPending ? 0.6 : 1 }}>
      <Outlet />
    </div>
  );
}`}</CodeBlock>
      </section>

      <section>
        <h3>Sync State Updates Bypass Transitions</h3>
        <p>
          Not every state change needs the transition treatment.{" "}
          <code>setStateSync</code> and <code>resetStateSync</code> use the
          Navigation API's <code>updateCurrentEntry()</code> method, which
          changes state without performing a navigation. The router detects this
          and applies the update synchronously &mdash; outside of{" "}
          <code>startTransition</code>. As a result:
        </p>
        <ul>
          <li>
            The update is reflected in the UI immediately &mdash; there is no
            pending phase.
          </li>
          <li>
            <code>useIsPending()</code> (and the <code>isPending</code> prop)
            will <strong>not</strong> become <code>true</code>.
          </li>
        </ul>
        <p>
          This makes <code>setStateSync</code> ideal for high-frequency or
          low-latency updates such as tracking scroll position, toggling UI
          elements, or updating form state that is stored in navigation state.
        </p>
        <CodeBlock language="tsx">{`function ProductList({ state, setStateSync }: Props) {
  const sortBy = state?.sortBy ?? "name";

  return (
    <select
      value={sortBy}
      onChange={(e) =>
        // Synchronous, no transition, no isPending flicker
        setStateSync({ sortBy: e.target.value })
      }
    >
      <option value="name">Sort by Name</option>
      <option value="price">Sort by Price</option>
    </select>
  );
}`}</CodeBlock>
        <p>
          In contrast, <code>setState</code> performs a replace navigation
          internally, so it <em>does</em> go through{" "}
          <code>startTransition</code> and may set <code>isPending</code> to{" "}
          <code>true</code> if the resulting render suspends.
        </p>
      </section>

      <section>
        <h3>Opting Out of Transitions</h3>
        <p>
          Sometimes you want to show a loading fallback immediately instead of
          keeping the old UI visible. This is especially useful when navigating
          between pages that share the same route but with different params
          &mdash; for example, going from <code>/users/1</code> to{" "}
          <code>/users/2</code>, where showing stale data from user 1 while user
          2 loads would be confusing.
        </p>
        <p>
          The technique is to add a <code>key</code> prop to a{" "}
          <code>{"<Suspense>"}</code> boundary that changes with the route
          params. When the key changes, React unmounts the old Suspense boundary
          and mounts a new one, immediately showing the fallback:
        </p>
        <CodeBlock language="tsx">{`import { Suspense } from "react";

function UserDetailPage({
  params,
  data,
}: {
  params: { id: string };
  data: Promise<User>;
}) {
  return (
    <Suspense key={params.id} fallback={<LoadingSpinner />}>
      <UserDetail data={data} />
    </Suspense>
  );
}`}</CodeBlock>
        <p>
          Because the <code>key</code> changes from <code>"1"</code> to{" "}
          <code>"2"</code> when navigating between users, React discards the old
          Suspense boundary entirely. The new boundary has no resolved content
          yet, so it shows the fallback right away &mdash; bypassing the
          transition behavior.
        </p>
        <p>
          Use this pattern when stale content would be misleading. For
          navigations where the old page is still a reasonable placeholder
          (e.g., navigating between completely different pages), the default
          transition behavior is usually the better experience.
        </p>
      </section>
    </div>
  );
}
