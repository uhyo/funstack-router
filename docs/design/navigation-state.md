# Navigation State Management Design Document

## Overview

This document describes the design for type-safe navigation state management in FUNSTACK Router. The feature allows route components to read and update state tied to navigation history entries using the Navigation API's built-in state mechanism.

## Goals

1. **Type Safety**: Provide fully typed `state` and `setState` props to route components
2. **Navigation API Integration**: Properly utilize `NavigationHistoryEntry.getState()` and `navigation.updateCurrentEntry()`
3. **Consistency**: Follow existing patterns for passing props to route components (like `data` and `params`)
4. **Serialization Safety**: Ensure state conforms to structured clone algorithm requirements

## Background: Navigation API State

The Navigation API provides per-entry state management:

```typescript
// Reading state from current entry
const state = navigation.currentEntry.getState();

// Setting state during navigation
navigation.navigate(url, { state: { count: 1 } });

// Updating state on current entry (no navigation)
navigation.updateCurrentEntry({ state: { count: 2 } });
```

State must be serializable via the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).

## Design

### 1. Route Definition with State Type

Extend the `route()` helper to accept a state type parameter:

```typescript
// Option A: Explicit state type via generic
const userRoute = route<{ scrollPosition: number }>({
  path: "users/:userId",
  component: UserPage,
});

// Option B: Infer from defaultState
const userRoute = route({
  path: "users/:userId",
  component: UserPage,
  defaultState: { scrollPosition: 0 },
});

// Option C: Explicit stateSchema for runtime validation (future)
const userRoute = route({
  path: "users/:userId",
  component: UserPage,
  stateSchema: z.object({ scrollPosition: z.number() }),
});
```

**Recommendation**: Start with Option A (explicit generic) for simplicity, with Option B as sugar. Option C can be added later for runtime validation.

### 2. Component Props Interface

Route components receive `state` and `setState` alongside existing props:

```typescript
// Without loader
type RouteComponentProps<TParams extends Record<string, string>, TState> = {
  params: TParams;
  state: TState | undefined;
  setState: (state: TState | ((prev: TState | undefined) => TState)) => void;
};

// With loader
type RouteComponentPropsWithData<
  TParams extends Record<string, string>,
  TState,
  TData,
> = {
  params: TParams;
  state: TState | undefined;
  setState: (state: TState | ((prev: TState | undefined) => TState)) => void;
  data: TData;
};
```

### 3. Usage Example

```typescript
import { route, type RouteComponentProps } from "@funstack/router";

type UserPageState = {
  scrollPosition: number;
  selectedTab: "posts" | "comments";
};

function UserPage({
  params,
  state,
  setState,
}: RouteComponentProps<{ userId: string }, UserPageState>) {
  // state is UserPageState | undefined (undefined on first visit)
  const scrollPosition = state?.scrollPosition ?? 0;
  const selectedTab = state?.selectedTab ?? "posts";

  const handleTabChange = (tab: "posts" | "comments") => {
    setState((prev) => ({
      ...prev,
      scrollPosition: prev?.scrollPosition ?? 0,
      selectedTab: tab,
    }));
  };

  return (
    <div>
      <h1>User {params.userId}</h1>
      <Tabs value={selectedTab} onChange={handleTabChange} />
    </div>
  );
}

// Route definition
const userRoute = route<UserPageState>()({
  path: "users/:userId",
  component: UserPage,
});
```

### 4. Implementation Details

#### 4.1 LocationEntry Extension

Update `LocationEntry` to preserve typed state:

```typescript
// packages/router/src/core/RouterAdapter.ts
export type LocationEntry<TState = unknown> = {
  url: URL;
  key: string;
  state: TState;
};
```

#### 4.2 RouterAdapter Interface Extension

Add state update capability to the adapter:

```typescript
// packages/router/src/core/RouterAdapter.ts
export interface RouterAdapter {
  // ... existing methods

  /**
   * Update the state of the current navigation entry without navigation.
   * Uses navigation.updateCurrentEntry() internally.
   */
  updateCurrentEntryState(state: unknown): void;
}
```

#### 4.3 NavigationAPIAdapter Implementation

```typescript
// packages/router/src/core/NavigationAPIAdapter.ts
class NavigationAPIAdapter implements RouterAdapter {
  // ... existing implementation

  updateCurrentEntryState(state: unknown): void {
    navigation.updateCurrentEntry({ state });
    // Invalidate cached snapshot to reflect new state
    this.#cachedSnapshot = null;
    // Notify subscribers of the state change
    this.#notifySubscribers();
  }
}
```

#### 4.4 RouteRenderer Modification

Update `RouteRenderer` to pass state props:

```typescript
// packages/router/src/Router.tsx
function RouteRenderer({ matchedRoutes, index }: RouteRendererProps): ReactNode {
  const match = matchedRoutes[index];
  const { route, params, pathname, data } = match;
  const Component = route.component;

  const { locationEntry, updateCurrentEntryState } = useContext(RouterContext);

  // Create stable setState callback
  const setState = useCallback(
    (stateOrUpdater: unknown | ((prev: unknown) => unknown)) => {
      const newState = typeof stateOrUpdater === "function"
        ? stateOrUpdater(locationEntry.state)
        : stateOrUpdater;
      updateCurrentEntryState(newState);
    },
    [locationEntry.state, updateCurrentEntryState]
  );

  // ... outlet creation

  const renderComponent = () => {
    const baseProps = {
      params,
      state: locationEntry.state,
      setState,
    };

    if (route.loader) {
      return <Component {...baseProps} data={data} />;
    }
    return <Component {...baseProps} />;
  };

  return (
    <RouteContext.Provider value={routeContextValue}>
      {renderComponent()}
    </RouteContext.Provider>
  );
}
```

#### 4.5 Type-Safe Route Definition

Extend the route helper to support state typing:

```typescript
// packages/router/src/route.ts

// Curried function for explicit state type
export function route<TState = undefined>() {
  return function <
    TPath extends string,
    TParams extends ExtractParams<TPath>,
    TData = undefined,
  >(
    definition: RouteDefinition<TPath, TParams, TState, TData>,
  ): TypedRoute<TPath, TParams, TState, TData> {
    // ... implementation
  };
}

// Non-curried overload for routes without state
export function route<
  TPath extends string,
  TParams extends ExtractParams<TPath>,
  TData = undefined,
>(
  definition: RouteDefinitionWithoutState<TPath, TParams, TData>,
): TypedRoute<TPath, TParams, undefined, TData>;
```

### 5. State Initialization

When a route is first visited, `state` will be `undefined`. Routes can handle this with default values:

```typescript
function UserPage({ state, setState }: Props) {
  // Option 1: Inline defaults
  const scrollPosition = state?.scrollPosition ?? 0;

  // Option 2: Initialize on mount
  useEffect(() => {
    if (state === undefined) {
      setState({ scrollPosition: 0, selectedTab: "posts" });
    }
  }, []);
}
```

### 6. Hook API (Optional)

For components that need state access without being the route component:

```typescript
// packages/router/src/hooks/useNavigationState.ts
export function useNavigationState<T>(): [
  state: T | undefined,
  setState: (state: T | ((prev: T | undefined) => T)) => void,
] {
  const { locationEntry, updateCurrentEntryState } = useContext(RouterContext);

  const setState = useCallback(
    (stateOrUpdater: T | ((prev: T | undefined) => T)) => {
      const newState =
        typeof stateOrUpdater === "function"
          ? (stateOrUpdater as Function)(locationEntry.state)
          : stateOrUpdater;
      updateCurrentEntryState(newState);
    },
    [locationEntry.state, updateCurrentEntryState],
  );

  return [locationEntry.state as T | undefined, setState];
}
```

Usage:

```typescript
function NestedComponent() {
  const [state, setState] = useNavigationState<{ count: number }>();
  return <button onClick={() => setState({ count: (state?.count ?? 0) + 1 })}>
    Count: {state?.count ?? 0}
  </button>;
}
```

### 7. Considerations

#### 7.1 State Conflicts with Nested Routes

When multiple nested routes exist, they share the same `NavigationHistoryEntry` state. Options:

**Option A: Single State Object (Recommended)**
All routes share the same state object. This matches Navigation API behavior.

**Option B: Namespaced State**
Each route gets a namespace within the state:

```typescript
// Internal state structure
type InternalState = {
  __routeState: {
    [routePath: string]: unknown;
  };
};
```

**Recommendation**: Start with Option A for simplicity. Document that nested routes share state and should coordinate via a shared type or use distinct property names.

#### 7.2 Serialization Constraints

State must be serializable via structured clone. The router should:

1. Document this requirement clearly
2. Optionally validate state in development mode
3. Provide clear error messages when serialization fails

```typescript
// Development mode validation
if (process.env.NODE_ENV === "development") {
  try {
    structuredClone(state);
  } catch (e) {
    console.error(
      "Navigation state must be serializable. " +
        "Functions, Symbols, and DOM nodes cannot be stored.",
    );
    throw e;
  }
}
```

#### 7.3 StaticAdapter and NullAdapter

These adapters don't support state updates:

- **StaticAdapter**: Log a warning, state updates are no-ops
- **NullAdapter**: No-op silently

```typescript
class StaticAdapter implements RouterAdapter {
  updateCurrentEntryState(_state: unknown): void {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "Navigation state updates are not available in static mode.",
      );
    }
  }
}
```

#### 7.4 Re-renders on State Update

Calling `setState` triggers `navigation.updateCurrentEntry()`, which fires `currententrychange`. The router already subscribes to this event via `useSyncExternalStore`, so components will re-render automatically.

### 8. Migration Path

This is an additive, non-breaking change:

1. Existing routes continue to work (state props are optional)
2. New routes can opt into state management
3. No changes required to existing route components

### 9. Future Enhancements

1. **Runtime Validation**: Integration with Zod/Valibot for state schema validation
2. **State Persistence**: Optional localStorage/sessionStorage backup for state
3. **DevTools**: Navigation state inspection in React DevTools
4. **State Middleware**: Transform state on read/write (e.g., migrations)

## API Summary

### Route Definition

```typescript
// With explicit state type
const myRoute = route<MyState>()({
  path: "/my-path",
  component: MyComponent,
});

// Without state (backward compatible)
const myRoute = route({
  path: "/my-path",
  component: MyComponent,
});
```

### Component Props

```typescript
function MyComponent({
  params,
  state,
  setState,
  data, // if loader is defined
}: RouteComponentProps<Params, State>) {
  // ...
}
```

### Hook

```typescript
const [state, setState] = useNavigationState<MyState>();
```

## Open Questions

1. **Should `setState` support partial updates?**

   ```typescript
   // Current: Full replacement
   setState({ ...state, count: state.count + 1 });

   // Alternative: Partial merge (like React's useState with objects)
   setState({ count: state.count + 1 }); // merges with existing
   ```

2. **Should we provide a `resetState()` function?**

   ```typescript
   resetState(); // Sets state to undefined or defaultState
   ```

3. **How should state interact with route loaders?**
   - Should loaders have access to state?
   - Can loaders set initial state?

## References

- [Navigation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
- [NavigationHistoryEntry.getState()](https://developer.mozilla.org/en-US/docs/Web/API/NavigationHistoryEntry/getState)
- [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
