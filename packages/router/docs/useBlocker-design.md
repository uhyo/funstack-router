# useBlocker Hook Design Document

## Overview

The `useBlocker` hook allows components to prevent navigation away from the current route. This is useful for scenarios like unsaved form data, ongoing file uploads, or any state that would be lost on navigation.

## Design Goals

1. **Synchronous blocking only** - Simple boolean return for immediate decision
2. **Custom confirmation** - Users can call `confirm()` inside the handler to show their own message
3. **Composable** - Multiple blockers can coexist in the component tree
4. **SPA-only** - Does not handle `beforeunload` (that's a separate concern)

## API

### Type Signature

```typescript
function useBlocker(shouldBlock: () => boolean): void;
```

### Basic Usage

```typescript
import { useBlocker } from "@funstack/router";

function EditForm() {
  const [isDirty, setIsDirty] = useState(false);

  useBlocker(() => {
    if (isDirty) {
      return !confirm("You have unsaved changes. Leave anyway?");
    }
    return false;
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
}
```

### Behavior

When navigation occurs:

1. All registered blocker functions are called synchronously
2. If any returns `true`, navigation is prevented
3. The user can call `confirm()` inside the function to show a confirmation dialog

**Note**: This hook only handles SPA navigations (links, programmatic navigation). For hard navigations (tab close, refresh), users should handle `beforeunload` separately if needed.

## Behavior Details

### Soft Navigations (SPA)

For navigations within the app (links, programmatic navigation):

1. Navigation event fires
2. All registered blocker functions are called synchronously
3. If any returns `true`:
   - Navigation is prevented (`event.preventDefault()`)
   - User remains on current page
4. If all return `false`:
   - Navigation proceeds normally

### Hard Navigations

This hook does **not** handle `beforeunload`. Users who need to block tab close/refresh should add their own `beforeunload` listener:

```typescript
useEffect(() => {
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (isDirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [isDirty]);
```

## Architecture

### Blocker Registry

A new context `BlockerContext` manages registered blockers:

```typescript
type BlockerId = string;

type BlockerRegistry = {
  // Register a blocker, returns unregister function
  register: (id: BlockerId, shouldBlock: () => boolean) => () => void;
  // Check all blockers - returns true if any blocks
  checkAll: () => boolean;
};

type BlockerContextValue = {
  registry: BlockerRegistry;
};
```

### Integration Points

#### 1. NavigationAPIAdapter

Modify `setupInterception` to check blockers before processing navigation:

```typescript
setupInterception(
  routes: InternalRouteDefinition[],
  onNavigate?: OnNavigateCallback,
  checkBlockers?: () => boolean,  // New parameter
): (() => void) | undefined {
  const handleNavigate = (event: NavigateEvent) => {
    // Check blockers first
    if (checkBlockers?.()) {
      event.preventDefault();
      return;
    }
    // ... existing logic
  };
}
```

#### 2. Router Component

The `<Router>` component:

- Provides `BlockerContext`
- Passes blocker check to adapter

```typescript
function Router({ routes, children, ... }) {
  const [blockerRegistry] = useState(() => createBlockerRegistry());

  // Pass blocker check to adapter
  // No beforeunload handling - that's the user's responsibility

  // ... rest of Router logic
}
```

#### 3. useBlocker Hook Implementation

```typescript
function useBlocker(shouldBlock: () => boolean): void {
  const context = useContext(BlockerContext);
  if (!context) {
    throw new Error("useBlocker must be used within a Router");
  }

  const blockerId = useId();
  const { registry } = context;

  // Register blocker on mount, unregister on unmount
  useEffect(() => {
    return registry.register(blockerId, shouldBlock);
  }, [blockerId, shouldBlock, registry]);
}
```

### State Flow Diagram

```
User clicks link
       │
       ▼
NavigateEvent fires
       │
       ▼
┌─────────────────────┐
│ Call all blocker    │
│ functions           │
│ (user can confirm())│
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 blocked    not blocked
 (any true)  (all false)
    │         │
    ▼         ▼
preventDefault()  Continue with
User stays on     normal navigation
current page      │
                  ▼
              Route renders
```

## Edge Cases

### Multiple Blockers

When multiple components register blockers:

- All functions are called in registration order
- If any returns `true`, navigation is blocked
- Each blocker can show its own `confirm()` dialog

### Nested Routes

Blockers work at any level of the route hierarchy:

- A blocker in a parent route blocks navigation to child routes
- A blocker in a child route blocks navigation to sibling or parent routes
- This matches the expectation that any unsaved state should block navigation

### Navigation Types Not Blocked

Some navigations cannot or should not be blocked:

- Same-page hash changes (anchor links)
- `replace` navigations that don't change the path (state-only updates)
- Hard navigations (tab close, external URL) - use `beforeunload` separately

## Comparison with `onNavigate`

The existing `onNavigate` callback on `<Router>` can already prevent navigation:

```typescript
<Router
  onNavigate={(event, matched) => {
    if (hasUnsavedChanges) {
      event.preventDefault();
    }
  }}
/>
```

**Why add `useBlocker`?**

| Feature       | `onNavigate`            | `useBlocker`                  |
| ------------- | ----------------------- | ----------------------------- |
| Location      | Router component only   | Any component                 |
| Scope         | Global, all navigations | Per-component blocking logic  |
| Composability | Single callback         | Multiple independent blockers |

`useBlocker` is the preferred API for component-level blocking with proper lifecycle management.

## Testing Strategy

### Unit Tests

1. **Basic blocking**: Verify navigation is blocked when function returns `true`
2. **Unblocking**: Verify navigation proceeds when function returns `false`
3. **Multiple blockers**: Verify any returning `true` blocks navigation
4. **Unmount behavior**: Verify blocker cleanup on unmount

### Integration Tests

1. **Form scenario**: Dirty form blocks, saved form allows
2. **Nested routes**: Blockers work at all route levels
3. **Navigation types**: Links, programmatic navigation, back/forward

## Migration / Backwards Compatibility

This is a new feature with no breaking changes:

- Existing `onNavigate` callback continues to work
- Blockers and `onNavigate` can coexist (blockers checked first)

## Implementation Plan

1. Create `BlockerContext` and registry utilities
2. Implement `useBlocker` hook
3. Integrate blocker checks into `NavigationAPIAdapter`
4. Write tests
5. Update documentation

## File Changes

```
packages/router/src/
├── context/
│   └── BlockerContext.ts       # New: Blocker registry context
├── hooks/
│   └── useBlocker.ts           # New: useBlocker hook
├── core/
│   ├── NavigationAPIAdapter.ts # Modified: Add blocker check
│   └── RouterAdapter.ts        # Modified: Add checkBlockers param
├── Router.tsx                  # Modified: Provide BlockerContext
└── index.ts                    # Modified: Export useBlocker
```
