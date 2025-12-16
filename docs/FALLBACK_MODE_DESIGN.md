# Fallback Mode Design

This document describes the design for an opt-in fallback mode when the Navigation API is unavailable.

## Problem Statement

FUNSTACK Router is built exclusively on the Navigation API. When opened in a browser without Navigation API support, the router renders nothing:

```tsx
// Current behavior in Router.tsx
const currentEntry = useSyncExternalStore(
  subscribeToNavigation,
  getNavigationSnapshot,
  () => null, // SSR/no Navigation API returns null
);

if (currentEntry === null) {
  return null; // Nothing renders!
}
```

This is intentional but inconvenient for users who want their app to at least display content in unsupported browsers.

### Browser Support

Navigation API is supported in:

- Chrome 102+ (March 2022)
- Edge 102+ (June 2022)
- Firefox 147+ (July 2025)
- Opera 88+ (June 2022)

**Not supported in**:

- Safari (no public signal)

## Design Goals

1. **Opt-in**: Fallback mode must be explicitly enabled
2. **Minimal**: Only match routes and render - no SPA navigation
3. **No History API**: We will NOT implement History API-based navigation
4. **MPA behavior**: Links cause full page loads, like a traditional website
5. **Zero overhead**: No impact on Navigation API code path

## Non-Goals

- Full SPA experience in unsupported browsers
- Link interception using click handlers
- Programmatic navigation via History API
- Back/forward button handling
- Navigation state management

## API Design

### Router Props

```typescript
type RouterProps = {
  routes: RouteDefinition[];
  onNavigate?: NavigateEventHandler;
  fallback?: FallbackMode; // NEW
};

type FallbackMode =
  | "none" // Default: render nothing when Navigation API unavailable
  | "static"; // Render matched routes without navigation capabilities
```

### Usage

```tsx
// Opt-in to static fallback
<Router routes={routes} fallback="static" />

// Explicit no fallback (same as default)
<Router routes={routes} fallback="none" />

// Default behavior (backwards compatible)
<Router routes={routes} />
```

## Behavior Comparison

| Feature               | Navigation API Mode | Static Fallback Mode |
| --------------------- | ------------------- | -------------------- |
| Initial route render  | ✅                  | ✅                   |
| Route params          | ✅                  | ✅                   |
| Nested routes         | ✅                  | ✅                   |
| `<Outlet>`            | ✅                  | ✅                   |
| Data loaders          | ✅                  | ✅                   |
| `useParams()`         | ✅                  | ✅                   |
| `useLocation()`       | ✅                  | ✅ (read-only)       |
| Link clicks (SPA)     | ✅ Intercepted      | ❌ Full page load    |
| `useNavigate()`       | ✅ Works            | ⚠️ Throws or no-op   |
| Back/forward (SPA)    | ✅ Handled          | ❌ Full page load    |
| `onNavigate` callback | ✅                  | ❌ Never called      |

## Implementation Design

### Core Principle: Interface-Based Abstraction

Instead of scattering `if (isStaticMode)` checks throughout the codebase, we introduce a `RouterAdapter` interface that abstracts all navigation-related operations. Two implementations exist:

1. **`NavigationAPIAdapter`** - Uses the real Navigation API
2. **`StaticAdapter`** - Provides static/read-only behavior for fallback mode

This keeps the Router component and hooks clean, with mode-specific logic encapsulated in the adapters.

### 1. RouterAdapter Interface

```typescript
// New: core/RouterAdapter.ts

/**
 * Represents the current location state.
 * Abstracts NavigationHistoryEntry for static mode compatibility.
 */
export type LocationEntry = {
  url: URL;
  key: string;
  state: unknown;
};

/**
 * Interface for navigation adapters.
 * Implementations handle mode-specific navigation behavior.
 */
export interface RouterAdapter {
  /**
   * Get the current location entry.
   * Returns null during SSR or if unavailable.
   */
  getSnapshot(): LocationEntry | null;

  /**
   * Subscribe to location changes.
   * Returns an unsubscribe function.
   */
  subscribe(callback: () => void): () => void;

  /**
   * Perform programmatic navigation.
   */
  navigate(to: string, options?: NavigateOptions): void;

  /**
   * Set up navigation interception for route matching.
   * Returns a cleanup function, or undefined if not supported.
   */
  setupInterception(
    routes: RouteDefinition[],
    onNavigate?: NavigateEventHandler,
  ): (() => void) | undefined;
}
```

### 2. NavigationAPIAdapter Implementation

```typescript
// New: core/NavigationAPIAdapter.ts

export class NavigationAPIAdapter implements RouterAdapter {
  getSnapshot(): LocationEntry | null {
    if (typeof window === "undefined" || !("navigation" in window)) {
      return null;
    }
    const entry = window.navigation.currentEntry;
    if (!entry?.url) return null;

    return {
      url: new URL(entry.url),
      key: entry.key,
      state: entry.getState(),
    };
  }

  subscribe(callback: () => void): () => void {
    if (typeof window === "undefined" || !("navigation" in window)) {
      return () => {};
    }
    window.navigation.addEventListener("currententrychange", callback);
    return () => {
      window.navigation.removeEventListener("currententrychange", callback);
    };
  }

  navigate(to: string, options?: NavigateOptions): void {
    window.navigation.navigate(to, {
      history: options?.replace ? "replace" : "push",
      state: options?.state,
    });
  }

  setupInterception(
    routes: RouteDefinition[],
    onNavigate?: NavigateEventHandler,
  ): (() => void) | undefined {
    // Existing setupNavigationInterception logic
    const handler = (event: NavigateEvent) => {
      if (!event.canIntercept || event.hashChange) return;

      const url = new URL(event.destination.url);
      const matched = matchRoutes(routes, url.pathname);

      if (onNavigate) {
        onNavigate(event, matched);
        if (event.defaultPrevented) return;
      }

      if (matched) {
        event.intercept({
          handler: async () => {
            await executeLoaders(matched, url);
          },
        });
      }
    };

    window.navigation.addEventListener("navigate", handler);
    return () => window.navigation.removeEventListener("navigate", handler);
  }
}
```

### 3. StaticAdapter Implementation

```typescript
// New: core/StaticAdapter.ts

export class StaticAdapter implements RouterAdapter {
  private cachedSnapshot: LocationEntry | null = null;

  getSnapshot(): LocationEntry | null {
    if (typeof window === "undefined") {
      return null;
    }

    // Cache the snapshot - it never changes in static mode
    if (!this.cachedSnapshot) {
      this.cachedSnapshot = {
        url: new URL(window.location.href),
        key: "__static__",
        state: undefined,
      };
    }
    return this.cachedSnapshot;
  }

  subscribe(_callback: () => void): () => void {
    // Static mode never fires location change events
    return () => {};
  }

  navigate(to: string, _options?: NavigateOptions): void {
    console.warn(
      "FUNSTACK Router: navigate() called in static fallback mode. " +
        "Navigation API is not available in this browser. " +
        "Links will cause full page loads.",
    );
    // Optionally: window.location.href = to;
  }

  setupInterception(
    _routes: RouteDefinition[],
    _onNavigate?: NavigateEventHandler,
  ): (() => void) | undefined {
    // No interception in static mode - links cause full page loads
    return undefined;
  }
}
```

### 4. Adapter Factory

```typescript
// New: core/createAdapter.ts

export function createAdapter(fallback: FallbackMode): RouterAdapter | null {
  // Try Navigation API first
  if (typeof window !== "undefined" && "navigation" in window) {
    return new NavigationAPIAdapter();
  }

  // Fall back to static mode if enabled
  if (fallback === "static") {
    return new StaticAdapter();
  }

  // No adapter available
  return null;
}
```

### 5. Router Component (Simplified)

With the adapter abstraction, the Router component becomes much cleaner:

```typescript
// In Router.tsx
function Router({ routes, onNavigate, fallback = "none" }: RouterProps) {
  // Create adapter once based on browser capabilities and fallback setting
  const adapter = useMemo(() => createAdapter(fallback), [fallback]);

  // Subscribe to location changes via adapter
  const locationEntry = useSyncExternalStore(
    useCallback(
      (callback) => adapter?.subscribe(callback) ?? (() => {}),
      [adapter],
    ),
    () => adapter?.getSnapshot() ?? null,
    () => null, // SSR snapshot
  );

  // Early return if no location available
  if (!locationEntry) {
    return null;
  }

  const { url } = locationEntry;

  // Route matching
  const matchedRoutes = useMemo(
    () => matchRoutes(routes, url.pathname),
    [routes, url.pathname],
  );

  if (!matchedRoutes) {
    return null;
  }

  // Setup navigation interception via adapter
  useEffect(() => {
    return adapter?.setupInterception(routes, onNavigate);
  }, [adapter, routes, onNavigate]);

  // Navigate function from adapter
  const navigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      adapter?.navigate(to, options);
    },
    [adapter],
  );

  // Render routes
  return (
    <RouterContext.Provider value={{ locationEntry, url, navigate }}>
      <RouteRenderer matchedRoutes={matchedRoutes} index={0} />
    </RouterContext.Provider>
  );
}
```

### 6. Context Changes

The context now uses the abstract `LocationEntry` type:

```typescript
// Updated RouterContext type
type RouterContextValue = {
  locationEntry: LocationEntry;
  url: URL;
  navigate: NavigateFunction;
};
```

### 7. Hook Behavior

Hooks remain simple since they just read from context:

```typescript
function useLocation() {
  const { url } = useRouterContext();
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  };
}

function useParams() {
  const { params } = useRouteContext();
  return params;
}

function useNavigate() {
  const { navigate } = useRouterContext();
  return navigate; // Adapter handles mode-specific behavior
}
```

### 8. Data Loaders

Data loaders use `LocationEntry.key` for caching, which works uniformly:

```typescript
function getCacheKey(entry: LocationEntry, routePath: string): string {
  return `${entry.key}:${routePath}`;
}
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Router Component                         │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    RouterAdapter                         │   │
│   │                     (interface)                          │   │
│   │                                                          │   │
│   │  getSnapshot(): LocationEntry | null                     │   │
│   │  subscribe(callback): () => void                         │   │
│   │  navigate(to, options): void                             │   │
│   │  setupInterception(routes, onNavigate): (() => void)?    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
│              ┌───────────────┴───────────────┐                   │
│              │                               │                    │
│              ▼                               ▼                    │
│   ┌─────────────────────┐       ┌─────────────────────┐         │
│   │ NavigationAPIAdapter │       │    StaticAdapter    │         │
│   │                      │       │                     │         │
│   │ • Uses Navigation    │       │ • Reads location    │         │
│   │   API events         │       │   once              │         │
│   │ • Intercepts links   │       │ • No subscription   │         │
│   │ • SPA navigation     │       │ • navigate() warns  │         │
│   └─────────────────────┘       └─────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Benefits of This Approach

1. **Single responsibility**: Each adapter handles one mode completely
2. **No scattered conditionals**: Router/hooks don't check `isStaticMode`
3. **Testable**: Adapters can be tested in isolation
4. **Extensible**: Easy to add new adapters (e.g., History API fallback in the future)
5. **Type-safe**: `LocationEntry` provides a consistent interface

## Flow Diagrams

### Navigation API Mode (Existing)

```
User clicks link
      │
      ▼
┌─────────────────────────────────────┐
│  Navigation API "navigate" event    │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Router intercepts via intercept()  │
│  Runs loaders                       │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  "currententrychange" event fires   │
│  useSyncExternalStore updates       │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Router re-renders with new route   │
└─────────────────────────────────────┘
```

### Static Fallback Mode

```
Page loads
      │
      ▼
┌─────────────────────────────────────┐
│  Navigation API unavailable         │
│  fallback="static" enabled          │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Read window.location               │
│  Create static snapshot             │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Match routes against pathname      │
│  Execute loaders                    │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Render matched route tree          │
└─────────────────────────────────────┘
      │
      ▼
User clicks link
      │
      ▼
┌─────────────────────────────────────┐
│  Browser performs full page load    │
│  (No interception in static mode)   │
└─────────────────────────────────────┘
```

## Alternative Designs Considered

### 1. History API Fallback

**Rejected**: Adding a full History API fallback would:

- Significantly increase bundle size
- Require maintaining two navigation paradigms
- Add complexity for edge cases (popstate timing, etc.)
- Go against the project's Navigation API-first philosophy

### 2. Automatic Fallback (No Opt-in)

**Rejected**: Silent fallback could mask issues:

- Developers might not realize Navigation API isn't being used
- Different behavior between browsers without warning
- Could lead to bugs that only manifest in certain browsers

### 3. Fallback with Polyfill Suggestion

**Considered**: Could show a console message suggesting a polyfill.

```typescript
if (fallback === "static" && isStaticMode) {
  console.info(
    "FUNSTACK Router: Running in static fallback mode. " +
      "For full SPA functionality, consider using a Navigation API polyfill.",
  );
}
```

This could be added as a `fallback="static-with-hint"` option.

### 4. `navigate()` Does Full Page Navigation

**Considered**: Instead of warning, `navigate()` could do `window.location.href = to`:

```typescript
if (isStaticMode) {
  window.location.href = to;
  return;
}
```

**Trade-offs**:

- Pro: Code using `navigate()` still "works"
- Con: Unexpected behavior (full reload vs SPA navigation)
- Con: Could mask bugs where developer expects SPA behavior

**Decision**: Default to warning, but could offer as option:

```typescript
type FallbackMode =
  | "none"
  | "static" // Warn on navigate()
  | "static-reload"; // navigate() does full page load
```

## Testing Strategy

### Unit Tests

1. **Static snapshot creation**
   - Returns correct URL from window.location
   - Returns null during SSR

2. **Router with fallback="none"**
   - Returns null when Navigation API unavailable

3. **Router with fallback="static"**
   - Renders matched routes when Navigation API unavailable
   - Passes correct params to components
   - Data loaders execute correctly

4. **Hook behavior in static mode**
   - `useLocation()` returns correct values
   - `useParams()` returns correct values
   - `useNavigate()` returns function that warns

### Integration Tests

1. **Full render test**
   - Mount Router with fallback="static" in jsdom (no Navigation API)
   - Verify correct route renders

2. **Nested routes**
   - Verify `<Outlet>` works correctly in static mode

## Implementation Phases

### Phase 1: RouterAdapter Interface & Refactor

- [ ] Define `LocationEntry` type in `core/RouterAdapter.ts`
- [ ] Define `RouterAdapter` interface
- [ ] Implement `NavigationAPIAdapter` class
- [ ] Refactor existing `core/navigation.ts` functions into the adapter
- [ ] Update Router to use adapter pattern
- [ ] Update `RouterContext` to use `LocationEntry` instead of `NavigationHistoryEntry`

### Phase 2: Static Adapter

- [ ] Implement `StaticAdapter` class
- [ ] Implement `createAdapter()` factory function
- [ ] Add `fallback` prop to Router props
- [ ] Wire up adapter selection based on `fallback` prop

### Phase 3: Testing

- [ ] Add unit tests for `NavigationAPIAdapter`
- [ ] Add unit tests for `StaticAdapter`
- [ ] Add integration tests for Router with `fallback="static"`
- [ ] Verify existing tests still pass (no regression)

### Phase 4: Documentation

- [ ] Update README with fallback documentation
- [ ] Add example showing fallback usage
- [ ] Document the adapter architecture for contributors

### Future Enhancements (Out of Scope)

- `fallback="static-reload"` option for navigate()
- Console hint about polyfills
- SSR hydration considerations
- History API adapter (if ever needed)

## Migration Guide

### For New Users

Simply add `fallback="static"` if you want basic rendering in unsupported browsers:

```tsx
<Router routes={routes} fallback="static" />
```

### For Existing Users

No changes required. Default behavior (`fallback="none"`) is unchanged.

## Summary

The static fallback mode provides a minimal, opt-in way to render content when the Navigation API is unavailable. It:

1. Matches the current URL against routes
2. Renders the matched component tree
3. Executes data loaders
4. Does NOT intercept navigation (MPA behavior)

This allows applications to at least display their UI in unsupported browsers, while clearly communicating that full SPA functionality requires Navigation API support.
