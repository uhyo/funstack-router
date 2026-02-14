# Design: Bypass React Transitions for `setStateSync`

## Problem

Currently, **every** `currententrychange` event from the Navigation API triggers a React transition:

```typescript
// Router.tsx, lines 102-109
useEffect(() => {
  return adapter.subscribe(() => {
    startTransition(() => {
      setLocationEntry(adapter.getSnapshot());
    });
  });
}, [adapter, startTransition]);
```

Both actual navigations (`navigation.navigate()`) and state-only updates (`navigation.updateCurrentEntry()`) fire the same `currententrychange` event. This means `setStateSync` — which calls `updateCurrentEntryState` → `navigation.updateCurrentEntry()` — is wrapped in `startTransition`, causing three issues:

1. **Defeats synchronous intent.** `setStateSync` is supposed to update state synchronously within the current React render batch. `startTransition` marks the update as low-priority and defers it.
2. **Misleading `isPending`.** `isPending` briefly becomes `true` even though no navigation is happening — no URL change, no loader execution, no route matching change.
3. **Unnecessary transition overhead.** State-only updates don't need Suspense-aware transition semantics.

`resetState` has the same issue since it also calls `updateCurrentEntryState`.

## Current Flow

### Navigation (URL change)

```
navigate() → navigation.navigate() → navigate event → intercept →
  currententrychange → startTransition → setLocationEntry → re-render (transition)
```

### setStateSync (state-only update)

```
setStateSync() → updateCurrentEntryState() → navigation.updateCurrentEntry() →
  currententrychange → startTransition → setLocationEntry → re-render (transition) ← WRONG
```

## Desired Flow

### Navigation: unchanged

### setStateSync (state-only update)

```
setStateSync() → updateCurrentEntryState() → navigation.updateCurrentEntry() →
  currententrychange → setLocationEntry → re-render (synchronous, no transition)
```

## Key Insight: `NavigationCurrentEntryChangeEvent.navigationType`

The `currententrychange` event is a [`NavigationCurrentEntryChangeEvent`](https://developer.mozilla.org/en-US/docs/Web/API/NavigationCurrentEntryChangeEvent) with a `navigationType` property:

| Cause                                              | `navigationType` value |
| -------------------------------------------------- | ---------------------- |
| `navigation.navigate()` (push)                     | `"push"`               |
| `navigation.navigate()` (replace)                  | `"replace"`            |
| `navigation.reload()`                              | `"reload"`             |
| `navigation.traverseTo()` / `back()` / `forward()` | `"traverse"`           |
| `navigation.updateCurrentEntry()`                  | `null`                 |

When `navigationType` is `null`, the change was caused by `updateCurrentEntry()` — not a navigation. This is the native discrimination signal.

## Proposed Solution

### Overview

1. Change `RouterAdapter.subscribe` to pass the change type to its callback.
2. In `NavigationAPIAdapter`, check `event.navigationType` to determine the type.
3. In `Router`, conditionally wrap in `startTransition` based on the type.

### Step 1: Extend the `RouterAdapter` interface

**File: `packages/router/src/core/RouterAdapter.ts`**

```typescript
/**
 * The type of change that caused a location entry update.
 * - "navigation": A URL navigation (push, replace, reload, traverse)
 * - "state": A state-only update via updateCurrentEntry()
 */
export type EntryChangeType = "navigation" | "state";

export interface RouterAdapter {
  // ...existing methods...

  /**
   * Subscribe to location changes.
   * The callback receives the type of change that occurred.
   * Returns an unsubscribe function.
   */
  subscribe(callback: (changeType: EntryChangeType) => void): () => void;
}
```

### Step 2: Update `NavigationAPIAdapter.subscribe`

**File: `packages/router/src/core/NavigationAPIAdapter.ts`**

Use `event.navigationType` on the `currententrychange` event to determine the change type:

```typescript
subscribe(callback: (changeType: EntryChangeType) => void): () => void {
  const controller = new AbortController();

  navigation.addEventListener(
    "currententrychange",
    (event) => {
      // NavigationCurrentEntryChangeEvent.navigationType is null
      // when the change was caused by updateCurrentEntry()
      const changeType =
        (event as NavigationCurrentEntryChangeEvent).navigationType === null
          ? "state"
          : "navigation";
      callback(changeType);
    },
    { signal: controller.signal },
  );

  // ... existing dispose event subscriptions (unchanged) ...

  return () => {
    controller.abort();
  };
}
```

**Type declaration update** — The project's `navigation-api.d.ts` currently types the `currententrychange` listener parameter as `Event`. This needs to be updated to `NavigationCurrentEntryChangeEvent`:

```typescript
// Add to navigation-api.d.ts
interface NavigationCurrentEntryChangeEvent extends Event {
  readonly navigationType: "push" | "replace" | "reload" | "traverse" | null;
  readonly from: NavigationHistoryEntry;
}

// Update the addEventListener overload for currententrychange
interface Navigation extends EventTarget {
  addEventListener(
    type: "currententrychange",
    listener: (event: NavigationCurrentEntryChangeEvent) => void,
    options?: AddEventListenerOptions,
  ): void;
  // ... rest unchanged ...
}
```

### Step 3: Update the Router subscription

**File: `packages/router/src/Router.tsx`**

```typescript
// Subscribe to navigation changes (conditionally wrapped in transition)
useEffect(() => {
  return adapter.subscribe((changeType) => {
    if (changeType === "navigation") {
      startTransition(() => {
        setLocationEntry(adapter.getSnapshot());
      });
    } else {
      // State-only update: apply synchronously, no transition
      setLocationEntry(adapter.getSnapshot());
    }
  });
}, [adapter, startTransition]);
```

### Step 4: Update other adapters

`StaticAdapter` and `NullAdapter` never call their subscriber callbacks, so only the type signature changes. No behavioral change.

```typescript
// StaticAdapter.ts
subscribe(_callback: (changeType: EntryChangeType) => void): () => void {
  return () => {};
}

// NullAdapter.ts
subscribe(_callback: (changeType: EntryChangeType) => void): () => void {
  return () => {};
}
```

### Step 5: Update test mock

**File: `packages/router/src/__tests__/setup.ts`**

The mock's `updateCurrentEntry` currently dispatches a plain `Event`. It should dispatch an event with `navigationType: null` to match real browser behavior. Similarly, `navigate` and `__simulateNavigation`/`__simulateTraversal` should dispatch events with the correct `navigationType`.

```typescript
// For updateCurrentEntry: navigationType is null
updateCurrentEntry: vi.fn((options: { state: unknown }) => {
  currentEntry.__updateState(options.state);
  const event = Object.assign(new Event("currententrychange"), {
    navigationType: null,
    from: currentEntry,
  });
  dispatchEvent("currententrychange", event);
}),

// For navigate: navigationType is "push" or "replace"
navigate: vi.fn((url, options) => {
  // ... existing entry creation logic ...
  const event = Object.assign(new Event("currententrychange"), {
    navigationType: options?.history === "replace" ? "replace" : "push",
    from: previousEntry,
  });
  dispatchEvent("currententrychange", event);
  // ...
}),

// For __simulateTraversal: navigationType is "traverse"
__simulateTraversal(entryIndex: number) {
  // ... existing logic ...
  const event = Object.assign(new Event("currententrychange"), {
    navigationType: "traverse",
    from: previousEntry,
  });
  dispatchEvent("currententrychange", event);
},
```

## Alternatives Considered

### Alternative A: Internal flag instead of `event.navigationType`

Set a flag on the adapter before calling `updateCurrentEntry()`, check it in the subscriber, unset it after:

```typescript
class NavigationAPIAdapter {
  #isStateOnlyUpdate = false;

  updateCurrentEntryState(state: unknown): void {
    this.#isStateOnlyUpdate = true;
    this.#cachedSnapshot = null;
    navigation.updateCurrentEntry({ state });
    this.#isStateOnlyUpdate = false; // safe: event fires synchronously
  }

  subscribe(callback: (changeType: EntryChangeType) => void): () => void {
    navigation.addEventListener("currententrychange", () => {
      callback(this.#isStateOnlyUpdate ? "state" : "navigation");
    });
  }
}
```

**Pros:** Works even if `NavigationCurrentEntryChangeEvent` isn't available (older polyfills).
**Cons:** Relies on `updateCurrentEntry()` firing the event synchronously (guaranteed by spec, but the flag pattern is fragile in the sense that any refactor that breaks the synchronous assumption would introduce bugs). Also, this is less principled than using the native API signal.

**Verdict:** Could be used as a fallback if `navigationType` is missing, but the native API approach is preferred.

### Alternative B: Two separate callbacks

```typescript
subscribe(
  onNavigationChange: () => void,
  onStateChange: () => void,
): () => void;
```

**Pros:** Very explicit at the call site.
**Cons:** Larger interface change. All adapters need two parameters even if they never call one.

**Verdict:** Overengineered for this use case.

### Alternative C: Separate subscription method

```typescript
subscribe(callback: () => void): () => void;
subscribeToStateChanges(callback: () => void): () => void;
```

**Pros:** Backward-compatible `subscribe` signature.
**Cons:** Two subscriptions to manage. Adapters need to split event dispatch across two channels for the same underlying event.

**Verdict:** Adds complexity without clear benefit.

### Alternative D: Router-side URL comparison

Compare old and new snapshot URLs. If the URL hasn't changed, assume state-only.

**Cons:** Unreliable. `setState` (async) navigates to the same URL with `replace: true`, which would be misclassified as state-only. Also, `navigation.navigate()` with `replace` to the same URL is a real navigation that should trigger transitions.

**Verdict:** Incorrect.

### Alternative E: Move route state out of Navigation API

Store per-route state in React state instead of `NavigationHistoryEntry.state`.

**Cons:** Loses state persistence across history traversal (back/forward navigation). Fundamental architecture change.

**Verdict:** Out of scope.

## Edge Cases

### Concurrent navigation + state update

If a navigation transition is in progress (`isPending = true`) and `setStateSync` is called during the transition:

- The state update applies immediately to the **current** entry (the one being navigated **from**).
- The pending navigation continues independently.
- `isPending` remains `true` from the navigation.
- When the navigation commits, a new `currententrychange` fires with `navigationType !== null`.
- This is correct behavior — the state update is on the current entry, which is still being displayed due to the pending transition.

### Multiple rapid `setStateSync` calls

Each call fires `currententrychange` synchronously. React 18+ batches the `setLocationEntry` calls within the same event handler. Only one re-render occurs with the final state.

### `resetState`

Also calls `updateCurrentEntryState`, so it automatically benefits from the same optimization — no code change needed in `resetState` or `RouteRenderer`.

### `setState` (async variant)

Uses `navigateAsync()` → `navigation.navigate()`, which fires `currententrychange` with `navigationType: "replace"`. Correctly classified as a navigation. No change needed.

## Testing Strategy

### New tests

1. **`setStateSync` does not trigger `isPending`**: Render a route component that reads `isPending`. Call `setStateSync`. Assert `isPending` remains `false` throughout.

2. **`resetState` does not trigger `isPending`**: Same as above but with `resetState`.

3. **Navigation still triggers `isPending`**: Existing tests should continue to pass. Verify `isPending` becomes `true` when navigating to a suspending route.

### Mock updates

Update `setup.ts` so the mock dispatches events with `navigationType` matching real browser behavior (as described in Step 5). This is critical — without it, the adapter can't distinguish change types in tests.

## Summary of Files to Change

| File                                               | Change                                              |
| -------------------------------------------------- | --------------------------------------------------- |
| `packages/router/src/core/RouterAdapter.ts`        | Add `EntryChangeType`, update `subscribe` signature |
| `packages/router/src/core/NavigationAPIAdapter.ts` | Check `event.navigationType` in `subscribe`         |
| `packages/router/src/core/StaticAdapter.ts`        | Update `subscribe` parameter type                   |
| `packages/router/src/core/NullAdapter.ts`          | Update `subscribe` parameter type                   |
| `packages/router/src/navigation-api.d.ts`          | Add `NavigationCurrentEntryChangeEvent` type        |
| `packages/router/src/Router.tsx`                   | Conditional `startTransition` in subscription       |
| `packages/router/src/__tests__/setup.ts`           | Dispatch events with `navigationType`               |
| `packages/router/src/__tests__/state.test.tsx`     | Add `isPending`-related assertions                  |
