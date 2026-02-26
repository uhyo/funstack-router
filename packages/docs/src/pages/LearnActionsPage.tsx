import { CodeBlock } from "../components/CodeBlock.js";

export function LearnActionsPage() {
  return (
    <div className="learn-content">
      <h2>Form Actions</h2>

      <p className="page-intro">
        FUNSTACK Router can intercept <code>{"<form>"}</code> submissions and
        run an <strong>action</strong> function on the client before navigation
        occurs. This guide explains how actions work, when to use them, and
        important considerations for progressive enhancement.
      </p>

      <div className="callout warning">
        <p className="callout-title">Important: Progressive Enhancement</p>
        <p>
          A <code>{'<form method="post">'}</code> should work even{" "}
          <strong>before JavaScript has loaded</strong>. The browser natively
          submits POST forms to the server, so your server must be prepared to
          handle these requests. The router&rsquo;s <code>action</code> function
          is a <strong>client-side shortcut</strong> that runs only after
          hydration &mdash; it does not replace server-side form handling.
        </p>
        <p>
          If your server cannot handle the POST request, users on slow
          connections, users with JavaScript disabled, or users who submit the
          form before hydration completes will experience a broken form. Always
          ensure your server handles POST submissions for the same URL as a
          baseline.
        </p>
      </div>

      <section>
        <h3>How It Works</h3>
        <p>
          When a <code>{'<form method="post">'}</code> is submitted, the router
          matches the form&rsquo;s destination URL against the route
          definitions. If a matched route defines an <code>action</code>, the
          router intercepts the submission via the Navigation API instead of
          letting the browser send it to the server. The flow is:
        </p>
        <ol>
          <li>
            User submits a form with <code>method="post"</code>
          </li>
          <li>
            The Navigation API fires a <code>navigate</code> event with{" "}
            <code>formData</code>
          </li>
          <li>
            The router finds the deepest matched route that has an{" "}
            <code>action</code>
          </li>
          <li>
            The <code>action</code> function runs with the form data wrapped in
            a <code>Request</code>
          </li>
          <li>
            The action&rsquo;s return value is passed to the route&rsquo;s{" "}
            <code>loader</code> as <code>actionResult</code>
          </li>
          <li>The loader runs and the UI updates with fresh data</li>
        </ol>
        <p>
          If the matched route does <strong>not</strong> define an action, the
          router does not intercept the submission and the browser sends it to
          the server as a normal POST request.
        </p>
      </section>

      <section>
        <h3>Defining an Action</h3>
        <p>
          Add an <code>action</code> function to your route definition. It
          receives an <code>ActionArgs</code> object with the route params, a{" "}
          <code>Request</code>, and an <code>AbortSignal</code>:
        </p>
        <CodeBlock language="tsx">{`import { route } from "@funstack/router";

const editRoute = route({
  path: "/posts/:postId/edit",
  action: async ({ params, request, signal }) => {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const body = formData.get("body") as string;

    const res = await fetch(\`/api/posts/\${params.postId}\`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
      signal,
    });
    return res.json();
  },
  loader: async ({ params, actionResult, signal }) => {
    // After a successful action, actionResult contains
    // the return value. On normal navigations it is undefined.
    const res = await fetch(\`/api/posts/\${params.postId}\`, { signal });
    return res.json();
  },
  component: EditPostPage,
});`}</CodeBlock>
      </section>

      <section>
        <h3>The Form</h3>
        <p>
          Use a standard HTML <code>{"<form>"}</code> element with{" "}
          <code>method="post"</code>. There is no special form component needed
          &mdash; the router hooks into the Navigation API which intercepts
          native form submissions:
        </p>
        <CodeBlock language="tsx">{`function EditPostPage({ data, params }: EditPostProps) {
  return (
    <form method="post" action={\`/posts/\${params.postId}/edit\`}>
      <input name="title" defaultValue={data.title} />
      <textarea name="body" defaultValue={data.body} />
      <button type="submit">Save</button>
    </form>
  );
}`}</CodeBlock>
        <p>
          Note that the form&rsquo;s <code>action</code> attribute points to the
          same URL that the route matches. This is essential for progressive
          enhancement: before hydration, the browser will POST to this URL on
          the server.
        </p>
      </section>

      <section>
        <h3>Progressive Enhancement in Detail</h3>
        <p>
          The action feature is designed as an{" "}
          <strong>enhancement layer</strong>. The baseline behavior of a POST
          form is a server round-trip, and the router&rsquo;s action provides a
          faster, client-side alternative once hydration is complete. This
          means:
        </p>
        <ul>
          <li>
            <strong>Before hydration</strong> &mdash; The browser submits the
            form to the server as a normal POST request. Your server must handle
            it and return an appropriate response (typically a redirect or a
            re-rendered page).
          </li>
          <li>
            <strong>After hydration</strong> &mdash; The router intercepts the
            submission, runs your <code>action</code> function on the client,
            and updates the UI without a full page reload.
          </li>
        </ul>
        <p>
          Both paths should produce the same end result for the user. The client
          action is a shortcut, not a replacement.
        </p>

        <div className="callout warning">
          <p className="callout-title">
            When your server cannot handle POST requests
          </p>
          <p>
            If you are building a purely client-side application (e.g. a SPA
            with no server-side form handling), consider using React 19&rsquo;s{" "}
            <code>{"<form action={fn}>"}</code> pattern instead. When a form
            action is a <strong>function</strong> rather than a URL, the browser
            will not attempt a server round-trip on submission. Note that in a
            client-only app the form will not work until React hydrates, since
            the function only exists in the JavaScript bundle.
          </p>
          <p>
            In contrast, FUNSTACK Router&rsquo;s <code>action</code> intercepts
            URL-based form submissions. If the client has not hydrated yet, the
            browser will POST to the URL, which will fail without server
            handling.
          </p>
        </div>
      </section>

      <section>
        <h3>Action Result and Loader</h3>
        <p>
          When a route defines both an <code>action</code> and a{" "}
          <code>loader</code>, the loader runs after the action completes. The
          action&rsquo;s return value is passed to the loader via the{" "}
          <code>actionResult</code> parameter:
        </p>
        <CodeBlock language="typescript">{`action: async ({ request }) => {
  const formData = await request.formData();
  // ... process form
  return { success: true, message: "Saved!" };
},
loader: async ({ params, actionResult, signal }) => {
  // actionResult is { success: true, message: "Saved!" }
  // after the action, or undefined on normal navigation
  const data = await fetchData(params.id, signal);
  return { ...data, actionResult };
},`}</CodeBlock>
        <p>
          This lets your UI display feedback from the action (e.g. success
          messages or validation errors) alongside the refreshed data.
        </p>
      </section>

      <section>
        <h3>Summary</h3>
        <ul>
          <li>
            <code>action</code> intercepts POST form submissions on the client
            after hydration
          </li>
          <li>
            Your server must handle the same POST endpoint for progressive
            enhancement
          </li>
          <li>
            The action&rsquo;s return value flows to the loader as{" "}
            <code>actionResult</code>
          </li>
          <li>
            For SPAs without server-side form handling, prefer React 19&rsquo;s{" "}
            <code>{"<form action={fn}>"}</code> pattern
          </li>
        </ul>
      </section>
    </div>
  );
}
