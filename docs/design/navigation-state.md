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

Route components receive `state`, `setState`, and `resetState` alongside existing props:

```typescript
// Without loader
type RouteComponentProps<TParams extends Record<string, string>, TState> = {
  params: TParams;
  state: TState | undefined;
  setState: (state: TState | ((prev: TState | undefined) => TState)) => void;
  resetState: () => void;
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
  resetState: () => void;
  data: TData;
};
```

### 3. Usage Example

```typescript
import { routeState, type RouteComponentProps } from "@funstack/router";

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
const userRoute = routeState<UserPageState>()({
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

Update `RouteRenderer` to pass state props. Each route receives its own isolated state based on match index (see Section 7.1 for details):

```typescript
// packages/router/src/Router.tsx
function RouteRenderer({ matchedRoutes, index }: RouteRendererProps): ReactNode {
  const match = matchedRoutes[index];
  const { route, params, pathname, data } = match;
  const Component = route.component;

  const { locationEntry, updateCurrentEntryState } = useContext(RouterContext);

  // Extract this route's state from internal structure
  const internalState = locationEntry.state as InternalState | undefined;
  const routeState = internalState?.__routeStates?.[index];

  // Create stable setState callback for this route's slice
  const setState = useCallback(
    (stateOrUpdater: unknown | ((prev: unknown) => unknown)) => {
      const newState = typeof stateOrUpdater === "function"
        ? stateOrUpdater(routeState)
        : stateOrUpdater;

      const currentStates = internalState?.__routeStates ?? [];
      const newStates = [...currentStates];
      newStates[index] = newState;
      updateCurrentEntryState({ __routeStates: newStates });
    },
    [routeState, internalState, index, updateCurrentEntryState]
  );

  // Create stable resetState callback
  const resetState = useCallback(() => {
    const currentStates = internalState?.__routeStates ?? [];
    const newStates = [...currentStates];
    newStates[index] = undefined;
    updateCurrentEntryState({ __routeStates: newStates });
  }, [internalState, index, updateCurrentEntryState]);

  // ... outlet creation

  const renderComponent = () => {
    const baseProps = {
      params,
      state: routeState,
      setState,
      resetState,
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

### 6. Reset State

A `resetState` function is provided to clear state back to `undefined`:

```typescript
function UserPage({ state, setState, resetState }: Props) {
  const handleClear = () => {
    resetState(); // Sets state to undefined
  };

  return (
    <div>
      <span>Count: {state?.count ?? 0}</span>
      <button onClick={handleClear}>Reset</button>
    </div>
  );
}
```

The component props interface includes `resetState`:

```typescript
type RouteComponentProps<TParams extends Record<string, string>, TState> = {
  params: TParams;
  state: TState | undefined;
  setState: (state: TState | ((prev: TState | undefined) => TState)) => void;
  resetState: () => void;
};
```

### 7. Considerations

#### 7.1 Per-Route State with Match Index

Each route in a nested route stack maintains its own separate state object. This is required for type safety since each route can define a different state type.

**Internal State Structure**

The router stores state internally as an array indexed by match position:

```typescript
// Internal state stored in NavigationHistoryEntry
type InternalState = {
  __routeStates: (unknown | undefined)[];
};

// Example: /users/123/posts
// Match stack: [LayoutRoute (index 0), UserRoute (index 1), PostsRoute (index 2)]
// Internal state:
{
  __routeStates: [
    { sidebarCollapsed: true }, // LayoutRoute's state
    { selectedTab: "posts" }, // UserRoute's state
    { scrollPosition: 100 }, // PostsRoute's state
  ];
}
```

**Implementation in RouteRenderer**

The `RouteRenderer` receives its match index and uses it to read/write the correct state slice:

```typescript
function RouteRenderer({
  matchedRoutes,
  index,
}: RouteRendererProps): ReactNode {
  const { locationEntry, updateCurrentEntryState } = useContext(RouterContext);

  // Extract this route's state from the internal structure
  const internalState = locationEntry.state as InternalState | undefined;
  const routeState = internalState?.__routeStates?.[index];

  const setState = useCallback(
    (stateOrUpdater: unknown | ((prev: unknown) => unknown)) => {
      const newState =
        typeof stateOrUpdater === "function"
          ? stateOrUpdater(routeState)
          : stateOrUpdater;

      // Update only this route's slice
      const currentStates = internalState?.__routeStates ?? [];
      const newStates = [...currentStates];
      newStates[index] = newState;

      updateCurrentEntryState({ __routeStates: newStates });
    },
    [routeState, internalState, index, updateCurrentEntryState],
  );

  const resetState = useCallback(() => {
    const currentStates = internalState?.__routeStates ?? [];
    const newStates = [...currentStates];
    newStates[index] = undefined;

    updateCurrentEntryState({ __routeStates: newStates });
  }, [internalState, index, updateCurrentEntryState]);

  // ... rest of rendering
}
```

**Benefits**

1. **Type Safety**: Each route's state is fully typed independently
2. **Isolation**: Parent and child routes don't interfere with each other's state
3. **Predictable**: Match index is stable for a given route in the hierarchy

**Edge Cases**

- When navigating to a different route structure, stale state entries are naturally ignored
- The `__routeStates` array may have gaps (undefined entries) for routes without state

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
// With explicit state type (use routeState)
const myRoute = routeState<MyState>()({
  path: "/my-path",
  component: MyComponent,
});

// Without state (use route)
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
  resetState,
  data, // if loader is defined
}: RouteComponentProps<Params, State>) {
  // ...
}
```

## Design Decisions

1. **`setState` uses full replacement, not partial updates**

   ```typescript
   // Must spread existing state for partial updates
   setState({ ...state, count: state.count + 1 });
   ```

   Rationale: Partial merging complicates both implementation and type definitions. Full replacement is explicit and predictable.

2. **Loaders do not have access to state**
   - Loaders receive `params`, `request`, and `signal` only
   - State changes do not trigger loader re-execution
   - This keeps loaders pure and predictable—they only depend on URL

3. **`resetState()` clears state to `undefined`**

   ```typescript
   resetState(); // Sets state to undefined
   ```

   Useful for clearing accumulated state when the user wants a fresh start.

## References

- [Navigation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
- [NavigationHistoryEntry.getState()](https://developer.mozilla.org/en-US/docs/Web/API/NavigationHistoryEntry/getState)
- [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
