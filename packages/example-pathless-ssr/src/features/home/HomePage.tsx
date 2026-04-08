export function HomePage() {
  return (
    <div className="home">
      <h2>Welcome to Recipe Book</h2>
      <p>
        This app demonstrates <strong>pathless SSR</strong> with FUNSTACK
        Router. The <code>&lt;Router&gt;</code> has no <code>ssr</code> prop, so
        during SSR only pathless routes (the layout shell) are rendered.
        Path-based content fills in on client hydration.
      </p>

      <div className="home-cards">
        <a href="/recipes" className="home-card">
          <h3>Recipes</h3>
          <p>
            Browse and create recipes. Demonstrates loaders, actions, and route
            params.
          </p>
        </a>
        <a href="/recipes/new" className="home-card">
          <h3>New Recipe</h3>
          <p>Add a new recipe. Demonstrates form actions with POST handling.</p>
        </a>
        <a href="/favorites" className="home-card">
          <h3>Favorites</h3>
          <p>
            View your favorite recipes. Demonstrates loaders and route state for
            sort preferences.
          </p>
        </a>
      </div>

      <section className="home-info">
        <h3>How Pathless SSR Works</h3>
        <ul>
          <li>
            The root <code>Layout</code> is a <strong>pathless route</strong>{" "}
            (no <code>path</code> property) &mdash; it always matches
          </li>
          <li>
            During SSR, the Router renders only pathless routes as an{" "}
            <strong>app shell</strong> (header, footer, navigation)
          </li>
          <li>
            Path-based routes (like this page) render on the{" "}
            <strong>client after hydration</strong>
          </li>
          <li>
            This contrasts with pathful SSR where{" "}
            <code>ssr=&#123;&#123; path &#125;&#125;</code> is passed to render
            full page content during SSR
          </li>
        </ul>
      </section>
    </div>
  );
}
