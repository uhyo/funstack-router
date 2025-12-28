import type { RouteComponentProps } from "@funstack/router";
import { useNavigate } from "@funstack/router";

/**
 * Example: Navigation Options (replace, state, info)
 *
 * Demonstrates the different options available when navigating:
 * - replace: Replace current history entry instead of pushing
 * - state: Persistent state tied to history entry
 * - info: Ephemeral info (only available during navigation)
 */

type PageState = {
  navigatedWith: "push" | "replace";
  timestamp: number;
};

type Props = RouteComponentProps<Record<string, never>, PageState>;

export function NavigationOptionsPage({ state, info }: Props) {
  const navigate = useNavigate();

  const handlePushNavigation = () => {
    navigate("/nav-options", {
      state: {
        navigatedWith: "push",
        timestamp: Date.now(),
      },
      info: { source: "push-button", message: "Hello from push!" },
    });
  };

  const handleReplaceNavigation = () => {
    navigate("/nav-options", {
      replace: true,
      state: {
        navigatedWith: "replace",
        timestamp: Date.now(),
      },
      info: { source: "replace-button", message: "Hello from replace!" },
    });
  };

  const handleExternalWithState = () => {
    navigate("/about", {
      state: { referrer: "/nav-options" },
      info: { tracking: "nav-options-demo" },
    });
  };

  return (
    <div>
      <h1>Navigation Options Demo</h1>
      <p style={{ color: "#666" }}>
        Explore different navigation options: <code>replace</code>,{" "}
        <code>state</code>, and <code>info</code>.
      </p>

      <div
        style={{
          display: "grid",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#e8f5e9",
            borderRadius: "4px",
          }}
        >
          <h3>Current State (persistent)</h3>
          {state ? (
            <pre style={{ margin: 0, overflow: "auto" }}>
              {JSON.stringify(state, null, 2)}
            </pre>
          ) : (
            <p style={{ color: "#666", margin: 0 }}>
              No state yet. Click a button below!
            </p>
          )}
        </div>

        <div
          style={{
            padding: "1rem",
            backgroundColor: "#e3f2fd",
            borderRadius: "4px",
          }}
        >
          <h3>Current Info (ephemeral)</h3>
          {info ? (
            <pre style={{ margin: 0, overflow: "auto" }}>
              {JSON.stringify(info, null, 2)}
            </pre>
          ) : (
            <p style={{ color: "#666", margin: 0 }}>
              No info. Info is only available immediately after navigation.
              <br />
              If you refreshed or used back/forward, info is gone.
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={handlePushNavigation}>
          Push Navigation (adds history)
        </button>
        <button onClick={handleReplaceNavigation}>
          Replace Navigation (no new history)
        </button>
        <button onClick={handleExternalWithState}>
          Go to About with State
        </button>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>Navigation Options:</h3>
        <ul style={{ lineHeight: "1.8" }}>
          <li>
            <code>replace: true</code> - Replaces current history entry (no back
            button)
          </li>
          <li>
            <code>state</code> - Persistent state tied to history entry
            (survives refresh)
          </li>
          <li>
            <code>info</code> - Ephemeral info for this navigation only (lost on
            refresh)
          </li>
        </ul>
        <h4>Example usage:</h4>
        <pre
          style={{
            backgroundColor: "#fff",
            padding: "0.5rem",
            overflow: "auto",
          }}
        >{`navigate("/page", {
  replace: true,           // Optional: replace instead of push
  state: { foo: "bar" },   // Optional: persistent state
  info: { temp: "data" },  // Optional: ephemeral info
});`}</pre>
      </div>
    </div>
  );
}
