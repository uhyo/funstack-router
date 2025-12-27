# useBlocker Hook Design Document

## Overview

The `useBlocker` hook allows components to prevent navigation away from the current route. This is useful for scenarios like unsaved form data, ongoing file uploads, or any state that would be lost on navigation.

## Design Goals

1. **Synchronous blocking only** - Aligns with the `beforeunload` event's synchronous nature
2. **Simple API** - Boolean-returning function for maximum flexibility
3. **Composable** - Multiple blockers can coexist in the component tree
4. **Consistent behavior** - Same blocking logic for soft navigations (SPA) and hard navigations (tab close, external URLs)

## API

### Basic Usage

```typescript
import { useBlocker } from "@funstack/router";

function EditForm() {
  const [isDirty, setIsDirty] = useState(false);

  // Block navigation when form has unsaved changes
  useBlocker(() => isDirty);

  return (
    <form>
      <input onChange={() => setIsDirty(true)} />
      <button type="submit">Save</button>
    </form>
  );
}
```

### Type Signature

```typescript
type BlockerState =
  | { blocked: false }
  | { blocked: true; proceed: () => void; reset: () => void };

function useBlocker(shouldBlock: () => boolean): BlockerState;
```

### Return Value

The hook returns a `BlockerState` object:

- **`blocked: false`** - No navigation is currently blocked
- **`blocked: true`** - A navigation attempt was blocked
  - `proceed()` - Allow the blocked navigation to continue
  - `reset()` - Cancel the blocked navigation and stay on current page

### Extended Example with UI

```typescript
function EditForm() {
  const [isDirty, setIsDirty] = useState(false);
  const blocker = useBlocker(() => isDirty);

  return (
    <>
      <form>
        <input onChange={() => setIsDirty(true)} />
        <button type="submit">Save</button>
      </form>

      {blocker.blocked && (
        <Dialog>
          <p>You have unsaved changes. Discard them?</p>
          <button onClick={blocker.reset}>Stay</button>
          <button onClick={blocker.proceed}>Leave</button>
        </Dialog>
      )}
    </>
  );
}
```

## Behavior

### Soft Navigations (SPA)

For navigations within the app (links, programmatic navigation):

1. Navigation event fires
2. All registered blockers are checked synchronously
3. If any blocker returns `true`:
   - Navigation is prevented (`event.preventDefault()`)
   - The blocker's state updates to `{ blocked: true, ... }`
   - Pending navigation destination is stored
4. User can then call `proceed()` or `reset()`

### Hard Navigations

For navigations that leave the page (tab close, external URL, refresh):

1. `beforeunload` event fires
2. All registered blockers are checked synchronously
3. If any blocker returns `true`:
   - `event.preventDefault()` is called
   - `event.returnValue` is set (required by some browsers)
   - Browser shows native confirmation dialog

**Note**: For hard navigations, the browser controls the confirmation UI. The `proceed`/`reset` API is not available—users interact with the browser's native dialog.

## Architecture

### Blocker Registry

A new context `BlockerContext` manages registered blockers:

```typescript
type BlockerId = string;

type PendingNavigation = {
  destination: URL;
  navigationType: NavigationType;
  // Additional navigation options to replay
  options?: NavigateOptions;
};

type BlockerRegistry = {
  // Register a blocker, returns unregister function
  register: (id: BlockerId, shouldBlock: () => boolean) => () => void;
  // Check all blockers
  checkAll: () => boolean;
  // Get all active blockers
  getBlockers: () => Map<BlockerId, () => boolean>;
};

type BlockerContextValue = {
  registry: BlockerRegistry;
  pendingNavigation: PendingNavigation | null;
  setPendingNavigation: (nav: PendingNavigation | null) => void;
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
- Manages `beforeunload` listener lifecycle

```typescript
function Router({ routes, children, ... }) {
  const [blockerRegistry] = useState(() => createBlockerRegistry());
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // Setup beforeunload handler when blockers exist
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (blockerRegistry.checkAll()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [blockerRegistry]);

  // ... rest of Router logic
}
```

#### 3. useBlocker Hook Implementation

```typescript
function useBlocker(shouldBlock: () => boolean): BlockerState {
  const context = useContext(BlockerContext);
  if (!context) {
    throw new Error("useBlocker must be used within a Router");
  }

  const blockerId = useId();
  const { registry, pendingNavigation, setPendingNavigation } = context;

  // Register blocker on mount
  useEffect(() => {
    return registry.register(blockerId, shouldBlock);
  }, [blockerId, shouldBlock, registry]);

  // Compute blocked state
  const isBlocked = pendingNavigation !== null;

  const proceed = useCallback(() => {
    if (pendingNavigation) {
      setPendingNavigation(null);
      // Re-trigger navigation (will bypass blockers this time)
      navigation.navigate(pendingNavigation.destination.href, {
        ...pendingNavigation.options,
        info: { __skipBlockerCheck: true },
      });
    }
  }, [pendingNavigation, setPendingNavigation]);

  const reset = useCallback(() => {
    setPendingNavigation(null);
  }, [setPendingNavigation]);

  if (!isBlocked) {
    return { blocked: false };
  }

  return { blocked: true, proceed, reset };
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
┌──────────────────┐
│ Check blockers   │
│ (synchronously)  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 blocked    not blocked
    │         │
    ▼         ▼
preventDefault()  Continue with
Store pending     normal navigation
navigation        │
    │             ▼
    ▼         Route renders
Component updates
(blocked: true)
    │
    ▼
User sees confirmation UI
    │
    ├─── proceed() ──► Replay navigation
    │                  (skip blocker check)
    │
    └─── reset() ───► Clear pending,
                      stay on page
```

## Edge Cases

### Multiple Blockers

When multiple components register blockers:

- All are checked; if any returns `true`, navigation is blocked
- Only one pending navigation is stored (the most recent attempt)
- All blockers with `blocked: true` state can call `proceed()` or `reset()`
- First call to either `proceed()` or `reset()` resolves the pending navigation

### Blocker Unmounts While Blocked

If a component with an active blocker unmounts:

- Its blocker is unregistered from the registry
- If there's a pending navigation and no other blockers, navigation should auto-proceed
- Alternatively: pending navigation is cleared (safer default)

**Recommendation**: Clear pending navigation when blocker unmounts. This is safer—if the user navigated away from the blocking component, they likely don't want to proceed with the original navigation.

### Nested Routes

Blockers work at any level of the route hierarchy:

- A blocker in a parent route blocks navigation to child routes
- A blocker in a child route blocks navigation to sibling or parent routes
- This matches the expectation that any unsaved state should block navigation

### Navigation Types Not Blocked

Some navigations cannot or should not be blocked:

- Same-page hash changes (anchor links)
- `replace` navigations that don't change the path (state-only updates)
- Navigation triggered by `proceed()` (marked with `__skipBlockerCheck`)

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

| Feature          | `onNavigate`            | `useBlocker`                     |
| ---------------- | ----------------------- | -------------------------------- |
| Location         | Router component only   | Any component                    |
| Scope            | Global, all navigations | Per-component blocking logic     |
| Composability    | Single callback         | Multiple independent blockers    |
| State management | Manual                  | Built-in (blocked/proceed/reset) |
| `beforeunload`   | Not integrated          | Automatically integrated         |

`useBlocker` is the preferred API for component-level blocking with proper lifecycle management.

## Testing Strategy

### Unit Tests

1. **Basic blocking**: Verify navigation is blocked when `shouldBlock` returns `true`
2. **Proceed**: Verify `proceed()` allows blocked navigation to continue
3. **Reset**: Verify `reset()` clears blocked state without navigation
4. **Multiple blockers**: Verify any returning `true` blocks navigation
5. **Unmount behavior**: Verify blocker cleanup on unmount

### Integration Tests

1. **Form scenario**: Dirty form blocks, saved form allows
2. **Nested routes**: Blockers work at all route levels
3. **Navigation types**: Links, programmatic navigation, back/forward

### Browser Tests (Manual/E2E)

1. **beforeunload**: Tab close shows browser confirmation when blocked
2. **External navigation**: Typing URL shows confirmation when blocked

## Migration / Backwards Compatibility

This is a new feature with no breaking changes:

- Existing `onNavigate` callback continues to work
- Blockers and `onNavigate` can coexist (blockers checked first)

## Open Questions

### 1. Should `shouldBlock` receive navigation info?

```typescript
// Option A: No arguments (proposed)
useBlocker(() => isDirty);

// Option B: Receive destination
useBlocker((destination) => {
  // Could allow navigation to specific routes
  return isDirty && !destination.pathname.startsWith("/save");
});
```

**Recommendation**: Start with Option A for simplicity. Can extend later if needed.

### 2. Should there be a `usePrompt` convenience hook?

```typescript
// Simplified API for common case
usePrompt("You have unsaved changes!", isDirty);
```

**Recommendation**: Not in initial implementation. Users can build this on top of `useBlocker`.

### 3. Behavior when blocker's `shouldBlock` changes while blocked?

If a navigation is pending and `shouldBlock` now returns `false`:

- **Option A**: Auto-proceed with pending navigation
- **Option B**: Stay blocked until explicit `proceed()`/`reset()`

**Recommendation**: Option B (explicit resolution) for predictable behavior.

## Implementation Plan

1. Create `BlockerContext` and registry utilities
2. Implement `useBlocker` hook
3. Integrate blocker checks into `NavigationAPIAdapter`
4. Add `beforeunload` listener management to `<Router>`
5. Write tests
6. Update documentation

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
