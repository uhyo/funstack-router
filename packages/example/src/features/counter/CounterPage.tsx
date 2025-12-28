import type { RouteComponentProps } from "@funstack/router";

/**
 * Example: Route State Management
 *
 * This demonstrates setState, setStateSync, and resetState for
 * managing per-route navigation state that persists across
 * back/forward navigation.
 */

type CounterState = {
  count: number;
  lastUpdated: string;
};

type Props = RouteComponentProps<Record<string, never>, CounterState>;

export function CounterPage({
  state,
  setState,
  setStateSync,
  resetState,
}: Props) {
  const count = state?.count ?? 0;
  const lastUpdated = state?.lastUpdated ?? "Never";

  // Async state update (creates a new history entry with replace)
  const incrementAsync = async () => {
    await setState({
      count: count + 1,
      lastUpdated: new Date().toLocaleTimeString(),
    });
  };

  // Sync state update (updates current entry without navigation)
  const incrementSync = () => {
    setStateSync({
      count: count + 1,
      lastUpdated: new Date().toLocaleTimeString(),
    });
  };

  // Functional update (access previous state)
  const decrementSync = () => {
    setStateSync((prev) => ({
      count: (prev?.count ?? 0) - 1,
      lastUpdated: new Date().toLocaleTimeString(),
    }));
  };

  return (
    <div>
      <h1>Counter (Route State Demo)</h1>
      <p style={{ color: "#666" }}>
        This counter&apos;s value is stored in the navigation history. Try
        changing the value, then navigate away and use the browser&apos;s back
        button.
      </p>

      <div
        style={{
          fontSize: "2rem",
          margin: "1rem 0",
          padding: "1rem",
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <strong>Count: {count}</strong>
        <div style={{ fontSize: "0.8rem", color: "#666" }}>
          Last updated: {lastUpdated}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={incrementAsync}>+ Async (setState)</button>
        <button onClick={incrementSync}>+ Sync (setStateSync)</button>
        <button onClick={decrementSync}>- Sync (setStateSync)</button>
        <button onClick={resetState}>Reset (resetState)</button>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>How it works:</h3>
        <ul style={{ lineHeight: "1.8" }}>
          <li>
            <code>setState</code> - Async, creates a replace navigation
          </li>
          <li>
            <code>setStateSync</code> - Sync, uses updateCurrentEntry
          </li>
          <li>
            <code>resetState</code> - Clears state back to undefined
          </li>
        </ul>
        <h4>Route definition with typed state:</h4>
        <pre
          style={{
            backgroundColor: "#fff",
            padding: "0.5rem",
            overflow: "auto",
          }}
        >{`type CounterState = { count: number; lastUpdated: string };

routeState<CounterState>()({
  path: "counter",
  component: CounterPage,
});`}</pre>
      </div>
    </div>
  );
}
