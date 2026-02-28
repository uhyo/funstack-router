# Design: Lazy Route Definitions

## Background / Motivation

Currently, the entire route tree must be fully defined at initialization. Every route — including its component, loader, action, and children — must be imported before the `<Router>` renders:

```typescript
import { AdminLayout } from "./admin/AdminLayout";
import { AdminSettings } from "./admin/AdminSettings";
import { AdminUsers } from "./admin/AdminUsers";
import { AdminRoles } from "./admin/AdminRoles";
// ... dozens more admin routes ...

const routes = [
  route({
    path: "admin",
    component: AdminLayout,
    children: [
      route({ path: "settings", component: AdminSettings }),
      route({ path: "users", component: AdminUsers }),
      route({ path: "roles", component: AdminRoles }),
      // ... dozens more ...
    ],
  }),
];
```

For large applications, this means every route module is part of the initial bundle, even if most users never visit most routes. Code splitting at the component level (via `React.lazy`) helps, but the route _definitions themselves_ — paths, loaders, actions, and the tree structure — still must all be present upfront.

Lazy route definitions solve this by allowing entire subtrees of the route tree to be loaded on demand, only when a user navigates to a matching path.

## Proposed API

Allow `children` to accept an async function that returns route definitions:

```typescript
route({
  path: "admin",
  component: AdminLayout,
  children: async () => {
    const { adminRoutes } = await import("./admin/routes");
    return adminRoutes;
  },
});
```

The async function is called at most once — when the router first needs the children (either on navigation to a matching path or on initial page load). After resolution, the returned route definitions replace the function in the route tree, and all subsequent matching operates on the resolved children synchronously.

### Usage Examples

#### Basic lazy subtree

```typescript
// routes.ts
const routes = [
  route({
    path: "/",
    component: HomePage,
  }),
  route({
    path: "admin",
    component: AdminLayout,
    children: async () => {
      const { adminRoutes } = await import("./admin/routes");
      return adminRoutes;
    },
  }),
  route({
    path: "dashboard",
    component: DashboardLayout,
    children: async () => {
      const { dashboardRoutes } = await import("./dashboard/routes");
      return dashboardRoutes;
    },
  }),
];
```

```typescript
// admin/routes.ts — only loaded when navigating to /admin/*
export const adminRoutes = [
  route({ path: "settings", component: AdminSettings }),
  route({ path: "users", component: AdminUsers, children: [...] }),
  route({ path: "roles", component: AdminRoles }),
];
```

#### Nested lazy subtrees

Lazy children can themselves contain lazy children, enabling multi-level code splitting:

```typescript
// admin/routes.ts
export const adminRoutes = [
  route({ path: "settings", component: AdminSettings }),
  route({
    path: "advanced",
    component: AdvancedLayout,
    children: async () => {
      const { advancedRoutes } = await import("./advanced/routes");
      return advancedRoutes;
    },
  }),
];
```

Navigating to `/admin/advanced/audit` would trigger two sequential resolutions: first the admin subtree, then the advanced subtree.

#### Pathless layout with lazy children

```typescript
route({
  // Pathless layout route — always matches, adds a shared layout
  component: AuthenticatedLayout,
  children: async () => {
    const { authenticatedRoutes } = await import("./authenticated/routes");
    return authenticatedRoutes;
  },
});
```

#### With `routeState`

```typescript
routeState<AdminState>()({
  path: "admin",
  component: AdminLayout,
  children: async () => {
    const { adminRoutes } = await import("./admin/routes");
    return adminRoutes;
  },
});
```

#### Parent layout with Suspense

Parent components should wrap `<Outlet />` in a `<Suspense>` boundary to show a loading fallback while lazy children load:

```tsx
function AdminLayout() {
  return (
    <div>
      <nav>Admin Navigation</nav>
      <Suspense fallback={<div>Loading...</div>}>
        <Outlet />
      </Suspense>
    </div>
  );
}
```

During navigation, `startTransition` keeps the old page visible while lazy children resolve — the `<Suspense>` fallback is only shown on initial page load (when there is no "old page" to keep visible). See [Detailed Behavior](#detailed-behavior) for the full flow.

### What lazy children do NOT receive

The async function takes no arguments. Lazy children define static route structure (paths, components, loaders) — they don't depend on runtime values like params or request data. This keeps the mental model simple: lazy children are a code-loading mechanism, not a data-loading mechanism.

## Internal Design

### Type Changes

**`InternalRouteDefinition` (`packages/router/src/types.ts`):**

```typescript
export type InternalRouteDefinition = {
  // ... existing fields ...
  /** Child routes — either resolved or a lazy loader function */
  children?:
    | InternalRouteDefinition[]
    | (() => Promise<InternalRouteDefinition[]>);
};
```

**`RouteDefinition` and related types (`packages/router/src/route.ts`):**

All route definition types that have a `children` property need to accept the lazy form:

```typescript
type LazyRouteChildren = () => Promise<RouteDefinition[]>;

// Applied to OpaqueRouteDefinition, TypefulOpaqueRouteDefinition,
// and all internal route types (RouteWithLoader, RouteWithoutLoader, etc.)
children?: RouteDefinition[] | LazyRouteChildren;
```

### `matchRoutes` Behavior with Lazy Children

`matchRoutes` remains **synchronous**. When it encounters a route whose `children` is a function (unresolved lazy children), it handles it as follows:

1. **Prefix matching**: The route is recognized as having children (for the purpose of `isExact` determination), so it matches as a prefix — same as a route with static children.

2. **Parent-only match**: Since children can't be iterated, the route matches as if it has no children present. The parent route is included in the match result.

3. **No special return type**: `matchRoutes` still returns `MatchedRoute[] | null`. The caller doesn't need to know whether the match is "partial" (lazy children unresolved) or "full."

```typescript
function matchRoute(route, pathname, options) {
  const hasStaticChildren =
    Array.isArray(route.children) && route.children.length > 0;
  const hasLazyChildren = typeof route.children === "function";
  const hasChildren = hasStaticChildren || hasLazyChildren;

  // Lazy children affect isExact: route matches as prefix
  const isExact = route.exact ?? !hasChildren;

  // ... path matching (unchanged) ...

  if (hasStaticChildren) {
    // Existing child matching logic (unchanged)
  } else if (hasLazyChildren) {
    // Children not resolved yet — return parent match only
    return [result];
  }

  return [result];
}
```

The `hasLazyChildren` branch bypasses the `requireChildren` check. A route with lazy children conceptually _has_ children — they just haven't been loaded yet. Returning the parent match allows the parent component to render while children load.

### New: `PendingOutlet` Component

When `RouteRenderer` computes the outlet for a route whose children are an unresolved function, it produces a `<PendingOutlet>` element instead of `null`. This component **suspends** (throws a promise), integrating with React's Suspense mechanism:

```tsx
// packages/router/src/Router/PendingOutlet.tsx

/**
 * WeakMap to ensure each lazy children function is called at most once,
 * even across multiple React render attempts (Strict Mode, concurrent rendering).
 */
const lazyResolutionCache = new WeakMap<
  InternalRouteDefinition,
  Promise<void>
>();

/**
 * A component that suspends while lazy children are being resolved.
 * Rendered as the outlet when a matched route has unresolved lazy children.
 */
function PendingOutlet({
  route,
  onLazyResolved,
}: {
  route: InternalRouteDefinition;
  onLazyResolved: () => void;
}): ReactNode {
  // If children were resolved between the time this element was created
  // and when it renders (e.g., concurrent render race), render nothing.
  // The lazyVersion state update will trigger a proper re-render.
  if (typeof route.children !== "function") {
    return null;
  }

  let promise = lazyResolutionCache.get(route);
  if (!promise) {
    const lazyFn = route.children;
    promise = lazyFn().then((resolved) => {
      route.children = internalRoutes(resolved);
      onLazyResolved();
    });
    lazyResolutionCache.set(route, promise);
  }

  // Suspend: React catches this promise and shows the nearest
  // Suspense boundary's fallback until the promise resolves.
  throw promise;
}
```

#### How it integrates with `RouteRenderer`

In `RouteRenderer`, the outlet computation gains a new branch:

```typescript
// RouteRenderer.tsx — outlet computation
const outlet = useMemo(() => {
  if (index < matchedRoutes.length - 1) {
    // Existing: child route matched, render it
    return <RouteRenderer matchedRoutes={matchedRoutes} index={index + 1} />;
  }

  // NEW: if this route has unresolved lazy children, suspend
  const currentRoute = matchedRoutes[index]?.route;
  if (currentRoute && typeof currentRoute.children === "function") {
    return <PendingOutlet route={currentRoute} onLazyResolved={onLazyResolved} />;
  }

  return null;
}, [matchedRoutes, index, onLazyResolved]);
```

When the parent component renders `<Outlet />`, it renders the `outlet` from context — which is `<PendingOutlet>`. This component throws a promise, suspending the nearest `<Suspense>` boundary.

#### Why each level handles itself

Unlike a tree-walking `resolveLazyChildren` function, `PendingOutlet` resolves only one level of lazy children. Nested lazy subtrees are handled naturally:

1. First `PendingOutlet` suspends → resolves admin children → `lazyVersion++` → re-render
2. `matchRoutes` now matches deeper → finds another lazy `children` → second `PendingOutlet`
3. Second `PendingOutlet` suspends → resolves advanced children → `lazyVersion++` → re-render
4. Full match produced

Each level has its own Suspense boundary in its parent layout, so each shows an independent loading state. No tree-walking logic is needed.

### `NavigationAPIAdapter` Changes

No changes are needed to `NavigationAPIAdapter`. The existing synchronous `matchRoutes` call returns a partial match (parent only) when lazy children are present. This is sufficient to decide whether to intercept the navigation.

Lazy resolution is handled entirely by `PendingOutlet` in the React render cycle. The handler continues to work with the partial match — it runs loaders for matched routes (the parent), and the child loaders run later when `matchRoutes` re-runs after resolution.

The initial (possibly partial) `matched` result is used to decide _whether_ to intercept. A partial match (parent matched, lazy children not yet loaded) is sufficient — if the parent path matches, the URL belongs to our route tree and should be intercepted. When the initial `matched` is `null`, no route matches even as a prefix, and the navigation isn't intercepted.

### `Router` Component Changes

The Router adds a `lazyVersion` state counter and a stable callback for `PendingOutlet` to trigger re-renders after lazy resolution:

```typescript
// packages/router/src/Router/index.tsx

export function Router({ routes: inputRoutes, ... }: RouterProps): ReactNode {
  const routes = internalRoutes(inputRoutes);

  // Counter incremented when lazy children are resolved,
  // forcing matchedRoutesWithData to recompute.
  const [lazyVersion, setLazyVersion] = useState(0);
  const onLazyResolved = useCallback(() => {
    setLazyVersion((v) => v + 1);
  }, []);

  // ... existing adapter, blocker, subscription setup ...

  const matchedRoutesWithData = useMemo(() => {
    // ... existing matching + loader logic (unchanged) ...
  }, [routes, adapter, urlObject, runLoaders, locationKey, lazyVersion]);
  //                                                        ^^^^^^^^^^^

  // ... rest unchanged, but onLazyResolved must be threaded
  // to RouteRenderer (via RouterContext or props) ...
}
```

**How `onLazyResolved` reaches `PendingOutlet`:**

Add `onLazyResolved` to `RouterContextValue`:

```typescript
// RouterContext.ts
export type RouterContextValue = {
  // ... existing fields ...
  /** Callback to trigger re-render after lazy children are resolved */
  onLazyResolved: () => void;
};
```

`RouteRenderer` reads `onLazyResolved` from `RouterContext` and passes it to `PendingOutlet` when creating the outlet element.

**Why `startTransition` makes this work for navigations:**

The Router's subscription to `currententrychange` wraps updates in `startTransition` (line 158 of Router). When the user navigates to a lazy route:

1. Navigation commits → `currententrychange` fires
2. `startTransition(() => setLocationEntry(newEntry))` begins a transition
3. React starts rendering the new page (in transition)
4. `RouteRenderer` produces a `<PendingOutlet>` outlet
5. `<PendingOutlet>` throws a promise → **suspends inside the transition**
6. React keeps the old page visible (transition behavior)
7. Promise resolves → `onLazyResolved()` → `lazyVersion++`
8. React retries the transition with resolved children
9. Full match, loaders run, transition completes

The user sees: old page → new page with full content. No intermediate loading state during navigation.

## Detailed Behavior

### Navigation to a Lazy Route

```
User clicks link to /admin/settings
  1. navigate event fires
  2. handleNavigate runs synchronously:
     a. matchRoutes(routes, "/admin/settings")
        → /admin matches as prefix (lazy children detected)
        → returns [{ route: adminRoute, params: {} }]  (partial match)
     b. willIntercept = true (matched !== null)
     c. event.intercept({ handler }) called
  3. Navigation commits → currententrychange fires
  4. startTransition(() => setLocationEntry(newEntry))
     React begins rendering the new page inside a transition:
     a. useMemo: matchRoutes → partial match [adminRoute]
     b. RouteRenderer renders AdminLayout
     c. outlet = <PendingOutlet route={adminRoute} />
     d. AdminLayout renders <Suspense><Outlet /></Suspense>
     e. <Outlet /> renders <PendingOutlet>
     f. PendingOutlet throws promise → SUSPENDS
     g. React keeps old page visible (startTransition behavior)
  5. Lazy children resolve asynchronously:
     a. adminRoute.children = [settingsRoute, usersRoute, ...]
     b. onLazyResolved() → setLazyVersion(v + 1)
  6. React retries the transition render:
     a. useMemo: matchRoutes → full match [adminRoute, settingsRoute]
     b. executeLoaders runs for all matched routes
     c. RouteRenderer renders AdminLayout + Settings
  7. Transition completes → new page shown with full content
```

The user sees: old page → new page with full content. No intermediate loading state, no Suspense fallback visible. This is because `startTransition` keeps the old page visible while the transition (including Suspense) resolves.

### Initial Page Load on a Lazy Route

```
Browser loads /admin/settings directly
  1. Router component mounts
  2. useMemo: matchRoutes(routes, "/admin/settings")
     → partial match: [adminRoute match]
  3. RouteRenderer renders AdminLayout:
     a. outlet = <PendingOutlet route={adminRoute} />
     b. AdminLayout renders <Suspense fallback={<Loading/>}><Outlet /></Suspense>
     c. <Outlet /> renders <PendingOutlet>
     d. PendingOutlet throws promise → SUSPENDS
     e. Suspense boundary shows <Loading />
  4. User sees AdminLayout with loading fallback in outlet area
  5. Lazy children resolve:
     a. adminRoute.children = [settingsRoute, usersRoute, ...]
     b. onLazyResolved() → setLazyVersion(1)
  6. useMemo re-runs: matchRoutes(routes, "/admin/settings")
     → full match: [adminRoute match, settingsRoute match]
  7. executeLoaders runs settings loader
  8. RouteRenderer renders AdminLayout + Settings content
```

On initial load, there is no "old page" to keep visible, so the Suspense fallback is shown. The parent layout (`AdminLayout`) renders immediately — only the `<Outlet />` area shows the fallback. This provides a natural loading shell.

If `<Outlet />` is not wrapped in `<Suspense>`, the suspension propagates up to the nearest ancestor Suspense boundary. If none exists, React throws an error in development. Users should always wrap `<Outlet />` in `<Suspense>` when using lazy children — the same pattern as `React.lazy`.

### Resolution Caching

Lazy children are resolved **once** and installed in-place. The async function reference is replaced with the resolved array directly on the route definition object:

```typescript
// Before resolution:
route.children = async () => { ... }; // function

// After resolution:
route.children = [settingsRoute, usersRoute, ...]; // array
```

This means:

- Subsequent `matchRoutes` calls see the array and work synchronously
- No separate cache data structure is needed
- The route tree is indistinguishable from a fully-static one after all lazy subtrees are resolved
- Resolution survives across navigations (the route definitions are long-lived objects)

**Trade-off:** This mutates the route definition objects. Since `route()` returns the input object as-is (just a type assertion), the mutation affects the original object passed by the user. This is intentional — the mutation is an optimization that replaces a one-shot factory with its result.

## Edge Cases

### Lazy resolution failure

If the async function throws (e.g., network error loading the module), the thrown promise rejects. React treats a rejected promise thrown during render as an error, which propagates to the nearest **error boundary**.

This integrates naturally with React's error handling:

```tsx
function AdminLayout() {
  return (
    <div>
      <nav>Admin Navigation</nav>
      <ErrorBoundary fallback={<div>Failed to load section</div>}>
        <Suspense fallback={<div>Loading...</div>}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

Users who want retry behavior can wrap their lazy function:

```typescript
children: async () => {
  try {
    return (await import("./admin/routes")).adminRoutes;
  } catch (e) {
    // Retry, show error UI, etc.
    return [route({ path: "*", component: LoadError })];
  }
},
```

### Navigation to a path with unresolved lazy children that don't match

```
Route: /admin (lazy children: [/settings, /users])
Navigate to: /admin/nonexistent
```

1. Initial `matchRoutes` returns `[adminRoute]` (partial match — lazy children not resolved)
2. Navigation is intercepted (parent matched)
3. Navigation commits → React renders in transition
4. `PendingOutlet` suspends → lazy children resolve
5. `lazyVersion++` → `matchRoutes` re-runs with resolved children
6. `/admin` matches, but no child matches `/nonexistent`
7. If `requireChildren` is true (default): re-match returns `null`
8. Nothing renders

With static children, the initial `matchRoutes` would return `null` and the navigation wouldn't be intercepted at all. With lazy children, we over-intercept because we can't know upfront whether children will match.

**Mitigation:** Users should define catch-all routes for 404 handling, which is a best practice regardless. Alternatively, `requireChildren: false` on the parent ensures the parent layout renders even when no child matches.

### Form submission to a lazy route

For POST form submissions, the router checks if any matched route has an action before intercepting:

```typescript
if (isFormSubmission && matched !== null) {
  const hasAction = matched.some((m) => m.route.action);
  if (!hasAction) return; // Don't intercept
}
```

With lazy children, the initial partial match only includes the parent. If the action is defined in a lazy child, `hasAction` is false and the form isn't intercepted.

In practice, this is not a problem: for a user to submit a form on `/admin/settings`, they must have already navigated to that page, which means the lazy children are already resolved. The action route is in the resolved match.

### Concurrent navigations during resolution

If the user navigates away while lazy children are loading:

- The in-flight lazy resolution continues in the background. When it resolves, it installs children into the route tree and calls `onLazyResolved()`. This is harmless — the installed children are correct and will be available for future navigations.
- The new navigation triggers a fresh `startTransition`, which supersedes the old one. React discards the old transition's render tree.
- If the new navigation path also requires lazy resolution, a new `PendingOutlet` handles it independently.

### Pathless routes with lazy children

Pathless routes always match and don't consume any pathname. A pathless route with lazy children works the same way — `matchRoutes` returns the pathless parent match, `RouteRenderer` produces a `<PendingOutlet>`, and Suspense handles the async resolution.

### SSR

During SSR, `PendingOutlet` throws a promise (suspends). React's SSR Suspense support handles this:

- With streaming SSR (`renderToPipeableStream`): the Suspense fallback is sent initially, and the resolved content is streamed later when the promise resolves.
- With non-streaming SSR (`renderToString`): Suspense fallbacks are rendered as the final output. Lazy children don't resolve during SSR.

In both cases, the parent route renders as a shell with the Suspense fallback in the outlet area. After hydration on the client, `PendingOutlet` suspends again (or resolves immediately if children were streamed), and the full route tree renders.

For SSR-critical routes, users should define children statically. Lazy children are best suited for routes that don't need server rendering (admin panels, settings pages, etc.).

### Route definitions prop change

If the `routes` prop passed to `<Router>` changes (new array/new objects), previously resolved lazy children live on the old objects. The new route definitions may have fresh lazy functions that need resolution. This works correctly because both `matchRoutes` and `PendingOutlet` check `typeof route.children === 'function'` — fresh functions trigger resolution, while already-resolved arrays are matched synchronously.

## Interaction with Existing Features

### Loaders and Actions

Loaders and actions work unchanged. After lazy resolution + re-match, the full matched route stack is available. Loaders execute against the full match, including routes from resolved lazy children.

### `onNavigate` callback

`onNavigate` receives `matches` from the initial synchronous `matchRoutes` call, which may be a partial match when lazy children are involved. This is a known limitation — the callback doesn't have access to the full match until lazy children are resolved.

If this becomes a problem, a future enhancement could add a second callback (e.g., `onNavigateResolved`) that fires after lazy resolution with the full match. For the initial implementation, the partial match is sufficient for most use cases (global guards typically check the parent path, not specific children).

### `useBlocker`

Blockers run before `event.intercept()`, so they execute before any lazy resolution. This is correct — blockers are a "are you sure?" mechanism that should work regardless of whether children are loaded.

### `isPending` / `useTransition`

On navigation to a lazy route, `isPending` becomes `true` when the navigation commits (same as today). The `PendingOutlet` suspends inside the transition started by `startTransition`, which keeps `isPending` true until lazy children resolve and the full render completes. From the user's perspective, `isPending` covers both lazy loading and data loading — a single seamless transition.

On initial page load, `isPending` is `false` throughout. The parent layout renders immediately with the Suspense fallback visible in the outlet area. There's no transition because there's no "old page" to transition from.

### `React.lazy` components

Lazy route definitions and `React.lazy` components are orthogonal and composable. A lazy child route can have a `React.lazy` component:

```typescript
// admin/routes.ts
const AdminSettings = React.lazy(() => import("./AdminSettings"));

export const adminRoutes = [
  route({ path: "settings", component: AdminSettings }),
];
```

The route definition (path, structure) loads when the lazy children resolve. The component code loads when React renders it (handled by Suspense). Users get two levels of code splitting if desired.

## Alternatives Considered

### A: `lazyChildren` as a separate property

```typescript
route({
  path: "admin",
  component: AdminLayout,
  lazyChildren: () => import("./admin/routes").then((m) => m.adminRoutes),
});
```

**Pros:** No ambiguity in the `children` type — it's always an array.
**Cons:** Two properties for the same concept. Users might set both `children` and `lazyChildren`, creating confusion. Adds more overloads to `route()` and `routeState()`.

**Verdict:** Overloading `children` is simpler and more intuitive. The type union `RouteDefinition[] | (() => Promise<RouteDefinition[]>)` is clear.

### B: `lazy()` wrapper helper

```typescript
import { lazy } from "@funstack/router";

route({
  path: "admin",
  component: AdminLayout,
  children: lazy(() => import("./admin/routes").then((m) => m.adminRoutes)),
});
```

Where `lazy()` returns a branded object that the router recognizes.

**Pros:** Could carry metadata (retry config, loading indicators). More explicit intent.
**Cons:** Extra API surface. The function-vs-array check is sufficient to distinguish lazy from static. Metadata can be added later if needed.

**Verdict:** Not needed for the initial implementation. Can be added later as a non-breaking enhancement.

### C: Async `matchRoutes`

Make `matchRoutes` itself async, handling lazy resolution internally:

```typescript
async function matchRoutes(
  routes: InternalRouteDefinition[],
  pathname: string,
): Promise<MatchedRoute[] | null>;
```

**Pros:** Single function for matching + resolution. No separate `resolveLazyChildren`.
**Cons:** Every call site needs to handle a promise. The Router's `useMemo` can't call an async function. The NavigationAPIAdapter already has an async context, but the Router component doesn't.

**Verdict:** Keeping `matchRoutes` synchronous and using a separate async resolution step is cleaner. The sync/async boundary is explicit.

### D: `useEffect` + tree-walking resolution (no Suspense)

Instead of suspending `<Outlet />`, resolve lazy children via a `useEffect` in the Router and a separate `resolveLazyChildren` function that walks the route tree along the matching path:

```typescript
useEffect(() => {
  resolveLazyChildren(routes, urlObject.pathname).then((didResolve) => {
    if (didResolve) setLazyVersion((v) => v + 1);
  });
}, [routes, urlObject]);
```

**Pros:** No Suspense requirement. The parent renders with `outlet = null`, which is simpler.
**Cons:** Requires a separate `resolveLazyChildren` function that duplicates matching logic. The parent renders with empty outlet first, causing a flash of incomplete UI. Users have no standard way to show a loading state in the outlet area — they'd need to check if `outlet` is null and show their own fallback. The `useEffect` approach also has a timing gap: the effect fires after commit, so the first render always shows the empty outlet.

**Verdict:** The Suspense approach is more idiomatic React. It reuses React's built-in loading state mechanism (`<Suspense fallback>`), avoids duplicating matching logic, and integrates naturally with `startTransition` for seamless navigation transitions.

## Implementation Plan

### Step 1: Update type definitions

**File:** `packages/router/src/types.ts`

- Update `InternalRouteDefinition.children` to accept `(() => Promise<InternalRouteDefinition[]>)`

**File:** `packages/router/src/route.ts`

- Define `LazyRouteChildren = () => Promise<RouteDefinition[]>`
- Update `children` in `OpaqueRouteDefinition`, `RouteDefinition`, and all internal route types (`RouteWithLoader`, `RouteWithoutLoader`, etc.) to accept `LazyRouteChildren`
- Note: `PartialRouteDefinition` types don't have `children` (they have `children?: never`), so no changes needed there

### Step 2: Update `matchRoutes` to handle lazy children

**File:** `packages/router/src/core/matchRoutes.ts`

- Detect `typeof route.children === 'function'` for `hasChildren` / `isExact` determination
- When children is a function, return parent-only match (bypass child matching and `requireChildren` check)

### Step 3: Add `onLazyResolved` to `RouterContext`

**File:** `packages/router/src/context/RouterContext.ts`

- Add `onLazyResolved: () => void` to `RouterContextValue`

### Step 4: Implement `PendingOutlet`

**File:** `packages/router/src/Router/PendingOutlet.tsx` (new file)

- Component that throws a promise (suspends) while lazy children are being resolved
- Uses a `WeakMap` keyed by route definition to cache resolution promises
- On resolution: mutates `route.children` in-place, calls `onLazyResolved()`

### Step 5: Update `RouteRenderer`

**File:** `packages/router/src/Router/RouteRenderer.tsx`

- Read `onLazyResolved` from `RouterContext`
- When computing outlet: if current route has `typeof children === 'function'`, produce `<PendingOutlet>` instead of `null`

### Step 6: Update `Router` component

**File:** `packages/router/src/Router/index.tsx`

- Add `lazyVersion` state counter
- Add stable `onLazyResolved` callback via `useCallback`
- Include `onLazyResolved` in `RouterContextValue`
- Add `lazyVersion` to the `useMemo` dependency array for `matchedRoutesWithData`

### Step 7: Add tests

**File:** `packages/router/src/__tests__/lazy.test.tsx` (new file)

Test cases:

1. **Lazy children resolve on navigation**: Navigate to `/admin/settings` where `/admin` has lazy children containing `/settings`. Verify the settings route renders after resolution (old page stays visible during transition).
2. **Lazy children resolve on initial load**: Mount Router with URL at `/admin/settings`. Verify Suspense fallback is shown, then child appears after resolution.
3. **Resolution is cached**: Navigate to `/admin/settings`, navigate away, navigate back. Verify the lazy function is called only once.
4. **Nested lazy children**: `/admin` has lazy children, one of which has its own lazy children. Verify multi-level resolution works (two sequential Suspense resolutions).
5. **Pathless route with lazy children**: Pathless layout wraps lazy children. Verify resolution and rendering.
6. **Lazy resolution failure**: Async function rejects. Verify error propagates to error boundary.
7. **Navigation during resolution**: Navigate to `/admin/settings`, then quickly navigate to `/home`. Verify `/home` renders correctly.
8. **Lazy children with loaders**: Lazy child has a loader. Verify loader runs after resolution.
9. **No over-interception for non-matching siblings**: Static route `/about` is not affected by a sibling lazy route `/admin`.
10. **`matchRoutes` prefix matching with lazy children**: Verify parent matches as prefix even though children aren't loaded.
11. **Suspense fallback shown on initial load**: Verify that the `<Suspense>` boundary around `<Outlet />` shows its fallback during lazy resolution on initial load.
12. **No Suspense fallback during navigation**: Verify that during navigation, the old page stays visible (transition behavior) and no Suspense fallback is shown.

### Step 8: Export types

**File:** `packages/router/src/index.ts`

- Export `LazyRouteChildren` type (if users need it for type annotations)

## Summary of Files to Change

| File                                           | Change                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `packages/router/src/types.ts`                 | Update `InternalRouteDefinition.children` type                                |
| `packages/router/src/route.ts`                 | Add `LazyRouteChildren` type; update `children` on all route definition types |
| `packages/router/src/core/matchRoutes.ts`      | Handle lazy children in matching logic                                        |
| `packages/router/src/context/RouterContext.ts` | Add `onLazyResolved` to `RouterContextValue`                                  |
| `packages/router/src/Router/PendingOutlet.tsx` | New file: component that suspends during lazy resolution                      |
| `packages/router/src/Router/RouteRenderer.tsx` | Produce `<PendingOutlet>` outlet for routes with lazy children                |
| `packages/router/src/Router/index.tsx`         | Add `lazyVersion` state + `onLazyResolved` callback                           |
| `packages/router/src/index.ts`                 | Export `LazyRouteChildren` type                                               |
| `packages/router/src/__tests__/lazy.test.tsx`  | New file: test cases for lazy route definitions                               |
