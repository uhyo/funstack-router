import { CodeBlock } from "../components/CodeBlock.js";
import { PageHead } from "../components/PageHead.js";

export function LearnTransitionsPage() {
  return (
    <div className="learn-content">
      <PageHead
        title="Controlling Transitions"
        description="FUNSTACK Router wraps navigations in React's startTransition. Learn how transitions affect rendering and how to control them."
      />
      <h2>Controlling Transitions</h2>

      <p className="page-intro">
        FUNSTACK Router wraps navigations in React's <code>startTransition</code>, which means the
        old UI may stay visible while the new route loads. This page explains how this works and how
        to control it.
      </p>

      <section>
        <h3>Navigations as Transitions</h3>
        <p>
          When the user navigates, the Router updates its location state inside{" "}
          <code>startTransition()</code>. This means React treats navigations as transitions: if an
          existing Suspense boundary suspends (e.g., a component loading data with{" "}
          <code>use()</code>), React keeps the old UI visible instead of immediately showing the
          fallback. This behavior is{" "}
          <a href="https://react.dev/reference/react/useTransition#building-a-suspense-enabled-router">
            what React recommends for Suspense-enabled routers
          </a>
          .
        </p>
        <p>
          Consider a route with a loader that fetches data. The component uses <code>use()</code> to
          read the promise. Because the navigation happens inside a transition, the previous page
          remains on screen until the data is ready:
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
          Tagging Navigations with <code>experimentalTransitionTypes</code>
        </h3>
        <p>
          React's{" "}
          <a href="https://react.dev/reference/react/addTransitionType">
            <code>addTransitionType</code>
          </a>{" "}
          API lets you attach semantic labels to a transition so other parts of the app (e.g. View
          Transitions) can react to them. FUNSTACK Router calls <code>addTransitionType</code>{" "}
          inside its <code>startTransition</code> for every entry change, tagged{" "}
          <code>"navigation"</code> by default.
        </p>
        <p>
          You can replace the default by passing an <code>experimentalTransitionTypes</code>{" "}
          function to <code>{"<Router>"}</code>. The function receives the destination{" "}
          <code>url</code> and the underlying <code>navigationType</code> (one of <code>push</code>,{" "}
          <code>replace</code>, <code>reload</code>, <code>traverse</code>) and returns an array of
          transition types:
        </p>
        <CodeBlock language="tsx">{`<Router
  routes={routes}
  experimentalTransitionTypes={({ navigationType, url }) => [
    "navigation",
    \`navigation-\${navigationType}\`,
    url.pathname.startsWith("/admin") ? "admin" : "public",
  ]}
/>`}</CodeBlock>
        <p>
          The returned types <strong>replace</strong> the default — include{" "}
          <code>"navigation"</code> yourself if you want it.
        </p>
        <div className="callout callout-warning">
          <strong>React Canary required.</strong> At the time of writing,{" "}
          <code>addTransitionType</code> is only available in React Canary (exported as{" "}
          <code>unstable_addTransitionType</code>). On stable React, the prop is still invoked but
          the returned types are silently discarded. The prop is named with an{" "}
          <code>experimental</code> prefix to reflect this; it will be renamed once{" "}
          <code>addTransitionType</code> becomes stable in React.
        </div>
      </section>

      <section>
        <h3>
          Showing Pending UI with <code>useIsPending</code>
        </h3>
        <p>
          While a transition is in progress, the <code>useIsPending()</code> hook returns{" "}
          <code>true</code>. Use it to give users visual feedback that something is loading &mdash;
          for example, dimming the current page or showing a loading bar.
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
          The <code>isPending</code> flag is also available as a prop on route components, so you
          can use it without calling the hook:
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
        <h3>Opting Out of Transitions</h3>
        <p>
          Sometimes you want to show a loading fallback immediately instead of keeping the old UI
          visible. This is especially useful when navigating between pages that share the same route
          but with different params &mdash; for example, going from <code>/users/1</code> to{" "}
          <code>/users/2</code>, where showing stale data from user 1 while user 2 loads would be
          confusing.
        </p>
        <p>
          The technique is to add a <code>key</code> prop to a <code>{"<Suspense>"}</code> boundary
          that changes with the route params. When the key changes, React unmounts the old Suspense
          boundary and mounts a new one, immediately showing the fallback:
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
          Because the <code>key</code> changes from <code>"1"</code> to <code>"2"</code> when
          navigating between users, React discards the old Suspense boundary entirely. The new
          boundary has no resolved content yet, so it shows the fallback right away &mdash;
          bypassing the transition behavior.
        </p>
        <p>
          Use this pattern when stale content would be misleading. For navigations where the old
          page is still a reasonable placeholder (e.g., navigating between completely different
          pages), the default transition behavior is usually the better experience.
        </p>
      </section>

      <section>
        <h3>Sync State Updates Bypass Transitions</h3>
        <p>
          FUNSTACK Router allows you to save state in a navigation entry, which is useful for form
          state or other UI state that should persist when the user navigates back and forth. You
          can update this state using the <code>setState</code> and <code>resetState</code>{" "}
          functions passed to route components. These functions use a replace navigation internally,
          so they trigger a transition.
        </p>
        <p>
          In rare cases, you may want to update navigation state without triggering a transition.{" "}
          <code>setStateSync</code> and <code>resetStateSync</code> are designed for this purpose.
          When you call them, the Router updates the current history entry using the Navigation
          API's <code>updateCurrentEntry()</code> method, which does not trigger a navigation. The
          Router detects this and applies the update synchronously, outside of{" "}
          <code>startTransition</code>. As a result:
        </p>
        <ul>
          <li>The update is reflected in the UI immediately &mdash; there is no pending phase.</li>
          <li>
            <code>useIsPending()</code> (and the <code>isPending</code> prop) will{" "}
            <strong>not</strong> become <code>true</code>.
          </li>
          <li>
            If the update causes a component to suspend, React will show the fallback immediately
            instead of waiting for the transition to end.
          </li>
        </ul>
        <h4>When to Use Sync State Updates</h4>
        <p>
          When it comes to `setState` vs `setStateSync`, you can think in the same way as you would
          with wrapping state updates in `startTransition` or not. A general guideline is to{" "}
          <strong>
            just use <code>setState</code> (with transition)
          </strong>{" "}
          when you don't have a specific reason to avoid it. The exception is when the state change{" "}
          <em>already happened</em> on the screen and you just want to reflect it in the navigation
          entry state.
        </p>
        <p>
          A typical example of this is a form where you want to save the current input value in the
          navigation state, so that if the user navigates away and then back, their input is
          preserved. In this case, you would call <code>setStateSync</code> in the input's{" "}
          <code>onChange</code> handler, because the state update is already reflected in the
          input's value and you don't want to trigger a transition for this:
        </p>
        <CodeBlock language="tsx">{`function MyForm({ state, setStateSync }: { state: State; setStateSync: (state: State) => void }) {
  const [inputValue, setInputValue] = useState(state.inputValue ?? "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setStateSync({ inputValue: newValue }); // Save to navigation state without transition
  };

  return <input value={inputValue} onChange={handleChange} />;
}`}</CodeBlock>
        <p>
          In this example, using <code>setState</code> (with transition) would cause the UI to enter
          a pending state on every keystroke, which would be a poor user experience. By using{" "}
          <code>setStateSync</code>, the navigation state updates seamlessly without triggering
          transitions or pending states.
        </p>
      </section>
    </div>
  );
}
