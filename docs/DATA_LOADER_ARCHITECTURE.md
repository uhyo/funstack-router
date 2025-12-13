# Data Loader Architecture

This document describes the architecture for adding a data loader feature to FUNSTACK Router with Suspense integration.

## Core Design Principle

**Components receive loader results directly as props.**

The router passes whatever the loader returns (Promise or value) to the component as a `data` prop. Components handle Promises with React's `use()` hook when needed. This gives maximum flexibility to component authors while keeping the router's responsibility minimal.

## API Design

### Route Definition

```typescript
type RouteDefinition<TData = unknown> = {
  path: string;
  children?: RouteDefinition[];
} & (
  | {
      // Route with loader - component receives data prop
      loader: (args: LoaderArgs) => TData;
      component: ComponentType<{ data: TData }>;
    }
  | {
      // Route without loader - component receives no data prop
      loader?: never;
      component?: ComponentType;
    }
);

type LoaderArgs = {
  params: Record<string, string>;
  request: Request; // Allows access to URL, headers, etc.
  signal: AbortSignal; // For cancellation on navigation
};
```

### Route Definition Helper

Using `RouteDefinition[]` directly loses type inference for each route's `TData`. A helper function preserves the inferred types:

```typescript
// Helper for routes with loader - infers TData from loader return type
function route<TData>(definition: {
  path: string;
  loader: (args: LoaderArgs) => TData;
  component: ComponentType<{ data: TData }>;
  children?: RouteDefinition[];
}): RouteDefinition<TData> {
  return definition;
}

// Helper for routes without loader
function route(definition: {
  path: string;
  component?: ComponentType;
  children?: RouteDefinition[];
}): RouteDefinition {
  return definition;
}
```

**Usage**:

```typescript
const routes = [
  route({
    path: "users/:userId",
    component: UserDetail,
    loader: async ({ params, signal }) => {
      const res = await fetch(`/api/users/${params.userId}`, { signal });
      return res.json() as Promise<User>;
    },
    // ✅ TypeScript knows component must accept { data: Promise<User> }
  }),
  route({
    path: "settings",
    component: Settings,
    loader: () => getSettingsFromLocalStorage(),
    // ✅ TypeScript infers TData from loader return type
  }),
  route({
    path: "about",
    component: AboutPage,
    // ✅ No loader, no data prop required
  }),
];
```

Without the helper, all routes would have `TData = unknown`, breaking type safety between loader and component.

### Component Access

Components receive the loader result directly as a `data` prop:

```typescript
// Async loader - component receives Promise
function UserDetail({ data }: { data: Promise<User> }) {
  const user = use(data); // Suspends until resolved
  return <div>{user.name}</div>;
}

// Sync loader - component receives value directly
function UserDetail({ data }: { data: User }) {
  return <div>{data.name}</div>;
}
```

**Advantages of props over hooks**:

1. Explicit dependency - component signature shows what it receives
2. Better TypeScript inference - prop type tied to loader's return type
3. No context lookup overhead
4. Simpler implementation
5. Flexible - works with both sync and async loaders

### Usage Example

```tsx
// Route definition with async loader
const routes: RouteDefinition[] = [
  {
    path: "users/:userId",
    component: UserDetail,
    loader: async ({ params, signal }) => {
      const res = await fetch(`/api/users/${params.userId}`, { signal });
      return res.json();
    },
  },
];

// App with Suspense boundary (needed for async loaders)
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Router routes={routes} />
    </Suspense>
  );
}

// Component receives Promise, uses `use()` to suspend
function UserDetail({ data }: { data: Promise<User> }) {
  const user = use(data);
  return <div>{user.name}</div>;
}
```

```tsx
// Route definition with sync loader (e.g., reading from cache)
const routes: RouteDefinition[] = [
  {
    path: "settings",
    component: Settings,
    loader: () => getSettingsFromLocalStorage(),
  },
];

// No Suspense needed for sync loaders
function Settings({ data }: { data: Settings }) {
  return <div>{data.theme}</div>;
}
```

## Implementation Design

### 1. Loader Execution Timing

Loaders execute whenever the Router renders with a URL - both on **initial page load** and **subsequent navigations**.

```
Initial Page Load / Navigation
    ↓
Router renders, reads current URL
    ↓
matchRoutes() → MatchedRoute[]
    ↓
Execute loaders for each matched route (in parallel)
    ↓
Render RouteRenderer tree (loader results passed as props)
    ↓
Components receive data prop (Promise or value)
    ↓
Components use `use()` if data is a Promise
```

**Initial load**: Router reads URL from `navigation.currentEntry` (or `window.location` as fallback) on first render and executes loaders immediately.

**Navigation**: Router subscribes to Navigation API via `useSyncExternalStore`. When URL changes, component re-renders, triggering route matching and loader execution.

**Key insight**: The router does NOT await Promises. It immediately renders the component tree, passing loader results as props. Suspension happens when components call `use()` on Promise values.

### 2. Extended Types

```typescript
// Extended MatchedRoute with loader data
type MatchedRouteWithData = MatchedRoute & {
  data: unknown | undefined;
};

// Loader function type (can return Promise or value)
type LoaderFunction<TData = unknown> = (args: LoaderArgs) => TData;

// Component prop type (when loader is defined)
type RouteComponentProps<TData = unknown> = {
  data: TData;
};
```

Note: RouteContext remains unchanged - it doesn't need to store the data since it's passed directly as a prop.

### 3. Loader Execution Strategy

```typescript
// In Router.tsx, after route matching
function executeLoaders(
  matchedRoutes: MatchedRoute[],
  request: Request,
): MatchedRouteWithData[] {
  return matchedRoutes.map((match) => {
    const { route, params } = match;
    const data = route.loader ? route.loader({ params, request }) : undefined;

    return { ...match, data };
  });
}
```

### 4. RouteRenderer Changes

```typescript
function RouteRenderer({
  matchedRoutes,
  index,
}: RouteRendererProps): ReactNode {
  const match = matchedRoutes[index];
  const { route, params, pathname, data } = match;
  const Component = route.component;

  const outlet = /* ... existing outlet logic ... */;

  const routeContextValue = useMemo(
    () => ({
      params,
      matchedPath: pathname,
      outlet,
    }),
    [params, pathname, outlet],
  );

  return (
    <RouteContext.Provider value={routeContextValue}>
      {Component ? (
        // Pass data as prop if loader exists
        data !== undefined ? <Component data={data} /> : <Component />
      ) : (
        outlet
      )}
    </RouteContext.Provider>
  );
}
```

## Loader Result Caching Strategy

### Problem

If RouteRenderer re-renders, we must NOT re-execute loaders. Re-executing would:

1. Trigger new network requests (for async loaders)
2. Cause Suspense to re-suspend unnecessarily
3. Break the component's ability to track loading state

### Solution: Cache Results by Navigation Entry

```typescript
// Cache keyed by navigation entry key + route path
const loaderCache = new Map<string, unknown>();

function getOrCreateLoaderResult(
  entryKey: string,
  route: RouteDefinition,
  args: LoaderArgs,
): unknown | undefined {
  if (!route.loader) return undefined;

  const cacheKey = `${entryKey}:${route.path}`;

  if (!loaderCache.has(cacheKey)) {
    loaderCache.set(cacheKey, route.loader(args));
  }

  return loaderCache.get(cacheKey);
}
```

### Cache Invalidation

- Clear cache entry when navigating away from a route
- Clear entire cache on full page navigation
- Optionally: provide `revalidate()` function for manual invalidation

## Parallel vs Sequential Loading

### Default: Parallel Loading

All loaders for matched routes execute simultaneously:

```typescript
// All three loaders start at the same time
[
  { path: "org/:orgId", loader: loadOrg }, // Starts immediately
  { path: "team/:teamId", loader: loadTeam }, // Starts immediately
  { path: "user/:userId", loader: loadUser }, // Starts immediately
];
```

### Future Enhancement: Sequential/Dependent Loading

For cases where child loaders depend on parent data:

```typescript
// Future API possibility
{
  path: "org/:orgId",
  loader: loadOrg,
  children: [{
    path: "team/:teamId",
    // Receives parent data as argument
    loader: ({ params, parentData }) => loadTeam(parentData.orgId, params.teamId),
  }]
}
```

This is **out of scope** for the initial implementation.

## Error Handling

### Design: Errors Propagate Naturally

The router does not catch loader errors. Errors propagate naturally:

1. Loader throws or returns rejected Promise
2. Component calls `use(data)` → Error thrown (for Promises)
3. Nearest ErrorBoundary catches the error

```tsx
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        <Router routes={routes} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Future Enhancement: Route-Level Error Boundaries

```typescript
// Future API possibility
{
  path: "users/:id",
  component: UserDetail,
  loader: loadUser,
  errorElement: <UserLoadError />, // Catch errors for this route
}
```

This is **out of scope** for the initial implementation.

## Request Object

### Creating the Request

```typescript
function createLoaderRequest(url: URL): Request {
  return new Request(url.href, {
    method: "GET",
    // Could include headers, signal for abort, etc.
  });
}
```

### Use Cases

- Access full URL including search params
- Future: Include authentication headers

## Navigation Cancellation

The `signal` parameter in `LoaderArgs` enables cancellation when navigating away:

```typescript
loader: async ({ params, signal }) => {
  const res = await fetch(`/api/users/${params.userId}`, { signal });
  return res.json();
};
```

**Implementation approach**: The router creates an `AbortController` per navigation. When a new navigation occurs, the previous controller is aborted. This is a future enhancement - initial implementation may pass a never-aborting signal.

## Implementation Phases

### Phase 1: Core Implementation

- [ ] Add `loader` field to RouteDefinition type
- [ ] Add `route` helper function for type inference
- [ ] Implement loader execution in Router
- [ ] Pass `data` as prop to route components
- [ ] Add loader result caching by navigation entry

### Phase 2: Request & Signal

- [ ] Create Request object for loaders
- [ ] Create AbortController per navigation
- [ ] Abort previous loader when navigating away

### Phase 3: Documentation & Examples

- [ ] Document the data loader API
- [ ] Create example with Suspense
- [ ] Create example with ErrorBoundary

### Future Phases (Out of Scope)

- Route-level error elements
- Dependent/sequential loaders
- Loader revalidation API

## Comparison with Other Routers

### React Router

React Router awaits loaders and provides resolved data:

```typescript
// React Router - data is already resolved
const data = useLoaderData(); // Returns resolved data
```

### FUNSTACK Router (This Design)

FUNSTACK passes loader result as a prop, component handles it:

```typescript
// FUNSTACK - async loader, component receives Promise
function UserDetail({ data }: { data: Promise<User> }) {
  const user = use(data); // Component chooses when to suspend
  return <div>{user.name}</div>;
}

// FUNSTACK - sync loader, component receives value directly
function Settings({ data }: { data: Settings }) {
  return <div>{data.theme}</div>;
}
```

**Advantages of our approach**:

1. Component has full control over loading UX
2. Can show partial UI while waiting for data
3. Can handle multiple data sources differently
4. Works naturally with React 19's `use()` hook
5. No "loading state" managed by router
6. Supports both sync and async loaders

## Summary

The data loader feature adds:

1. `loader` property on route definitions (can return Promise or value)
2. `data` prop passed to route components
3. Loader result caching to prevent duplicate execution

Components receive loader results as props and handle Promises with React's `use()` hook when needed, giving maximum flexibility while keeping the router simple.
