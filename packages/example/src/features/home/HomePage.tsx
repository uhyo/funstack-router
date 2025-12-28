export function HomePage() {
  return (
    <div>
      <h1>Welcome to FUNSTACK Router</h1>
      <p>This is a demo of the router based on the Navigation API.</p>

      <h2>Core Features:</h2>
      <ul>
        <li>
          <a href="/about">Basic navigation</a> - Native &lt;a&gt; tags +{" "}
          <code>useNavigate()</code> hook
        </li>
        <li>
          <a href="/users">Data loaders with Suspense</a> - Async data fetching
          with caching
        </li>
        <li>
          <a href="/users/1">Route parameters</a> - Dynamic params like{" "}
          <code>:id</code>
        </li>
        <li>
          <a href="/search?q=hello&page=1">Search parameters</a> -{" "}
          <code>useSearchParams()</code> hook
        </li>
      </ul>

      <h2>Advanced Features:</h2>
      <ul>
        <li>
          <a href="/edit">Navigation Blocking</a> - <code>useBlocker</code> hook
          for unsaved changes
        </li>
        <li>
          <a href="/counter">Route State</a> - <code>setState</code>,{" "}
          <code>setStateSync</code>, <code>resetState</code>
        </li>
        <li>
          <a href="/nav-options">Navigation Options</a> - <code>replace</code>,{" "}
          <code>state</code>, <code>info</code> options
        </li>
        <li>
          <a href="/settings/profile">Nested Routing</a> - Multi-level layouts
          with <code>&lt;Outlet&gt;</code>
        </li>
      </ul>

      <h2>UI Patterns:</h2>
      <ul>
        <li>
          <strong>Active Link Styling</strong> - See navigation bar above (uses{" "}
          <code>useLocation</code>)
        </li>
        <li>
          <strong>Analytics Callback</strong> - Check console for{" "}
          <code>onNavigate</code> logs
        </li>
      </ul>

      <h2>Data Loader Features:</h2>
      <ul>
        <li>
          Loaders execute before component renders (parallel with navigation)
        </li>
        <li>Results are cached - instant back/forward navigation</li>
        <li>Components receive loader result as a prop</li>
        <li>
          For async loaders, use React&apos;s <code>use()</code> hook with
          Suspense
        </li>
      </ul>
    </div>
  );
}
