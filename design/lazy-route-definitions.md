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

## Review Summary

The overall direction is good: keep `matchRoutes` synchronous, let a parent route match as a prefix while its children are loading, and use Suspense for the outlet area instead of inventing a custom loading protocol.

The main design change I would make is to move the caching contract out of user-land examples and into the router's public API. A router-provided helper such as `lazyRouteChildren()` (name bikeshedable; it is clearer than a bare `lazy()` because React already has `React.lazy`) should be the primary documented API. Raw functions can still be supported internally, but the public design should not rely on every user discovering and correctly implementing a subtle caching requirement.

The document should also explicitly call out three technology constraints:

1. **Navigation API:** `event.intercept()` itself must be decided synchronously during the `navigate` event. Returning a partial parent match is therefore the right mechanism; the router cannot wait for async child discovery before deciding whether to intercept.
2. **React transitions and Suspense:** during router-driven navigations, the existing screen is usually kept visible because the router already updates location state inside `startTransition`. The fallback is mainly an initial-load / hydration shell, not the primary navigation UX.
3. **Stable async resource identity:** the "same promise" requirement is not a magical rule specific to `use()`; it is a consequence of React retrying suspended renders. If the route function creates a fresh promise every time, the work never converges.

## Proposed API

Allow `children` to accept either static route definitions or a lazy child resolver:

```typescript
import { lazyRouteChildren, route } from "@funstack/router";

route({
  path: "admin",
  component: AdminLayout,
  children: lazyRouteChildren(() =>
    import("./admin/routes").then((module) => module.adminRoutes),
  ),
});
```

The underlying lazy contract can still be expressed as `() => RouteDefinition[] | Promise<RouteDefinition[]>`, so the router remains flexible. However, the documented "golden path" should use a router helper that caches the in-flight promise and the resolved route array.

The function is called when the router first needs the children (either on navigation to a matching path or on initial page load). If it returns a promise, the parent's `<Outlet />` suspends until the promise resolves. If it returns an array synchronously, matching continues immediately with no suspension.

### Caching contract

The lazy children function **may be called multiple times**. For correctness, repeated calls must behave like a stable async resource:

1. While loading, repeat calls must return the **same promise** rather than starting a fresh load.
2. After the promise resolves, repeat calls should return the **resolved array synchronously**.

This matters because the Router component can be re-rendered or even discarded and retried by React before the suspended tree commits. If the route function creates a fresh promise on every call, React keeps retrying unfinished work. If it returns the previously created promise while loading — and the resolved array after loading — the system converges correctly.

That is why this design should provide an official helper instead of only documenting a user-land pattern:

```typescript
// packages/router/src/lazyRouteChildren.ts (proposed)
export function lazyRouteChildren<T>(
  load: () => Promise<T>,
): () => T | Promise<T> {
  let value: T | undefined;
  let promise: Promise<T> | undefined;

  return () => {
    if (value !== undefined) {
      return value;
    }
    if (!promise) {
      promise = load().then((result) => {
        value = result;
        return result;
      });
    }
    return promise;
  };
}
```

Raw `async () => { ... }` functions may appear to work in the happy path, but they do not satisfy this contract because they allocate a new promise on each call. The router can continue to accept them structurally, but the documentation should describe them as a low-level escape hatch, not the recommended production pattern.

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
    children: lazyRouteChildren(() =>
      import("./admin/routes").then((module) => module.adminRoutes),
    ),
  }),
  route({
    path: "dashboard",
    component: DashboardLayout,
    children: lazyRouteChildren(() =>
      import("./dashboard/routes").then((module) => module.dashboardRoutes),
    ),
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
    children: lazyRouteChildren(() =>
      import("./advanced/routes").then((module) => module.advancedRoutes),
    ),
  }),
];
```

Navigating to `/admin/advanced/audit` would trigger two sequential resolutions: first the admin subtree, then the advanced subtree.

#### Pathless layout with lazy children

```typescript
route({
  // Pathless layout route — always matches, adds a shared layout
  component: AuthenticatedLayout,
  children: lazyRouteChildren(() =>
    import("./authenticated/routes").then(
      (module) => module.authenticatedRoutes,
    ),
  ),
});
```

#### With `routeState`

```typescript
routeState<AdminState>()({
  path: "admin",
  component: AdminLayout,
  children: lazyRouteChildren(() =>
    import("./admin/routes").then((module) => module.adminRoutes),
  ),
});
```

#### Parent layout with Suspense

Parent components should wrap `<Outlet />` in a `<Suspense>` boundary so the outlet area has an explicit loading shell when lazy children suspend:

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

During router-driven navigation, the router already updates location state inside `startTransition`, so React usually keeps the old page visible while the lazy children resolve. In practice that means the `<Suspense>` fallback is mainly an initial-load or hydration shell. It can still appear if there is no previously committed UI to preserve, or if the user places additional Suspense boundaries above the router. See [Detailed Behavior](#detailed-behavior) for the full flow.

### What lazy children do NOT receive

The function takes no arguments. Lazy children define static route structure (paths, components, loaders) — they don't depend on runtime values like params or request data. This keeps the mental model simple: lazy children are a code-loading mechanism, not a data-loading mechanism.

## Internal Design

### Type Changes

**`InternalRouteDefinition` (`packages/router/src/types.ts`):**

```typescript
export type InternalRouteDefinition = {
  // ... existing fields ...
  /** Child routes — either resolved, or a lazy loader function (sync or async) */
  children?:
    | InternalRouteDefinition[]
    | (() => InternalRouteDefinition[] | Promise<InternalRouteDefinition[]>);
};
```

**`RouteDefinition` and related types (`packages/router/src/route.ts`):**

All route definition types that have a `children` property need to accept the lazy form:

```typescript
type LazyRouteChildren = () => RouteDefinition[] | Promise<RouteDefinition[]>;

// Export a helper whose return type satisfies LazyRouteChildren.
export function lazyRouteChildren(
  load: () => Promise<RouteDefinition[]>,
): LazyRouteChildren;

// Applied to OpaqueRouteDefinition, TypefulOpaqueRouteDefinition,
// and all internal route types (RouteWithLoader, RouteWithoutLoader, etc.)
children?: RouteDefinition[] | LazyRouteChildren;
```

### `matchRoutes` Behavior with Lazy Children

`matchRoutes` remains **synchronous**. When it encounters a route whose `children` is a function, it **calls the function** to determine how to proceed:

1. **Sync result** (function returns an array): The children are resolved. `matchRoutes` uses the returned array for child matching within that call — exactly as if they had been static children.

2. **Async result** (function returns a promise): The children can't be resolved synchronously. The route matches as a prefix (same as having children), but only the parent is included in the match result.

3. **No special return type**: `matchRoutes` still returns `MatchedRoute[] | null`. The caller doesn't need to know whether the match is "partial" (async children pending) or "full."

```typescript
function matchRoute(route, pathname, options) {
  const isLazyChildren = typeof route.children === "function";

  // Call the lazy function to resolve children (sync or async)
  let resolvedChildren: InternalRouteDefinition[] | undefined;
  if (isLazyChildren) {
    const result = route.children();
    if (Array.isArray(result)) {
      // Sync resolution — use returned array for matching
      resolvedChildren = internalRoutes(result);
    }
    // If result is a Promise, resolvedChildren stays undefined
  }

  const staticChildren = Array.isArray(route.children)
    ? route.children
    : undefined;
  const children = resolvedChildren ?? staticChildren;
  const hasChildren =
    (children !== undefined && children.length > 0) ||
    (isLazyChildren && resolvedChildren === undefined);

  // Lazy children affect isExact: route matches as prefix
  const isExact = route.exact ?? !hasChildren;

  // ... path matching (unchanged) ...

  if (children !== undefined && children.length > 0) {
    // Match against children (resolved lazy or static — same logic)
  } else if (isLazyChildren && resolvedChildren === undefined) {
    // Async children — return parent match only
    return [result];
  }

  return [result];
}
```

**No mutation of route objects:** `matchRoutes` does not modify `route.children`. The returned array is used as a local variable for matching within that call. The function stays on the route object and is called again on subsequent `matchRoutes` invocations. Since the user's function caches its result, repeated calls are cheap (just return the cached value).

**Why `matchRoutes` calls the function:** This handles the case where the function returns a cached result synchronously (e.g., after a previous async resolution). If the function returns sync, matching continues without any Suspense or re-render — the route tree is fully resolved in a single pass. This is critical for resilience: if Router's state was lost (see [Router suspension edge case](#router-suspension)), the function returns sync on retry and `matchRoutes` resolves it immediately.

**Side effect in `matchRoutes`:** Calling the lazy function is technically a side effect (it may trigger a dynamic import on the first call). This is acceptable because: (1) it's idempotent — the user's caching ensures repeated calls return the same result, (2) it mirrors how `React.lazy` triggers loading on first render, and (3) in React strict mode, `useMemo` may run twice, but both calls get the same cached result.

The `hasUnresolvedLazy` branch bypasses the `requireChildren` check. A route with lazy children conceptually _has_ children — they just haven't been loaded yet. Returning the parent match allows the parent component to render while children load.

### New: `PendingOutlet` Component

When `RouteRenderer` computes the outlet for a route whose children are an unresolved function, it produces a `<PendingOutlet>` element instead of `null`. This component **suspends** using React 19's `use()` API, integrating with Suspense:

```tsx
// packages/router/src/Router/PendingOutlet.tsx

/**
 * A component that suspends while lazy children are being resolved.
 * Rendered as the outlet when a matched route has unresolved lazy children.
 *
 * This component is intentionally thin — it only calls use() to suspend.
 * Promise creation and caching happen in the Router component (see below).
 */
function PendingOutlet({ promise }: { promise: Promise<void> }): ReactNode {
  use(promise);
  return null;
}
```

`PendingOutlet` itself is a thin wrapper. The Router component is responsible for calling the lazy function, getting the Promise, and registering it in its state cache (see [Router Component Changes](#router-component-changes) below). `PendingOutlet` only exists to call `use()` inside the Suspense boundary.

**Why PendingOutlet doesn't call the function or hold state:** A component that suspends before it ever commits does not retain `useState` data — React discards the in-progress fiber and re-creates it when the promise resolves. If `PendingOutlet` called the lazy function or created the promise in its own state, it would be repeated on each retry. Instead, Router creates the promise and passes it down. If Router's own state is also lost (see [Router suspension edge case](#router-suspension)), `matchRoutes` handles it by calling the function on re-render — the user's cache returns sync, so no `PendingOutlet` is needed at all.

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
    const promise = lazyCache.get(currentRoute);
    // promise is guaranteed to exist — Router creates it before rendering
    // (see Router Component Changes: "Lazy children resolution" section)
    return <PendingOutlet promise={promise!} />;
  }

  return null;
}, [matchedRoutes, index, lazyCache]);
```

When the parent component renders `<Outlet />`, it renders the `outlet` from context — which is `<PendingOutlet>`. The `use()` call inside suspends the nearest `<Suspense>` boundary.

#### Nested lazy subtrees

`PendingOutlet` resolves only one level of lazy children at a time. When lazy subtrees are nested (e.g., `/admin` has lazy children, one of which also has lazy children), each level resolves independently:

1. First `PendingOutlet` suspends → resolves admin children → cache update → re-render
2. `matchRoutes` now matches deeper → finds another lazy `children` → second `PendingOutlet`
3. Second `PendingOutlet` suspends → resolves advanced children → cache update → re-render
4. Full match produced

Each level has its own Suspense boundary in its parent layout, so each shows an independent loading state.

### `NavigationAPIAdapter` Changes

No changes are needed to `NavigationAPIAdapter`. `matchRoutes` now calls the lazy function internally — on first call it typically returns a Promise (async), resulting in a partial match. This is sufficient to decide whether to intercept the navigation.

The handler continues to work with the partial match — it runs loaders for matched routes (the parent), and the child loaders run later when `matchRoutes` re-runs after resolution.

The initial (possibly partial) `matched` result is used to decide _whether_ to intercept. A partial match (parent matched, async lazy children pending) is sufficient — if the parent path matches, the URL belongs to our route tree and should be intercepted. When the initial `matched` is `null`, no route matches even as a prefix, and the navigation isn't intercepted.

**Technology clarification:** `matchRoutes` can call the lazy function inside `NavigationAPIAdapter`'s synchronous `handleNavigate`, but the important synchronous step is the `event.intercept(...)` decision itself. The router is not "awaiting lazy children inside the Navigation API"; it is using a partial parent match to decide interception synchronously, then letting React rendering deal with the async subtree resolution later.

### `Router` Component Changes

The Router holds a lazy resolution cache in state. When `matchRoutes` returns a partial match (async lazy children), Router calls the function to get the Promise, registers it in the cache, and attaches a `.then()` handler to trigger a re-render on resolution.

The cache is a `Map` from route definitions to their resolution promises. Its identity change (new `Map` reference) is included in the `matchedRoutesWithData` dependency array, driving recomputation after resolution:

```typescript
// packages/router/src/Router/index.tsx

export function Router({ routes: inputRoutes, ... }: RouterProps): ReactNode {
  const routes = internalRoutes(inputRoutes);

  // Cache of in-flight lazy resolution promises.
  // Identity change (new Map reference) triggers matchedRoutesWithData recomputation.
  const [lazyCache, setLazyCache] = useState(
    () => new Map<InternalRouteDefinition, Promise<void>>(),
  );

  // Clear cache when routes prop changes (new route definitions)
  const [prevRoutes, setPrevRoutes] = useState(routes);
  if (prevRoutes !== routes) {
    setPrevRoutes(routes);
    setLazyCache(new Map());
  }

  // ... existing adapter, blocker, subscription setup ...

  const matchedRoutesWithData = useMemo(() => {
    // matchRoutes now calls lazy functions internally —
    // sync results are used directly, async results cause partial match.
    // (existing matching + loader logic otherwise unchanged)
  }, [routes, adapter, urlObject, runLoaders, locationKey, lazyCache]);
  //                                                        ^^^^^^^^^

  // --- Lazy children resolution (async case) ---
  // If matchRoutes returned a partial match (lazy function returned a Promise),
  // the deepest matched route still has typeof children === 'function'.
  // Call the function to get the Promise (same one matchRoutes got — user caches it),
  // register it in lazyCache, and attach a .then() handler.
  // This is setState-during-render on Router's OWN state, so React correctly
  // discards the current render and re-renders with the updated cache.
  if (matchedRoutesWithData) {
    const lastMatch =
      matchedRoutesWithData[matchedRoutesWithData.length - 1];
    if (
      lastMatch &&
      typeof lastMatch.route.children === "function" &&
      !lazyCache.has(lastMatch.route)
    ) {
      const route = lastMatch.route;
      const lazyFn = route.children as () => Promise<
        InternalRouteDefinition[]
      >;
      // Call the function — user's cache returns the same Promise that
      // matchRoutes received, so no duplicate loading is triggered.
      const promise = lazyFn();
      const voidPromise = promise.then(() => {
        // Trigger Router re-render for the INITIAL PAGE LOAD case.
        // During navigation, startTransition already retries the entire
        // transition (including Router) when the promise resolves, so
        // this is redundant. But on initial page load there is no
        // transition — only the Suspense subtree retries. Router is above
        // the Suspense boundary and won't re-render on its own. Without
        // this, PendingOutlet would return null (promise resolved) and the
        // outlet would be empty. This state update triggers Router to
        // re-run matchRoutes, which calls the function → sync → full match.
        setLazyCache((prev) => new Map(prev));
      });
      // Register promise in cache. setState-during-render on own state:
      // React discards this render and immediately re-renders with the
      // updated cache. On re-render, the promise is found, RouteRenderer
      // passes it to PendingOutlet, and use() suspends.
      setLazyCache((prev) => new Map([...prev, [route, voidPromise]]));
    }
  }

  // ... include lazyCache in RouterContextValue
  // so RouteRenderer can read it and pass the promise to PendingOutlet ...
}
```

**Note:** Router calls the lazy function a second time (after `matchRoutes` already called it). This is safe because the user's caching ensures the same Promise object is returned — no duplicate import is triggered.

**Why the `.then()` handler is needed:** During navigation, `startTransition` retries the entire transition when the promise resolves, including Router — so `matchRoutes` re-runs automatically. But on initial page load, there is no transition. When the promise resolves, React only retries the subtree inside the `<Suspense>` boundary (which is inside the parent layout). Router is above that boundary and doesn't re-render. `PendingOutlet` would return `null` (promise resolved, `use()` no longer suspends), leaving an empty outlet. The `.then()` handler calls `setLazyCache` to trigger Router re-render, which re-runs `matchRoutes` → function returns sync → full match.

**How the promise reaches `PendingOutlet`:**

Add `lazyCache` to `RouterContextValue`:

```typescript
// RouterContext.ts
export type RouterContextValue = {
  // ... existing fields ...
  /** Cache of lazy resolution promises — identity changes trigger re-match */
  lazyCache: Map<InternalRouteDefinition, Promise<void>>;
};
```

`lazyCache` changes only when lazy children are first encountered (setState-during-render) or when a promise resolves (async state update), both of which are infrequent.

`RouteRenderer` reads `lazyCache` from `RouterContext`, looks up the promise for the current route, and passes it to `PendingOutlet` as a prop.

**Why `startTransition` makes this work for navigations:**

The Router's subscription to `currententrychange` wraps updates in `startTransition` (line 158 of Router). When the user navigates to a lazy route:

1. Navigation commits → `currententrychange` fires
2. `startTransition(() => setLocationEntry(newEntry))` begins a transition
3. React starts rendering the new page (in transition)
4. `matchRoutes` calls lazy function → Promise → partial match
5. Router detects async lazy children, calls function (same Promise), registers in `lazyCache` (setState-during-render) → React re-renders
6. On re-render: promise is in cache, `RouteRenderer` produces `<PendingOutlet promise={...}>`
7. `<PendingOutlet>` calls `use(promise)` → **suspends inside the transition**
8. React keeps the old page visible (transition behavior)
9. Promise resolves → `.then()` calls `setLazyCache` (async state update)
10. React retries the transition
11. `matchRoutes` calls function → sync (user cached) → full match, loaders run
12. Transition completes

The user sees: old page → new page with full content. No intermediate loading state during navigation.

## Detailed Behavior

### Navigation to a Lazy Route

```
User clicks link to /admin/settings
  1. navigate event fires
  2. handleNavigate runs synchronously:
     a. matchRoutes(routes, "/admin/settings")
        → calls lazy function → Promise (first call)
        → /admin matches as prefix (async children)
        → returns [{ route: adminRoute, params: {} }]  (partial match)
     b. willIntercept = true (matched !== null)
     c. event.intercept({ handler }) called
  3. Navigation commits → currententrychange fires
  4. startTransition(() => setLocationEntry(newEntry))
     React begins rendering the new page inside a transition:
     a. useMemo: matchRoutes calls lazy function → same Promise (user cached)
        → partial match [adminRoute]
     b. Router detects adminRoute has async lazy children, not in cache
     c. Router calls function → same Promise, registers in lazyCache,
        calls setLazyCache (setState-during-render)
        → React discards render, re-renders with updated cache
     d. Re-render: promise found in cache, RouteRenderer renders AdminLayout
     e. outlet = <PendingOutlet promise={lazyCache.get(adminRoute)} />
     f. AdminLayout renders <Suspense><Outlet /></Suspense>
     g. <Outlet /> renders <PendingOutlet>
     h. PendingOutlet calls use(promise) → SUSPENDS
     i. React keeps old page visible (startTransition behavior)
  5. Lazy children resolve asynchronously:
     a. .then() calls setLazyCache(new Map(...)) → new cache reference (async state update)
  6. React retries the transition render:
     a. useMemo (lazyCache changed): matchRoutes calls function → sync (user cached)
        → full match [adminRoute, settingsRoute]
     b. executeLoaders runs for all matched routes
     c. RouteRenderer renders AdminLayout + Settings
  7. Transition completes → new page shown with full content
```

The user sees: old page → new page with full content. No intermediate loading state, no Suspense fallback visible. This is because `startTransition` keeps the old page visible while the transition (including Suspense) resolves.

### Initial Page Load on a Lazy Route

```
Browser loads /admin/settings directly
  1. Router component mounts
  2. useMemo: matchRoutes calls lazy function → Promise (first call)
     → partial match: [adminRoute match]
  3. Router detects adminRoute has async lazy children, not in cache
     a. Calls function → same Promise, registers in lazyCache
     b. Calls setLazyCache (setState-during-render)
     c. React discards render, re-renders with updated cache
  4. Re-render: promise in cache, RouteRenderer renders AdminLayout:
     a. outlet = <PendingOutlet promise={lazyCache.get(adminRoute)} />
     b. AdminLayout renders <Suspense fallback={<Loading/>}><Outlet /></Suspense>
     c. <Outlet /> renders <PendingOutlet>
     d. PendingOutlet calls use(promise) → SUSPENDS
     e. Suspense boundary shows <Loading />
  5. User sees AdminLayout with loading fallback in outlet area
  6. Lazy children resolve:
     a. .then() calls setLazyCache(new Map(...)) → new cache reference (async state update)
  7. useMemo re-runs (lazyCache changed): matchRoutes calls function → sync (user cached)
     → full match: [adminRoute match, settingsRoute match]
  8. executeLoaders runs settings loader
  9. RouteRenderer renders AdminLayout + Settings content
```

On initial load, there is no "old page" to keep visible, so the Suspense fallback is shown. The parent layout (`AdminLayout`) renders immediately — only the `<Outlet />` area shows the fallback. This provides a natural loading shell.

If `<Outlet />` is not wrapped in `<Suspense>`, the suspension propagates up to the nearest ancestor Suspense boundary. If none exists, React throws an error in development. Users should always wrap `<Outlet />` in `<Suspense>` when using lazy children — the same pattern as `React.lazy`.

### Resolution Caching

Route objects are **never mutated**. `route.children` stays as the user-provided function for the lifetime of the route definition. Caching is handled entirely by the user's function and Router's state:

1. **User-level caching** (required): The lazy function itself caches its result. On first call it returns a Promise; on subsequent calls it returns the resolved array synchronously. This is the user's responsibility (see [Caching contract](#caching-contract)). This is the **primary** caching mechanism and the one that ensures resilience when React state is lost.

2. **Router's `lazyCache` state**: Stores in-flight promises so `PendingOutlet` can suspend via `use()`. Its identity change (new `Map` reference) triggers `matchedRoutesWithData` recomputation after a promise resolves.

After resolution, subsequent `matchRoutes` calls invoke the function again — but the user's cache returns the resolved array synchronously, so matching completes in a single pass with no suspension. The function call is cheap (a cache lookup) and keeps the route objects immutable.

## Edge Cases

### Lazy resolution failure

If the async function throws (e.g., network error loading the module), the promise rejects. React's `use()` treats a rejected promise as an error, which propagates to the nearest **error boundary**.

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

1. `matchRoutes` calls lazy function → Promise → partial match `[adminRoute]`
2. Navigation is intercepted (parent matched)
3. Navigation commits → React renders in transition
4. Router registers promise in lazyCache (setState-during-render) → re-render → `PendingOutlet` suspends
5. Lazy children resolve → `setLazyCache` → `matchRoutes` re-runs (function now returns sync)
6. `/admin` matches, but no child matches `/nonexistent`
7. If `requireChildren` is true (default): re-match returns `null`
8. Nothing renders

With static children, the initial `matchRoutes` would return `null` and the navigation would not be intercepted at all. With lazy children, the router necessarily over-intercepts because the Navigation API decision must be made before async child discovery finishes.

This is not just a matching detail; it affects user experience and history behavior. The navigation is already intercepted and committed before the router learns that no lazy child matches.

**Mitigation:** the design should document one of these as a required pattern for lazy parents:

- define a catch-all child route for subtree-level 404 handling,
- set `requireChildren: false` if rendering the parent shell without a child is acceptable, or
- keep the parent non-lazy if the subtree must reject unknown paths before interception.

The first option is the most generally useful and should be the primary recommendation.

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

- The in-flight lazy resolution continues in the background. When it resolves, `.then()` calls `setLazyCache` to create a new `Map` reference. This is harmless — the user's cache stores the result, and future `matchRoutes` calls will resolve synchronously.
- The new navigation triggers a fresh `startTransition`, which supersedes the old one. React discards the old transition's render tree.
- If the new navigation path also requires lazy resolution, a new `PendingOutlet` handles it independently.

### Pathless routes with lazy children

Pathless routes always match and don't consume any pathname. A pathless route with lazy children works the same way — `matchRoutes` returns the pathless parent match, `RouteRenderer` produces a `<PendingOutlet>`, and Suspense handles the async resolution.

### SSR

During SSR, `PendingOutlet` suspends via `use()`, so the outcome depends on the renderer strategy:

- With streaming SSR (`renderToPipeableStream`), React can emit the parent shell and later stream the resolved child content.
- With non-streaming SSR (`renderToString`), the fallback becomes the final HTML for that request; async child discovery is not completed on the server.

That means lazy children are a poor fit for SEO-critical or "must be fully rendered in the first response" routes. The design should say this plainly: use static children for those routes, and reserve lazy children for places where a shell + later reveal is acceptable (admin areas, settings, feature dashboards, etc.).

This is also why the official helper matters. The client may hydrate and retry the same lazy subtree more than once before the tree stabilizes, especially when Suspense boundaries are involved.

### Route definitions prop change

If the `routes` prop passed to `<Router>` changes (new array/new objects), the new route definitions may have fresh lazy functions that need resolution. Router clears its `lazyCache` (derived state pattern), and `matchRoutes` calls the new functions on the next render. Previously resolved children on old route objects are unaffected — they still have their original functions, and the user's cache for those functions still works.

### Router suspension

If Router itself cannot commit (e.g., it is rendered inside a `<Suspense>` boundary and a sibling causes suspension), Router's `lazyCache` state is lost when the tree is discarded. Without the sync return capability, this would cause infinite suspension: Router renders → calls function → Promise → registers in lazyCache → suspends → state lost → repeat.

With sync return from the user's cache:

1. Router renders (first time, no state) → `matchRoutes` calls function → Promise → partial match
2. Router registers in lazyCache (setState-during-render) → PendingOutlet suspends
3. State is lost (tree discarded by parent Suspense)
4. Promise resolves in background (`.then()` calls `setLazyCache` which is now stale — harmless no-op)
5. Later, React re-renders the tree from scratch
6. Router renders fresh → `matchRoutes` calls function → sync (user cached result) → full match
7. No suspension needed, no lazyCache needed

This is why the [caching contract](#caching-contract) matters: it ensures that the system converges to a resolved state regardless of how many times React state is discarded. The user's function is the single source of truth for resolution state — not React state, and not route object mutation.

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

**Verdict:** Overloading `children` is simpler and more intuitive. The type union `RouteDefinition[] | (() => RouteDefinition[] | Promise<RouteDefinition[]>)` is clear.

### B: Official lazy-children helper (recommended)

```typescript
import { lazyRouteChildren } from "@funstack/router";

route({
  path: "admin",
  component: AdminLayout,
  children: lazyRouteChildren(() =>
    import("./admin/routes").then((module) => module.adminRoutes),
  ),
});
```

The helper does **not** need to return a branded object. It can simply return a function whose runtime shape is still `() => RouteDefinition[] | Promise<RouteDefinition[]>`, while encapsulating the required caching semantics.

**Pros:** Makes the correctness contract explicit, avoids copy-pasted user-land caching code, and reduces confusion around React retries and Suspense.
**Cons:** Adds a small API surface area.

**Verdict:** This should be the recommended API, even if the lower-level function form remains supported for power users.

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

### Step 1: Update type definitions and helper API

**File:** `packages/router/src/types.ts`

- Update `InternalRouteDefinition.children` to accept `(() => InternalRouteDefinition[] | Promise<InternalRouteDefinition[]>)`

**File:** `packages/router/src/route.ts`

- Define `LazyRouteChildren = () => RouteDefinition[] | Promise<RouteDefinition[]>`
- Add and export a `lazyRouteChildren()` helper that returns `LazyRouteChildren`
- Update `children` in `OpaqueRouteDefinition`, `RouteDefinition`, and all internal route types (`RouteWithLoader`, `RouteWithoutLoader`, etc.) to accept `LazyRouteChildren`
- Note: `PartialRouteDefinition` types don't have `children` (they have `children?: never`), so no changes needed there

### Step 2: Update `matchRoutes` to handle lazy children

**File:** `packages/router/src/core/matchRoutes.ts`

- When `typeof route.children === 'function'`: call the function
- If result is an array (sync): use it for child matching (no mutation of route objects)
- If result is a Promise (async): treat as having children for `isExact`, return parent-only match (bypass `requireChildren`)

### Step 3: Add `lazyCache` to `RouterContext`

**File:** `packages/router/src/context/RouterContext.ts`

- Add `lazyCache: Map<InternalRouteDefinition, Promise<void>>` to `RouterContextValue`

### Step 4: Update `Router` component

**File:** `packages/router/src/Router/index.tsx`

- Add `lazyCache` state via `useState(() => new Map())`
- Clear cache when `routes` prop changes (derived state pattern)
- After computing `matchedRoutesWithData`: detect async lazy children on the deepest matched route, call function to get Promise (same one matchRoutes received — user caches), register in lazyCache via setState-during-render, attach `.then()` handler
- Include `lazyCache` in `RouterContextValue`
- Add `lazyCache` to the `useMemo` dependency array for `matchedRoutesWithData`

### Step 5: Implement `PendingOutlet`

**File:** `packages/router/src/Router/PendingOutlet.tsx` (new file)

- Thin component that receives a `promise` prop and calls `use(promise)` to suspend
- No state, no side effects — all promise creation happens in Router

### Step 6: Update `RouteRenderer`

**File:** `packages/router/src/Router/RouteRenderer.tsx`

- Read `lazyCache` from `RouterContext`
- When computing outlet: if current route has `typeof children === 'function'`, look up promise from `lazyCache` and produce `<PendingOutlet promise={...} />`

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
13. **Sync resolution (cached function)**: Lazy function returns array synchronously on second call. Verify `matchRoutes` resolves it immediately with no suspension.
14. **`matchRoutes` handles sync return**: Call `matchRoutes` with a route whose children function returns an array. Verify full match is returned and `route.children` is NOT mutated (still a function).

### Step 8: Export helper and types

**File:** `packages/router/src/index.ts`

- Export `LazyRouteChildren` and `lazyRouteChildren`
- Document `lazyRouteChildren()` as the recommended API in `README.md`

## Summary of Files to Change

| File                                           | Change                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `packages/router/src/types.ts`                 | Update `InternalRouteDefinition.children` type                                |
| `packages/router/src/route.ts`                 | Add `LazyRouteChildren`; add `lazyRouteChildren()`; update `children` typings |
| `packages/router/src/core/matchRoutes.ts`      | Call lazy function; handle sync (match) and async (partial match)             |
| `packages/router/src/context/RouterContext.ts` | Add `lazyCache` to `RouterContextValue`                                       |
| `packages/router/src/Router/PendingOutlet.tsx` | New file: thin component that suspends via `use(promise)`                     |
| `packages/router/src/Router/RouteRenderer.tsx` | Produce `<PendingOutlet>` outlet for routes with lazy children                |
| `packages/router/src/Router/index.tsx`         | Add `lazyCache` state; create lazy promises; clear on routes change           |
| `packages/router/src/index.ts`                 | Export `LazyRouteChildren` and `lazyRouteChildren()`                          |
| `README.md`                                    | Document the recommended helper, SSR limits, and subtree 404 guidance         |
| `packages/router/src/__tests__/lazy.test.tsx`  | New file: test cases for lazy route definitions                               |
