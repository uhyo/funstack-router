export function HomePage() {
  return (
    <div>
      <h1>Welcome to FUNSTACK Router</h1>
      <p>This is a demo of the router based on the Navigation API.</p>
      <h2>Features demonstrated:</h2>
      <ul>
        <li>
          <a href="/about">Basic navigation</a> (native &lt;a&gt; tag)
        </li>
        <li>
          <a href="/users">Data loaders with Suspense</a> - async data fetching
        </li>
        <li>
          <a href="/users/1">Route parameters with loaders</a>
        </li>
        <li>
          <a href="/search?q=hello&page=1">Search parameters</a>
        </li>
        <li>
          See About page for <code>useNavigate()</code> hook demo
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
          For async loaders, use React's <code>use()</code> hook with Suspense
        </li>
      </ul>
    </div>
  );
}
