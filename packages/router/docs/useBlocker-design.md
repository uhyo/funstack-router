# useBlocker Hook Design Document

## Overview

The `useBlocker` hook allows components to prevent navigation away from the current route. This is useful for scenarios like unsaved form data, ongoing file uploads, or any state that would be lost on navigation.

## Design Goals

1. **Synchronous blocking only** - Aligns with the `beforeunload` event's synchronous nature
2. **Simple API** - Declarative boolean option
3. **Composable** - Multiple blockers can coexist in the component tree
4. **Consistent behavior** - Same blocking logic for soft navigations (SPA) and hard navigations (tab close, external URLs)

## API

### Type Signature

```typescript
type UseBlockerOptions = {
  enabled: boolean;
};

function useBlocker(options: UseBlockerOptions): void;
```

### Basic Usage

```typescript
import { useBlocker } from "@funstack/router";

function EditForm() {
  const [isDirty, setIsDirty] = useState(false);

  // Block navigation when form has unsaved changes
  useBlocker({ enabled: isDirty });

  const handleSave = () => {
    // Save logic...
    setIsDirty(false); // Unblock navigation
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

When navigation is blocked:

- **Soft navigations (SPA)**: Navigation is simply prevented. The user stays on the current page.
- **Hard navigations (tab close, refresh, external URL)**: Browser shows its native confirmation dialog.

To allow navigation, the component must change the blocking condition (e.g., save the form, which sets `isDirty` to `false`).

## Behavior Details

### Soft Navigations (SPA)

For navigations within the app (links, programmatic navigation):

1. Navigation event fires
2. All registered blockers are checked
3. If any blocker has `enabled: true`:
   - Navigation is prevented (`event.preventDefault()`)
   - User remains on current page
4. If all blockers have `enabled: false`:
   - Navigation proceeds normally

### Hard Navigations

For navigations that leave the page (tab close, external URL, refresh):

1. `beforeunload` event fires
2. All registered blockers are checked
3. If any blocker has `enabled: true`:
   - `event.preventDefault()` is called
   - `event.returnValue` is set (required by some browsers)
   - Browser shows native confirmation dialog

## Architecture

### Blocker Registry

A new context `BlockerContext` manages registered blockers:

```typescript
type BlockerId = string;

type BlockerRegistry = {
  // Register a blocker, returns unregister function
  register: (id: BlockerId) => () => void;
  // Update blocker's enabled state
  setEnabled: (id: BlockerId, enabled: boolean) => void;
  // Check if any blocker is enabled
  isBlocked: () => boolean;
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
  isBlocked?: () => boolean,  // New parameter
): (() => void) | undefined {
  const handleNavigate = (event: NavigateEvent) => {
    // Check blockers first
    if (isBlocked?.()) {
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

  // Setup beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (blockerRegistry.isBlocked()) {
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
function useBlocker(options: UseBlockerOptions): void {
  const context = useContext(BlockerContext);
  if (!context) {
    throw new Error("useBlocker must be used within a Router");
  }

  const blockerId = useId();
  const { registry } = context;

  // Register blocker on mount, unregister on unmount
  useEffect(() => {
    return registry.register(blockerId);
  }, [blockerId, registry]);

  // Update enabled state when it changes
  useEffect(() => {
    registry.setEnabled(blockerId, options.enabled);
  }, [blockerId, options.enabled, registry]);
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
│ (any enabled?)   │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 blocked    not blocked
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

- If any has `enabled: true`, navigation is blocked
- Navigation proceeds only when all have `enabled: false`

### Nested Routes

Blockers work at any level of the route hierarchy:

- A blocker in a parent route blocks navigation to child routes
- A blocker in a child route blocks navigation to sibling or parent routes
- This matches the expectation that any unsaved state should block navigation

### Navigation Types Not Blocked

Some navigations cannot or should not be blocked:

- Same-page hash changes (anchor links)
- `replace` navigations that don't change the path (state-only updates)

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

| Feature        | `onNavigate`            | `useBlocker`                  |
| -------------- | ----------------------- | ----------------------------- |
| Location       | Router component only   | Any component                 |
| Scope          | Global, all navigations | Per-component blocking logic  |
| Composability  | Single callback         | Multiple independent blockers |
| `beforeunload` | Not integrated          | Automatically integrated      |

`useBlocker` is the preferred API for component-level blocking with proper lifecycle management.

## Testing Strategy

### Unit Tests

1. **Basic blocking**: Verify navigation is blocked when `enabled: true`
2. **Unblocking**: Verify navigation proceeds when `enabled: false`
3. **Multiple blockers**: Verify any with `enabled: true` blocks navigation
4. **Unmount behavior**: Verify blocker cleanup on unmount

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
│   └── RouterAdapter.ts        # Modified: Add isBlocked param
├── Router.tsx                  # Modified: Provide BlockerContext
└── index.ts                    # Modified: Export useBlocker
```
