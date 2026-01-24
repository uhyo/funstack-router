import { CodeBlock } from "../components/CodeBlock.js";

export function LearnNavigationApiPage() {
  return (
    <div className="learn-content">
      <h2>Navigation API</h2>

      <p className="page-intro">
        FUNSTACK Router is built on the{" "}
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API"
          target="_blank"
          rel="noopener noreferrer"
        >
          Navigation API
        </a>
        , a modern browser API that provides a unified way to handle navigation.
        This guide explains the key differences from the older History API and
        the benefits this brings to your application.
      </p>

      <section>
        <h3>History API Limitations</h3>
        <p>
          The History API has been the foundation of single-page application
          routing for years, but it comes with significant limitations that make
          building routers more complex than necessary.
        </p>
        <p>
          <strong>Reactive, not proactive:</strong> The <code>popstate</code>{" "}
          event fires <em>after</em> navigation has already occurred. This makes
          it difficult to intercept navigation, perform async operations like
          data fetching, or cancel navigation based on conditions.
        </p>
        <CodeBlock language="typescript">{`// History API: popstate fires AFTER navigation
window.addEventListener("popstate", (event) => {
  // Too late! The URL has already changed.
  // We can only react to what happened.
  console.log("Navigated to:", location.pathname);
});

// For programmatic navigation, we must manually call pushState
// AND then update the UI ourselves
history.pushState(null, "", "/new-page");
updateUI(); // Manually trigger UI update`}</CodeBlock>
        <p>
          <strong>Fragmented event model:</strong> Different navigation types
          require different handling. Browser back/forward triggers{" "}
          <code>popstate</code>, but <code>pushState</code> and{" "}
          <code>replaceState</code> don't trigger any events. This leads to
          scattered navigation logic.
        </p>
        <p>
          <strong>Custom Link components required:</strong> Since clicking an{" "}
          <code>{"<a>"}</code> tag causes a full page reload, routers must
          provide custom <code>{"<Link>"}</code> components that intercept
          clicks and call <code>pushState</code> instead.
        </p>
      </section>

      <section>
        <h3>The Navigation API Paradigm</h3>
        <p>
          The Navigation API fundamentally changes how navigation works by
          providing a single <code>navigate</code> event that fires{" "}
          <em>before</em> navigation commits. This allows routers to intercept
          and handle navigation declaratively.
        </p>
        <CodeBlock language="typescript">{`// Navigation API: navigate event fires BEFORE navigation
navigation.addEventListener("navigate", (event) => {
  // Navigation hasn't happened yet - we can intercept it!
  const url = new URL(event.destination.url);

  // Check the navigation type
  console.log(event.navigationType); // "push", "replace", "reload", or "traverse"

  // Intercept and handle with async operations
  event.intercept({
    async handler() {
      // Fetch data, render components, etc.
      const data = await fetchPageData(url.pathname);
      renderPage(data);
      // Navigation completes when handler resolves
    }
  });
});`}</CodeBlock>
        <p>Key benefits of this approach:</p>
        <ul>
          <li>
            <strong>Single unified event</strong> &mdash; All navigation types
            (link clicks, back/forward, programmatic) trigger the same{" "}
            <code>navigate</code> event
          </li>
          <li>
            <strong>Interception with async support</strong> &mdash; The{" "}
            <code>intercept()</code> method lets you run async handlers before
            navigation completes
          </li>
          <li>
            <strong>Built-in navigation type detection</strong> &mdash;{" "}
            <code>event.navigationType</code> tells you exactly what kind of
            navigation occurred
          </li>
        </ul>
      </section>

      <section>
        <h3>
          Native <code>{"<a>"}</code> Elements for SPA Links
        </h3>
        <p>
          One of the most practical benefits of the Navigation API is that
          standard <code>{"<a>"}</code> elements work for SPA navigation without
          any special handling. The router intercepts navigation events from
          native links automatically.
        </p>
        <CodeBlock language="tsx">{`// With FUNSTACK Router, native <a> elements just work!
function Navigation() {
  return (
    <nav>
      {/* These are standard HTML anchor tags */}
      <a href="/home">Home</a>
      <a href="/about">About</a>
      <a href="/users/123">User Profile</a>
    </nav>
  );
}

// No special <Link> component needed for basic navigation
// The router intercepts the navigate event and handles it as SPA navigation`}</CodeBlock>
        <p>
          This means you can use standard HTML in your components, and
          navigation "just works". The router intercepts same-origin navigation
          events and handles them without a full page reload.
        </p>
        <p>This approach has several advantages over custom Link components:</p>
        <ul>
          <li>
            <strong>Standard HTML</strong> &mdash; No need to import and use
            special components for every link
          </li>
          <li>
            <strong>Progressive enhancement</strong> &mdash; Links work even if
            JavaScript fails to load
          </li>
          <li>
            <strong>Familiar patterns</strong> &mdash; Developers can use the{" "}
            <code>{"<a>"}</code> tag they already know
          </li>
        </ul>
      </section>

      <section>
        <h3>Accessing Navigation API Events</h3>
        <p>
          While FUNSTACK Router handles navigation for you, you can interact
          directly with the Navigation API when needed. This is useful for
          features like scroll-to-top behavior or analytics tracking.
        </p>
        <CodeBlock language="tsx">{`import { useEffect } from "react";

function App() {
  useEffect(() => {
    const navigation = window.navigation;
    if (!navigation) return;

    const controller = new AbortController();

    // Listen for successful navigation completion
    navigation.addEventListener(
      "navigatesuccess",
      () => {
        const transition = navigation.transition;

        // Scroll to top on push/replace navigation
        if (
          transition.navigationType === "push" ||
          transition.navigationType === "replace"
        ) {
          window.scrollTo(0, 0);
        }

        // Track page view for analytics
        analytics.trackPageView(location.pathname);
      },
      { signal: controller.signal }
    );

    return () => controller.abort();
  }, []);

  return <Router routes={routes} />;
}`}</CodeBlock>
        <p>
          The <code>navigatesuccess</code> event fires after navigation
          completes successfully, making it ideal for post-navigation actions.
          You can also use <code>navigation.transition</code> to track in-flight
          navigations or implement loading indicators.
        </p>
      </section>

      <section>
        <h3>Other Navigation API Features</h3>
        <p>
          The Navigation API provides several advanced features that you can
          leverage directly when needed:
        </p>
        <ul>
          <li>
            <strong>NavigationHistoryEntry</strong> &mdash; Each history entry
            has a unique <code>id</code> and <code>key</code>, plus a{" "}
            <code>dispose</code> event that fires when the entry is removed from
            history
          </li>
          <li>
            <strong>
              Ephemeral <code>info</code>
            </strong>{" "}
            &mdash; Pass non-persisted context data during navigation via{" "}
            <code>navigation.navigate(url, {"{ info }"}))</code>
          </li>
          <li>
            <strong>updateCurrentEntry()</strong> &mdash; Update the current
            entry's state without creating a new history entry
          </li>
          <li>
            <strong>navigation.entries()</strong> &mdash; Access the full
            navigation history stack programmatically
          </li>
        </ul>
        <p>
          For more details, see the{" "}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API"
            target="_blank"
            rel="noopener noreferrer"
          >
            MDN Navigation API documentation
          </a>
          .
        </p>
      </section>

      <section>
        <h3>Key Takeaways</h3>
        <ul>
          <li>
            <strong>Navigation API intercepts BEFORE navigation</strong> &mdash;
            Unlike the History API's reactive <code>popstate</code>, the{" "}
            <code>navigate</code> event fires before navigation commits
          </li>
          <li>
            <strong>
              Native <code>{"<a>"}</code> elements work
            </strong>{" "}
            &mdash; No special Link component required for SPA navigation; the
            router intercepts standard anchor tags automatically
          </li>
          <li>
            <strong>Single unified event</strong> &mdash; All navigation types
            (push, replace, traverse, reload) trigger the same{" "}
            <code>navigate</code> event
          </li>
          <li>
            <strong>Direct API access when needed</strong> &mdash; Use events
            like <code>navigatesuccess</code> for scroll restoration, analytics,
            or other post-navigation actions
          </li>
        </ul>
      </section>
    </div>
  );
}
