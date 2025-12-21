import { CodeBlock } from "../components/CodeBlock";

export function ApiHooksPage() {
  return (
    <div className="page docs-page api-page">
      <h1>Hooks</h1>
      <p className="page-intro">
        React hooks for accessing router state and navigation.
      </p>

      <article className="api-item">
        <h3>
          <code>useNavigate()</code>
        </h3>
        <p>Returns a function to programmatically navigate.</p>
        <CodeBlock language="tsx">{`import { useNavigate } from "@funstack/router";

function MyComponent() {
  const navigate = useNavigate();

  // Navigate to a path
  navigate("/about");

  // Navigate with options
  navigate("/users/123", {
    replace: true,  // Replace current history entry
    state: { from: "home" },  // Pass state data
  });
}`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>useLocation()</code>
        </h3>
        <p>Returns the current location object.</p>
        <CodeBlock language="tsx">{`import { useLocation } from "@funstack/router";

function MyComponent() {
  const location = useLocation();

  console.log(location.pathname);  // "/users/123"
  console.log(location.search);    // "?tab=profile"
  console.log(location.hash);      // "#section"
}`}</CodeBlock>
      </article>

      <article className="api-item">
        <h3>
          <code>useSearchParams()</code>
        </h3>
        <p>
          Returns a tuple of the current search params and a setter function.
        </p>
        <CodeBlock language="tsx">{`import { useSearchParams } from "@funstack/router";

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q");

  const handleSearch = (newQuery: string) => {
    setSearchParams({ q: newQuery });
  };
}`}</CodeBlock>
      </article>
    </div>
  );
}
