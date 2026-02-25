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
    </div>
  );
}
