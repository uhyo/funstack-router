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
    state: { from: "home" },  // Persistent state (survives back/forward)
    info: { referrer: "home" },  // Ephemeral info (only for this navigation)
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

      <article className="api-item">
        <h3>
          <code>useBlocker(options)</code>
        </h3>
        <p>
          Prevents navigation away from the current route. Useful for scenarios
          like unsaved form data, ongoing file uploads, or any state that would
          be lost on navigation.
        </p>
        <CodeBlock language="tsx">{`import { useBlocker } from "@funstack/router";
import { useState, useCallback } from "react";

function EditForm() {
  const [isDirty, setIsDirty] = useState(false);

  useBlocker({
    shouldBlock: useCallback(() => {
      if (isDirty) {
        return !confirm("You have unsaved changes. Leave anyway?");
      }
      return false;
    }, [isDirty]),
  });

  const handleSave = () => {
    // Save logic...
    setIsDirty(false);
  };

  return (
    <form>
      <input onChange={() => setIsDirty(true)} />
      <button type="button" onClick={handleSave}>
        Save
      </button>
    </form>
  );
}`}</CodeBlock>
        <h4>Options</h4>
        <ul>
          <li>
            <code>shouldBlock</code>: A function that returns <code>true</code>{" "}
            to block navigation, or <code>false</code> to allow it. You can call{" "}
            <code>confirm()</code> inside this function to show a confirmation
            dialog. Wrap with <code>useCallback</code> when the function depends
            on state.
          </li>
        </ul>
        <h4>Notes</h4>
        <ul>
          <li>
            Multiple blockers can coexist in the component tree. If any blocker
            returns <code>true</code>, navigation is blocked.
          </li>
          <li>
            This hook only handles SPA navigations (links, programmatic
            navigation). For hard navigations (tab close, refresh), handle{" "}
            <code>beforeunload</code> separately.
          </li>
        </ul>
      </article>
    </div>
  );
}
