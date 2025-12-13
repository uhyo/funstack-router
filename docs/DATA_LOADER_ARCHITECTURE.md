# Data Loader Architecture

This document describes the architecture for adding a data loader feature to FUNSTACK Router with Suspense integration.

## Core Design Principle

**Components receive a Promise, not resolved data.**

The router provides the data loading Promise to route components, allowing them to handle Suspense as they see fit. This gives maximum flexibility to component authors while keeping the router's responsibility minimal.

## API Design

### Route Definition

```typescript
type RouteDefinition<TData = unknown> = {
  path: string;
  component?: ComponentType;
  children?: RouteDefinition[];
  // New: data loader function
  loader?: (args: LoaderArgs) => Promise<TData>;
};

type LoaderArgs = {
  params: Record<string, string>;
  request: Request; // Allows access to URL, headers, etc.
};
```

### Component Access

Components receive the loader Promise directly as a prop:

```typescript
type UserDetailProps = {
  dataPromise: Promise<User>;
};

function UserDetail({ dataPromise }: UserDetailProps) {
  // Component decides how to handle the Promise
  // Use React 19's `use()` hook (requires Suspense boundary)
  const user = use(dataPromise);

  return <div>{user.name}</div>;
}
```

**Advantages of props over hooks**:

1. Explicit dependency - component signature shows what it receives
2. Better TypeScript inference - prop type tied to loader's return type
3. No context lookup overhead
4. Simpler implementation

### Usage Example

```tsx
// Route definition with loader
const routes: RouteDefinition[] = [
  {
    path: "users/:userId",
    component: UserDetail,
    loader: async ({ params }) => {
      const res = await fetch(`/api/users/${params.userId}`);
      return res.json();
    },
  },
];

// App with Suspense boundary
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Router routes={routes} />
    </Suspense>
  );
}

// Component receives Promise as prop
function UserDetail({ dataPromise }: { dataPromise: Promise<User> }) {
  const user = use(dataPromise); // Suspends here
  return <div>{user.name}</div>;
}
```

## Implementation Design

### 1. Loader Execution Timing

Loaders are executed **during route matching**, before component rendering begins.

```
Navigation Event
    ↓
matchRoutes() → MatchedRoute[]
    ↓
Execute loaders for each matched route (in parallel)
    ↓
Render RouteRenderer tree (Promises passed as props)
    ↓
Components receive dataPromise prop
    ↓
Components use `use()` to suspend until data ready
```

**Key insight**: The router does NOT await the Promises. It immediately renders the component tree, passing Promises as props. Suspension happens when components call `use()`.

### 2. Extended Types

```typescript
// Extended MatchedRoute with loader data
type MatchedRouteWithData = MatchedRoute & {
  dataPromise: Promise<unknown> | undefined;
};

// Loader function type
type LoaderFunction<TData = unknown> = (args: LoaderArgs) => Promise<TData>;

// Component prop type (when loader is defined)
type RouteComponentProps<TData = unknown> = {
  dataPromise: Promise<TData>;
};
```

Note: RouteContext remains unchanged - it doesn't need to store the data promise since it's passed directly as a prop.

### 3. Loader Execution Strategy

```typescript
// In Router.tsx, after route matching
function executeLoaders(
  matchedRoutes: MatchedRoute[],
  request: Request,
): MatchedRouteWithData[] {
  return matchedRoutes.map((match) => {
    const { route, params } = match;
    const dataPromise = route.loader
      ? route.loader({ params, request })
      : undefined;

    return { ...match, dataPromise };
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
  const { route, params, pathname, dataPromise } = match;
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
        // Pass dataPromise as prop if loader exists
        dataPromise ? (
          <Component dataPromise={dataPromise} />
        ) : (
          <Component />
        )
      ) : (
        outlet
      )}
    </RouteContext.Provider>
  );
}
```

## Promise Caching Strategy

### Problem

If RouteRenderer re-renders, we must NOT create a new loader Promise. Creating new Promises would:

1. Trigger new network requests
2. Cause Suspense to re-suspend unnecessarily
3. Break the component's ability to track loading state

### Solution: Cache Promises by Navigation Entry

```typescript
// Cache keyed by navigation entry key + route path
const loaderCache = new Map<string, Promise<unknown>>();

function getOrCreateLoaderPromise(
  entryKey: string,
  route: RouteDefinition,
  args: LoaderArgs,
): Promise<unknown> | undefined {
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

### Design: Errors Propagate Through Promises

The router does not catch loader errors. Errors propagate naturally:

1. Loader throws/rejects → Promise rejects
2. Component calls `use(dataPromise)` → Error thrown
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
- Future: Abort controller for cancellation
- Future: Include authentication headers

## Open Questions

### 1. Should we support synchronous loaders?

```typescript
// Synchronous loader - returns data directly
loader: ({ params }) => getCachedUser(params.id);

// vs always async
loader: async ({ params }) => getCachedUser(params.id);
```

**Recommendation**: Always async (return Promise) for consistency

### 3. How to handle navigation during loading?

When user navigates away while a loader is pending:

- Option A: Let the Promise complete, ignore result
- Option B: Abort the request via AbortController

**Recommendation**: Start with Option A, add abort support later

## Implementation Phases

### Phase 1: Core Implementation

- [ ] Add `loader` field to RouteDefinition type
- [ ] Implement loader execution in Router
- [ ] Pass `dataPromise` as prop to route components
- [ ] Add Promise caching by navigation entry

### Phase 2: Request Object

- [ ] Create Request object for loaders
- [ ] Pass request to loader functions

### Phase 3: Documentation & Examples

- [ ] Document the data loader API
- [ ] Create example with Suspense
- [ ] Create example with ErrorBoundary

### Future Phases (Out of Scope)

- Route-level error elements
- Dependent/sequential loaders
- Abort controller support
- Loader revalidation API

## Comparison with Other Routers

### React Router

React Router awaits loaders and provides resolved data:

```typescript
// React Router - data is already resolved
const data = useLoaderData(); // Returns resolved data
```

### FUNSTACK Router (This Design)

FUNSTACK passes the Promise as a prop, component handles suspension:

```typescript
// FUNSTACK - component receives Promise as prop
function UserDetail({ dataPromise }: { dataPromise: Promise<User> }) {
  const data = use(dataPromise); // Component chooses when to suspend
  return <div>{data.name}</div>;
}
```

**Advantages of our approach**:

1. Component has full control over loading UX
2. Can show partial UI while waiting for data
3. Can handle multiple data sources differently
4. Works naturally with React 19's `use()` hook
5. No "loading state" managed by router

## Summary

The data loader feature adds:

1. `loader` property on route definitions
2. `dataPromise` prop passed to route components
3. Promise caching to prevent duplicate requests

Components receive Promises as props and handle Suspense themselves using React's `use()` hook, giving maximum flexibility while keeping the router simple.
