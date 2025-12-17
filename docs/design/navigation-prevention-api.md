# Navigation Prevention API Design

## Overview

This document describes the design for a navigation prevention API in FUNSTACK Router. This feature allows pages to prevent navigation away when there are unsaved changes or other conditions that require user confirmation.

## Use Cases

1. **Form with unsaved changes** - Warn user before navigating away from a form with pending edits
2. **Multi-step wizard** - Confirm before abandoning a partially completed wizard
3. **Editor with draft content** - Prevent accidental loss of in-progress work
4. **Upload in progress** - Warn before leaving during an active file upload

## Current Architecture

### Navigation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Navigation Event Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Action (click link, call navigate(), back/forward)         │
│                           │                                      │
│                           ▼                                      │
│              Navigation API fires "navigate" event               │
│                           │                                      │
│                           ▼                                      │
│         NavigationAPIAdapter.setupInterception()                 │
│                           │                                      │
│                           ▼                                      │
│              Call onNavigate(event, matched)?                    │
│                           │                                      │
│              ┌────────────┴────────────┐                        │
│              │                         │                        │
│              ▼                         ▼                        │
│     event.preventDefault()      No preventDefault                │
│     called by user              │                               │
│              │                         ▼                        │
│              ▼                  event.intercept() called         │
│     Browser handles              by router                       │
│     navigation (full                   │                        │
│     page load)                         ▼                        │
│                                 Execute loaders                  │
│                                        │                        │
│                                        ▼                        │
│                                 Render new route                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Existing Extension Point

The `<Router>` component currently accepts an `onNavigate` callback:

```typescript
type RouterProps = {
  onNavigate?: (event: NavigateEvent, matched: MatchedRoute[] | null) => void;
  // ...
};
```

**Limitation**: This is a global callback at the router level. It doesn't allow individual routes or components to register their own blockers.

## Proposed API Design

### Option A: Hook-based API with `useBlocker`

A React hook that allows components to register navigation blockers.

```typescript
// Type definitions
interface BlockerState {
  state: "idle" | "blocked";
  proceed: () => void;
  reset: () => void;
  location: URL | null; // The destination URL when blocked
}

type BlockerFunction = (args: {
  currentLocation: URL;
  nextLocation: URL;
  navigationType: NavigationType; // "push" | "replace" | "reload" | "traverse"
}) => boolean; // Return true to block

function useBlocker(blocker: BlockerFunction | boolean): BlockerState;
```

**Usage Example:**

```tsx
function EditForm() {
  const [isDirty, setIsDirty] = useState(false);
  const blocker = useBlocker(isDirty);

  return (
    <form>
      <input onChange={() => setIsDirty(true)} />
      <button type="submit">Save</button>

      {blocker.state === "blocked" && (
        <ConfirmDialog
          message="You have unsaved changes. Leave anyway?"
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      )}
    </form>
  );
}
```

**With function predicate:**

```tsx
function EditForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const blocker = useBlocker(({ nextLocation }) => {
    // Only block if form is dirty and not navigating to save confirmation
    const isDirty = formRef.current?.querySelector("[data-dirty]") !== null;
    return isDirty && !nextLocation.pathname.startsWith("/saved");
  });

  // ...
}
```

### Option B: Route-level Guard with `beforeLeave`

Add a route-level configuration for navigation guards.

```typescript
// Route definition with beforeLeave guard
const routes = [
  {
    path: "/edit/:id",
    component: EditPage,
    beforeLeave: ({ params, nextLocation }) => {
      // Return false or Promise<false> to block
      // Return true or Promise<true> to allow
      return confirmUnsavedChanges();
    },
  },
];
```

**Limitation**: This approach ties blocking logic to route definitions, making it harder to access component state (like form dirty state).

### Decision: Hook-based API (Option A)

For the initial implementation, we will focus on the **hook-based `useBlocker` API** only. Route-level `beforeLeave` guards (Option B) may be added in a future iteration if there's demand.

**Rationale**: The hook-based approach covers the majority of use cases and provides the most flexibility for accessing component state. Route-level guards can be added later without breaking changes.

## Detailed Design: `useBlocker` Hook

### Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                        Blocker Architecture                           │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐  │
│  │ Component A │    │  BlockerContext  │    │ NavigationAPIAdapter│  │
│  │             │    │                  │    │                     │  │
│  │ useBlocker()├───►│  blockers: Map   │◄───┤ setupInterception() │  │
│  │             │    │                  │    │                     │  │
│  └─────────────┘    │  - register()    │    │ On navigate event:  │  │
│                     │  - unregister()  │    │  1. Check blockers  │  │
│  ┌─────────────┐    │  - checkAll()    │    │  2. If blocked:     │  │
│  │ Component B │    │                  │    │     - Store pending │  │
│  │             │    │  pendingNav:     │    │     - Update state  │  │
│  │ useBlocker()├───►│  - destination   │    │  3. If not blocked: │  │
│  │             │    │  - proceed()     │    │     - Continue nav  │  │
│  └─────────────┘    │  - reset()       │    │                     │  │
│                     │                  │    │                     │  │
│                     └──────────────────┘    └─────────────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### New Context: `BlockerContext`

```typescript
// packages/router/src/context/BlockerContext.ts

type BlockerId = string;

interface PendingNavigation {
  destination: URL;
  navigationType: NavigationType;
  proceed: () => void;
  reset: () => void;
}

interface BlockerContextValue {
  // Registration
  register: (id: BlockerId, blocker: BlockerFunction) => void;
  unregister: (id: BlockerId) => void;

  // Check all blockers (excludes bypassed blockers)
  checkAll: (args: {
    currentLocation: URL;
    nextLocation: URL;
    navigationType: NavigationType;
  }) => BlockerId | null; // Returns blocking blocker's ID, or null if none

  // Bypass management (for proceed() to skip specific blockers)
  addBypassedBlocker: (id: BlockerId) => void;
  clearBypassedBlockers: () => void;

  // Pending navigation state
  pendingNavigation: PendingNavigation | null;
  setPendingNavigation: (nav: PendingNavigation | null) => void;

  // Get blocker state by ID
  getBlockerState: (id: BlockerId) => BlockerState;
}
```

### Hook Implementation Sketch

```typescript
// packages/router/src/hooks/useBlocker.ts

let blockerId = 0;

export function useBlocker(blocker: BlockerFunction | boolean): BlockerState {
  const { register, unregister, pendingNavigation, getBlockerState } =
    useContext(BlockerContext);

  // Stable ID for this blocker instance
  const idRef = useRef<string>();
  if (!idRef.current) {
    idRef.current = `blocker-${++blockerId}`;
  }
  const id = idRef.current;

  // Convert boolean to function
  const blockerFn = useMemo(() => {
    if (typeof blocker === "boolean") {
      return () => blocker;
    }
    return blocker;
  }, [blocker]);

  // Register/update blocker
  useEffect(() => {
    register(id, blockerFn);
    return () => unregister(id);
  }, [id, blockerFn, register, unregister]);

  // Return current state
  return getBlockerState(id);
}
```

### Integration with NavigationAPIAdapter

```typescript
// In NavigationAPIAdapter.setupInterception()

const handleNavigate = (event: NavigateEvent) => {
  if (!event.canIntercept || event.hashChange) return;

  const nextUrl = new URL(event.destination.url);
  const currentUrl = new URL(navigation.currentEntry.url);

  // Check blockers before proceeding
  const blockingId = blockerContext.checkAll({
    currentLocation: currentUrl,
    nextLocation: nextUrl,
    navigationType: event.navigationType,
  });

  if (blockingId !== null) {
    // Navigation is blocked
    event.preventDefault();

    // Store pending navigation for proceed/reset
    blockerContext.setPendingNavigation({
      destination: nextUrl,
      navigationType: event.navigationType,
      proceed: (bypassBlockerId: BlockerId) => {
        blockerContext.setPendingNavigation(null);
        // Retry navigation, re-checking other blockers (excluding the one that proceeded)
        blockerContext.addBypassedBlocker(bypassBlockerId);
        navigation.navigate(nextUrl.href, {
          history: event.navigationType === "replace" ? "replace" : "push",
        });
      },
      reset: () => {
        blockerContext.setPendingNavigation(null);
      },
    });

    return;
  }

  // Continue with normal interception...
};
```

## Edge Cases and Considerations

### 1. Multiple Blockers

When multiple components register blockers, all should be checked. If any returns `true`, navigation is blocked.

```typescript
// Order of checking: first registered that returns true wins
// Bypassed blockers (from previous proceed() calls) are skipped
checkAll(args) {
  for (const [id, blocker] of this.blockers) {
    if (this.bypassedBlockers.has(id)) {
      continue; // Skip blockers that have already called proceed()
    }
    if (blocker(args)) {
      return id; // This blocker is blocking
    }
  }
  // Clear bypassed blockers after successful navigation
  this.bypassedBlockers.clear();
  return null;
}
```

**Behavior**: Only the first blocking blocker shows UI. When that blocker calls `proceed()`, navigation is retried and **other blockers are re-checked**. This allows each blocker to show its confirmation UI in sequence if multiple blockers are active.

**Example with two blockers**:

1. User clicks link to navigate away
2. Blocker A (form dirty) blocks → shows "Save changes?" dialog
3. User clicks "Leave without saving" → Blocker A calls `proceed()`
4. Navigation retries, Blocker A is bypassed
5. Blocker B (upload in progress) blocks → shows "Cancel upload?" dialog
6. User clicks "Yes, leave" → Blocker B calls `proceed()`
7. Navigation retries, both blockers bypassed, navigation completes

### 2. External Navigation (Page Unload)

The Navigation API doesn't fire for external navigations (closing tab, navigating to different origin). For those, we need `beforeunload`:

```typescript
// Optional: useBlocker could also register beforeunload
useEffect(() => {
  if (!shouldBlock) return;

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    // Modern browsers ignore custom messages
    return (event.returnValue = "");
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [shouldBlock]);
```

**Note**: `beforeunload` only shows a generic browser dialog; custom UI is not possible for external navigation.

### 3. Programmatic Navigation

The `navigate()` function from `useNavigate()` should respect blockers:

```typescript
// Current
const navigate = useNavigate();
navigate("/dashboard");

// With blockers, this triggers the same flow as link clicks
// The Navigation API will fire a "navigate" event, which will be checked
```

This works automatically because `navigation.navigate()` fires the `navigate` event.

### 4. Back/Forward Navigation

Browser back/forward buttons fire `navigate` events with `navigationType: "traverse"`. These should be blockable but require special handling:

```typescript
// When blocking a traverse navigation
event.preventDefault();

// The URL bar may have already changed. We might need to restore it.
// This is a known limitation of the Navigation API.
```

**Recommendation**: Document this limitation. The Navigation API handles this better than History API but it's not perfect.

### 5. Form Resubmission

POST navigations (form submissions) have special considerations:

```typescript
const blocker = useBlocker(({ navigationType }) => {
  // Don't block form submissions
  if (navigationType === "push" && isPOSTNavigation) {
    return false;
  }
  return isDirty;
});
```

**Note**: The Navigation API's `NavigateEvent` has a `formData` property for form submissions.

### 6. Async Confirmation

Some use cases need async confirmation (e.g., save-before-leave):

```tsx
function EditForm() {
  const blocker = useBlocker(isDirty);

  const handleSaveAndLeave = async () => {
    await saveData();
    blocker.proceed();
  };

  if (blocker.state === "blocked") {
    return (
      <Dialog>
        <button onClick={handleSaveAndLeave}>Save & Leave</button>
        <button onClick={() => blocker.proceed()}>Leave without saving</button>
        <button onClick={() => blocker.reset()}>Stay</button>
      </Dialog>
    );
  }
}
```

The API naturally supports this because `proceed()` and `reset()` are available for as long as the blocked state persists.

### 7. Server-Side Rendering (SSR)

During SSR, there's no Navigation API. The blocker should be a no-op:

```typescript
function useBlocker(blocker: BlockerFunction | boolean): BlockerState {
  // SSR: return idle state
  if (typeof window === "undefined") {
    return {
      state: "idle",
      proceed: () => {},
      reset: () => {},
      location: null,
    };
  }

  // Client-side implementation...
}
```

### 8. Cleanup on Unmount

When a component with an active blocker unmounts while navigation is pending:

```typescript
useEffect(() => {
  return () => {
    unregister(id);
    // If this blocker was the one blocking, and it unmounts,
    // should we proceed or reset?
  };
}, []);
```

**Recommendation**: If the blocking component unmounts, automatically proceed with navigation. The user has effectively "left" the page.

## API Surface Summary

### Exports

```typescript
// New exports from @funstack/router
export { useBlocker } from "./hooks/useBlocker";
export type { BlockerState, BlockerFunction } from "./types";
```

### Types

```typescript
// packages/router/src/types.ts

export type NavigationType = "push" | "replace" | "reload" | "traverse";

export interface BlockerFunctionArgs {
  currentLocation: URL;
  nextLocation: URL;
  navigationType: NavigationType;
}

export type BlockerFunction = (args: BlockerFunctionArgs) => boolean;

export interface BlockerState {
  /** Current state of the blocker */
  state: "idle" | "blocked";

  /** Proceed with the blocked navigation */
  proceed: () => void;

  /** Cancel the blocked navigation and stay on current page */
  reset: () => void;

  /** The destination URL when blocked, null when idle */
  location: URL | null;
}
```

## Alternative Designs Considered

### 1. Promise-based blocking

```typescript
// Rejected: More complex, harder to integrate with React rendering
useBlocker(async ({ nextLocation }) => {
  return await showConfirmDialog();
});
```

**Why rejected**: Async blockers would require the Navigation API to wait for promise resolution, which doesn't align well with React's rendering model. The state-based approach is more React-idiomatic.

### 2. Render prop pattern

```typescript
// Rejected: More verbose, less flexible
<Blocker when={isDirty}>
  {({ state, proceed, reset }) => (
    state === 'blocked' && <Dialog onConfirm={proceed} onCancel={reset} />
  )}
</Blocker>
```

**Why rejected**: Hooks are more composable and don't introduce extra components in the tree.

### 3. Global event system

```typescript
// Rejected: Not React-idiomatic
router.on("beforeNavigate", (event) => {
  if (isDirty) event.prevent();
});
```

**Why rejected**: Doesn't integrate well with React component lifecycle. Hard to manage cleanup.

## Implementation Plan

### Phase 1: Core Infrastructure

1. Create `BlockerContext` with registration and state management
2. Integrate blocker checking into `NavigationAPIAdapter.setupInterception()`
3. Add `BlockerContext.Provider` to `<Router>` component

### Phase 2: useBlocker Hook

1. Implement `useBlocker` hook with registration logic
2. Handle SSR case (no-op)
3. Add cleanup on unmount

### Phase 3: Edge Cases

1. Add `beforeunload` support for external navigation
2. Handle traverse navigation (back/forward)
3. Document limitations

### Phase 4: Testing

1. Unit tests for `useBlocker` hook
2. Integration tests with mock Navigation API
3. Edge case tests (multiple blockers, unmount, etc.)

## Design Decisions

1. **Route-level `beforeLeave` guards**: Deferred to future iteration. The hook-based API covers most use cases.

2. **`proceed()` re-checks other blockers**: Yes. When `proceed()` is called, the navigation is retried and other blockers are re-checked (excluding the blocker that called `proceed()`). This allows sequential confirmation dialogs when multiple blockers are active.

3. **`usePrompt` convenience hook**: Deferred to future iteration. Can be added as a simple wrapper around `useBlocker` without breaking changes.

## Open Questions

1. **What happens if `proceed()` is called multiple times?**
   - Current design: Subsequent calls are no-ops
   - Should we throw an error?

## References

- [Navigation API Specification](https://wicg.github.io/navigation-api/)
- [React Router useBlocker](https://reactrouter.com/en/main/hooks/use-blocker)
- [Vue Router Navigation Guards](https://router.vuejs.org/guide/advanced/navigation-guards.html)
