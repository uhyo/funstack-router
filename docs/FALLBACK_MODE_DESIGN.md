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
- Opera 88+ (June 2022)

**Not supported in**:

- Firefox (under consideration)
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

### 1. Detection

```typescript
// In core/navigation.ts (existing)
export function hasNavigation(): boolean {
  return typeof window !== "undefined" && "navigation" in window;
}
```

### 2. Static Snapshot

Create a static "entry-like" object from `window.location`:

```typescript
// New: core/staticSnapshot.ts
export type StaticLocationSnapshot = {
  url: URL;
  key: string; // Fixed key for static mode
};

export function getStaticSnapshot(): StaticLocationSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  return {
    url: new URL(window.location.href),
    key: "__static__",
  };
}
```

### 3. Router Changes

```typescript
// In Router.tsx
function Router({ routes, onNavigate, fallback = "none" }: RouterProps) {
  // Try Navigation API first
  const currentEntry = useSyncExternalStore(
    subscribeToNavigation,
    getNavigationSnapshot,
    () => null
  );

  // Determine the effective URL and mode
  const { url, isStaticMode } = useMemo(() => {
    if (currentEntry !== null) {
      // Navigation API available - normal mode
      return {
        url: new URL(currentEntry.url!),
        isStaticMode: false
      };
    }

    if (fallback === "static") {
      // Fallback enabled - use static snapshot
      const snapshot = getStaticSnapshot();
      if (snapshot) {
        return {
          url: snapshot.url,
          isStaticMode: true
        };
      }
    }

    // No fallback or SSR
    return { url: null, isStaticMode: false };
  }, [currentEntry, fallback]);

  // Early return if no URL available
  if (url === null) {
    return null;
  }

  // Route matching - same for both modes
  const matchedRoutes = useMemo(
    () => matchRoutes(routes, url.pathname),
    [routes, url.pathname]
  );

  if (!matchedRoutes) {
    return null;
  }

  // Setup navigation interception - only in Navigation API mode
  useEffect(() => {
    if (isStaticMode) {
      return;  // No interception in static mode
    }
    return setupNavigationInterception(routes, onNavigate);
  }, [routes, onNavigate, isStaticMode]);

  // Create navigate function - different behavior per mode
  const navigate = useCallback((to: string, options?: NavigateOptions) => {
    if (isStaticMode) {
      // Option 1: No-op with console warning
      console.warn(
        "FUNSTACK Router: navigate() called in static fallback mode. " +
        "Navigation API is not available in this browser."
      );
      return;

      // Option 2: Full page navigation (alternative)
      // window.location.href = to;
    }
    performNavigation(to, options);
  }, [isStaticMode]);

  // Render routes (same for both modes)
  return (
    <RouterContext.Provider value={{ currentEntry, url, navigate }}>
      <RouteRenderer matchedRoutes={matchedRoutes} index={0} />
    </RouterContext.Provider>
  );
}
```

### 4. Context Changes

The `RouterContext` needs to handle the case where `currentEntry` is `null` in static mode:

```typescript
// Current RouterContext type
type RouterContextValue = {
  currentEntry: NavigationHistoryEntry; // Problem: null in static mode
  url: URL;
  navigate: NavigateFunction;
};

// Updated RouterContext type
type RouterContextValue = {
  currentEntry: NavigationHistoryEntry | null; // Allow null for static mode
  url: URL;
  navigate: NavigateFunction;
};
```

### 5. Hook Behavior in Static Mode

#### `useLocation()`

Works normally - reads from `url` in context:

```typescript
function useLocation() {
  const { url } = useRouterContext();
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  };
}
```

#### `useParams()`

Works normally - reads from `RouteContext`:

```typescript
function useParams() {
  const { params } = useRouteContext();
  return params;
}
```

#### `useNavigate()`

Returns a function that warns/no-ops in static mode:

```typescript
function useNavigate() {
  const { navigate } = useRouterContext();
  return navigate; // Already handles static mode
}
```

#### `useSearchParams()`

Read works, write warns in static mode:

```typescript
function useSearchParams() {
  const { url, navigate } = useRouterContext();

  const setSearchParams = useCallback(
    (
      params: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    ) => {
      // This will warn in static mode via navigate()
      const newParams =
        typeof params === "function"
          ? params(new URLSearchParams(url.search))
          : params;
      navigate(`${url.pathname}?${newParams.toString()}`);
    },
    [url, navigate],
  );

  return [new URLSearchParams(url.search), setSearchParams] as const;
}
```

### 6. Data Loaders in Static Mode

Data loaders work identically in static mode:

1. Routes are matched against current URL
2. Loaders are executed
3. Data is passed to components
4. Components render with data

The only difference is the cache key strategy, since there's no `NavigationHistoryEntry.key`:

```typescript
function getCacheKey(
  entry: NavigationHistoryEntry | null,
  routePath: string,
): string {
  const entryKey = entry?.key ?? "__static__";
  return `${entryKey}:${routePath}`;
}
```

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

### Phase 1: Core Static Fallback

- [ ] Add `fallback` prop to Router
- [ ] Implement `getStaticSnapshot()`
- [ ] Update Router to use static snapshot when appropriate
- [ ] Update `RouterContext` type to allow null `currentEntry`
- [ ] Skip navigation interception setup in static mode

### Phase 2: Hook Updates

- [ ] Ensure `useLocation()` works in static mode
- [ ] Ensure `useParams()` works in static mode
- [ ] Update `useNavigate()` to warn in static mode
- [ ] Update `useSearchParams()` write to warn in static mode

### Phase 3: Testing & Documentation

- [ ] Add unit tests for static fallback
- [ ] Add integration tests
- [ ] Update README with fallback documentation
- [ ] Add example showing fallback usage

### Future Enhancements (Out of Scope)

- `fallback="static-reload"` option for navigate()
- Console hint about polyfills
- SSR hydration considerations

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
