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

The `hasLazyChildren` branch bypasses the `requireChildren` check. A route with lazy children conceptually _has_ children — they just haven't been loaded yet. Returning the parent match allows the parent component to render (with `outlet = null`) while children load.

### New: `resolveLazyChildren`

A new async function that walks the route tree along a matching path and resolves any lazy children it encounters:

```typescript
// packages/router/src/core/resolveLazyChildren.ts

/**
 * Walk the route tree along the given pathname and resolve any
 * lazy children encountered on the matching path.
 *
 * Resolved children are installed in-place (the function reference
 * is replaced with the resolved array), so subsequent synchronous
 * matchRoutes calls see the resolved children.
 *
 * Returns true if any lazy children were resolved.
 */
export async function resolveLazyChildren(
  routes: InternalRouteDefinition[],
  pathname: string,
): Promise<boolean> {
  let didResolve = false;

  for (const route of routes) {
    const hasStaticChildren =
      Array.isArray(route.children) && route.children.length > 0;
    const hasLazyChildren = typeof route.children === "function";
    const hasChildren = hasStaticChildren || hasLazyChildren;

    // --- Pathless routes: always match, consume nothing ---
    if (route.path === undefined) {
      if (hasLazyChildren) {
        route.children = internalRoutes(await route.children());
        didResolve = true;
      }
      if (Array.isArray(route.children) && route.children.length > 0) {
        didResolve =
          (await resolveLazyChildren(route.children, pathname)) || didResolve;
      }
      // Pathless routes don't "claim" the path — continue checking siblings
      continue;
    }

    // --- Path-based routes ---
    const isExact = route.exact ?? !hasChildren;
    const { matched, consumedPathname } = matchPath(
      route.path,
      pathname,
      isExact,
    );
    if (!matched) continue;

    // This route matches. Resolve its lazy children if needed.
    if (hasLazyChildren) {
      route.children = internalRoutes(await route.children());
      didResolve = true;
    }

    // Recurse into (potentially just-resolved) children
    if (Array.isArray(route.children) && route.children.length > 0) {
      let remaining = pathname.slice(consumedPathname.length);
      if (!remaining.startsWith("/")) remaining = "/" + remaining;
      if (remaining === "") remaining = "/";
      didResolve =
        (await resolveLazyChildren(route.children, remaining)) || didResolve;
    }

    // First matching path-based route wins — stop checking siblings
    break;
  }

  return didResolve;
}
```

This function mirrors the matching logic of `matchRoutes` just enough to walk the same path. It reuses `matchPath` (the internal helper in `matchRoutes.ts`, which will need to be exported or extracted to a shared module).

**Key property:** After `resolveLazyChildren(routes, pathname)` completes, calling `matchRoutes(routes, pathname)` is guaranteed to encounter only resolved (array) children along the matching path. This means `matchRoutes` produces a full match.

### `NavigationAPIAdapter` Changes

The navigation handler resolves lazy children in the async `handler` before running loaders:

```typescript
// packages/router/src/core/NavigationAPIAdapter.ts

setupInterception(routes, onNavigate, checkBlockers) {
  const handleNavigate = (event: NavigateEvent) => {
    // ... existing checks (bypass, blockers, canIntercept) ...

    const url = new URL(event.destination.url);

    // Initial match — may be partial if lazy children aren't resolved
    const matched = matchRoutes(routes, url.pathname);

    // ... existing onNavigate callback, willIntercept check ...

    event.intercept({
      handler: async () => {
        // Resolve any lazy children along this navigation path
        const didResolve = await resolveLazyChildren(routes, url.pathname);

        // If lazy children were resolved, re-match to get the full match
        const fullMatched = didResolve
          ? matchRoutes(routes, url.pathname)
          : matched;

        if (!fullMatched) return;

        const currentEntry = navigation.currentEntry;
        if (!currentEntry) {
          throw new Error(
            "Navigation currentEntry is null during navigation interception",
          );
        }

        // ... existing action + loader logic, using fullMatched ...
      },
    });
  };

  // ... existing event listener setup ...
}
```

**Why resolve in `handler`, not before `intercept`?**

The `handleNavigate` function runs synchronously during the navigate event. We can't `await` there. The `handler` callback passed to `event.intercept()` is async, making it the natural place for lazy resolution.

We use the initial (possibly partial) `matched` result to decide _whether_ to intercept. A partial match (parent matched, lazy children not yet loaded) is sufficient — if the parent path matches, the URL belongs to our route tree and should be intercepted.

**When the initial `matched` is `null`:** No route matches, even as a prefix. The navigation isn't intercepted. No lazy resolution happens — correctly, because if no parent route matches the URL, there are no lazy children to resolve.

### `Router` Component Changes

The Router component needs to handle lazy resolution for the **initial page load** case, where there's no navigation event to trigger resolution.

```typescript
// packages/router/src/Router/index.tsx

export function Router({ routes: inputRoutes, ... }: RouterProps): ReactNode {
  const routes = internalRoutes(inputRoutes);

  // Counter to force re-computation after lazy resolution
  const [lazyVersion, setLazyVersion] = useState(0);

  // ... existing adapter, blocker, subscription setup ...

  const matchedRoutesWithData = useMemo(() => {
    // ... existing matching + loader logic (unchanged) ...
  }, [routes, adapter, urlObject, runLoaders, locationKey, lazyVersion]);
  //                                                        ^^^^^^^^^^^

  // Resolve lazy children on the matching path
  useEffect(() => {
    if (!urlObject) return;
    let cancelled = false;

    resolveLazyChildren(routes, urlObject.pathname).then((didResolve) => {
      if (!cancelled && didResolve) {
        setLazyVersion((v) => v + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [routes, urlObject]);

  // ... rest unchanged ...
}
```

**Why a `useEffect` and not inline in `useMemo`?**

`useMemo` must be synchronous. Lazy resolution is async. The effect fires after the initial render, resolves lazy children, and triggers a re-render via the `lazyVersion` state update.

**Double-resolution concern:** Both the Router effect and the NavigationAPIAdapter handler could resolve the same lazy children. This is harmless — the first resolution installs the children; the second sees `Array.isArray(route.children)` and skips resolution. The in-place mutation acts as a natural deduplication mechanism.

**Concurrent resolution:** If the user navigates away while lazy children are loading (for the initial page load), the effect's cleanup sets `cancelled = true`, preventing the stale `setLazyVersion` call. The new navigation's handler resolves the correct path's lazy children independently.

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
  3. Navigation commits (URL changes to /admin/settings)
  4. handler() runs asynchronously:
     a. resolveLazyChildren(routes, "/admin/settings")
        → resolves adminRoute.children = [settingsRoute, usersRoute, ...]
        → recurses: no further lazy children
        → returns true
     b. matchRoutes(routes, "/admin/settings")
        → /admin matches, children now available
        → /settings matches within children
        → returns [adminRoute match, settingsRoute match]  (full match)
     c. executeLoaders(fullMatched, ...)
        → runs admin loader (if any) + settings loader
     d. await loader results
  5. React renders with full match + data
```

During step 3-4, the old page remains visible (React transition). The URL has changed, but content hasn't updated yet. Once loaders complete in step 4d, React transitions to the new page with all data ready.

### Initial Page Load on a Lazy Route

```
Browser loads /admin/settings directly
  1. Router component mounts
  2. useMemo: matchRoutes(routes, "/admin/settings")
     → partial match: [adminRoute match]
  3. RouteRenderer renders AdminLayout with outlet=null
     → User sees the admin layout but no child content
  4. useEffect fires: resolveLazyChildren(routes, "/admin/settings")
     → resolves adminRoute.children
     → setLazyVersion(1)
  5. useMemo re-runs: matchRoutes(routes, "/admin/settings")
     → full match: [adminRoute match, settingsRoute match]
  6. executeLoaders runs settings loader
  7. RouteRenderer renders AdminLayout + Settings content
```

Between steps 3 and 7, the user sees the parent layout without child content. This is analogous to how `React.lazy` shows a Suspense fallback — the parent layout serves as a natural "loading shell."

If the parent route has no component (purely structural parent), the user sees nothing until resolution completes. In this case, the app should either:

- Add a component to the parent route that renders `<Outlet />` with a loading fallback
- Use a pathless layout wrapper with a loading state

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

If the async function throws (e.g., network error loading the module), the route's `children` remains a function. The parent renders with `outlet = null`.

The error should be surfaced to the user. Options:

1. **Console warning**: Log the error with the route path for debugging.
2. **Error state**: The Router could track resolution errors and expose them. However, this adds significant complexity.

For the initial implementation, option 1 (console warning) is recommended. Users who need error recovery can wrap their lazy function with retry logic:

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
3. Handler resolves lazy children: `[settingsRoute, usersRoute]`
4. Re-match: `/admin` matches, but no child matches `/nonexistent`
5. If `requireChildren` is true (default): re-match returns `null`
6. Navigation committed to `/admin/nonexistent`, nothing renders

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

- **In NavigationAPIAdapter:** The Navigation API's `event.signal` is aborted for the old navigation. The handler for the new navigation runs independently. The old resolution still completes and installs children (this is fine — the installed children are correct and will be available for future navigations).
- **In Router effect:** The cleanup function sets `cancelled = true`, preventing the stale state update. The new URL triggers a new effect that resolves the correct path.

### Pathless routes with lazy children

Pathless routes always match and don't consume any pathname. A pathless route with lazy children works the same way — the parent matches immediately, and lazy children are resolved when needed.

Since pathless routes don't "claim" a path segment, `resolveLazyChildren` continues checking siblings after processing a pathless route (the `continue` instead of `break` in the pathless branch).

### SSR

During SSR, lazy children cannot be resolved (no async in render path). Routes with lazy children behave as if they have no children during SSR:

- The parent route renders (if it has a component), providing a shell
- Child routes within lazy children are not rendered during SSR
- After hydration on the client, the effect resolves lazy children and triggers a re-render

For SSR-critical routes, users should define children statically. Lazy children are best suited for routes that don't need server rendering (admin panels, settings pages, etc.).

### Route definitions prop change

If the `routes` prop passed to `<Router>` changes (new array/new objects), previously resolved lazy children live on the old objects. The new route definitions may have fresh lazy functions that need resolution. This works correctly because `resolveLazyChildren` checks `typeof route.children === 'function'` on each call — fresh functions trigger resolution, while already-resolved arrays are skipped.

## Interaction with Existing Features

### Loaders and Actions

Loaders and actions work unchanged. After lazy resolution + re-match, the full matched route stack is available. Loaders execute against the full match, including routes from resolved lazy children.

### `onNavigate` callback

`onNavigate` receives `matches` from the initial synchronous `matchRoutes` call, which may be a partial match when lazy children are involved. This is a known limitation — the callback doesn't have access to the full match until lazy children are resolved.

If this becomes a problem, a future enhancement could add a second callback (e.g., `onNavigateResolved`) that fires after lazy resolution with the full match. For the initial implementation, the partial match is sufficient for most use cases (global guards typically check the parent path, not specific children).

### `useBlocker`

Blockers run before `event.intercept()`, so they execute before any lazy resolution. This is correct — blockers are a "are you sure?" mechanism that should work regardless of whether children are loaded.

### `isPending` / `useTransition`

On navigation to a lazy route, `isPending` becomes `true` when the navigation commits (same as today). The lazy resolution happens during the `handler` phase, so it contributes to the "pending" duration. From the user's perspective, the pending state covers both lazy loading and data loading — a single seamless transition.

On initial page load, `isPending` is `false` throughout. The parent layout renders immediately, and the child appears after resolution. There's no transition because there's no "old page" to transition from.

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

### D: Suspense-based resolution in Router

Instead of a `useEffect` + state counter, throw a promise during render (Suspense pattern) when lazy children are encountered:

```typescript
const matchedRoutesWithData = useMemo(() => {
  const matched = matchRoutes(routes, urlObject.pathname);
  // matchRoutes throws a promise if lazy children are hit
  // Suspense boundary catches it, re-renders when resolved
}, [...]);
```

**Pros:** No extra state. Resolution blocks rendering until children are available (no flash of parent-only layout).
**Cons:** Requires a Suspense boundary above `<Router>` or inside it. Throwing from `useMemo` is not a well-supported pattern (React docs recommend throwing only from component render or `use()`). The parent-only flash is actually desirable in most cases (progressive rendering).

**Verdict:** Too fragile and couples the router to Suspense semantics. The effect-based approach is more predictable.

## Implementation Plan

### Step 1: Extract `matchPath` to a shared module

`matchPath` is currently a private function inside `matchRoutes.ts`. It's needed by `resolveLazyChildren`. Extract it to a shared utility:

**File:** `packages/router/src/core/matchPath.ts`

Export `matchPath` with its current signature. Update `matchRoutes.ts` to import from the new module.

### Step 2: Update type definitions

**File:** `packages/router/src/types.ts`

- Update `InternalRouteDefinition.children` to accept `(() => Promise<InternalRouteDefinition[]>)`

**File:** `packages/router/src/route.ts`

- Define `LazyRouteChildren = () => Promise<RouteDefinition[]>`
- Update `children` in `OpaqueRouteDefinition`, `RouteDefinition`, and all internal route types (`RouteWithLoader`, `RouteWithoutLoader`, etc.) to accept `LazyRouteChildren`
- Note: `PartialRouteDefinition` types don't have `children` (they have `children?: never`), so no changes needed there

### Step 3: Update `matchRoutes` to handle lazy children

**File:** `packages/router/src/core/matchRoutes.ts`

- Detect `typeof route.children === 'function'` for `hasChildren` / `isExact` determination
- When children is a function, return parent-only match (bypass child matching and `requireChildren` check)

### Step 4: Implement `resolveLazyChildren`

**File:** `packages/router/src/core/resolveLazyChildren.ts` (new file)

- Async function that walks route tree along a pathname
- Resolves lazy children functions and installs the result in-place
- Reuses `matchPath` from the shared module
- Returns `boolean` indicating whether any resolution occurred

### Step 5: Update `NavigationAPIAdapter`

**File:** `packages/router/src/core/NavigationAPIAdapter.ts`

- Import `resolveLazyChildren`
- In the `handler` callback inside `setupInterception`:
  1. Call `await resolveLazyChildren(routes, url.pathname)` at the start
  2. If resolution occurred, re-match with `matchRoutes`
  3. Use the full match for actions and loaders

### Step 6: Update `Router` component

**File:** `packages/router/src/Router/index.tsx`

- Add `lazyVersion` state counter
- Add `useEffect` that calls `resolveLazyChildren` and increments counter on resolution
- Add `lazyVersion` to the `useMemo` dependency array for `matchedRoutesWithData`

### Step 7: Add tests

**File:** `packages/router/src/__tests__/lazy.test.tsx` (new file)

Test cases:

1. **Lazy children resolve on navigation**: Navigate to `/admin/settings` where `/admin` has lazy children containing `/settings`. Verify the settings route renders.
2. **Lazy children resolve on initial load**: Mount Router with URL at `/admin/settings`. Verify parent renders first, then child appears after resolution.
3. **Resolution is cached**: Navigate to `/admin/settings`, navigate away, navigate back. Verify the lazy function is called only once.
4. **Nested lazy children**: `/admin` has lazy children, one of which has its own lazy children. Verify multi-level resolution works.
5. **Pathless route with lazy children**: Pathless layout wraps lazy children. Verify resolution and rendering.
6. **Lazy resolution failure**: Async function throws. Verify parent renders with null outlet and error is logged.
7. **Navigation during resolution**: Navigate to `/admin/settings`, then quickly navigate to `/home`. Verify `/home` renders correctly.
8. **Lazy children with loaders**: Lazy child has a loader. Verify loader runs after resolution.
9. **No over-interception for non-matching siblings**: Static route `/about` is not affected by a sibling lazy route `/admin`.
10. **`matchRoutes` prefix matching with lazy children**: Verify parent matches as prefix even though children aren't loaded.

### Step 8: Export types

**File:** `packages/router/src/index.ts`

- Export `LazyRouteChildren` type (if users need it for type annotations)

## Summary of Files to Change

| File                                               | Change                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `packages/router/src/types.ts`                     | Update `InternalRouteDefinition.children` type                                |
| `packages/router/src/route.ts`                     | Add `LazyRouteChildren` type; update `children` on all route definition types |
| `packages/router/src/core/matchPath.ts`            | New file: extract `matchPath` from `matchRoutes.ts`                           |
| `packages/router/src/core/matchRoutes.ts`          | Import `matchPath`; handle lazy children in matching                          |
| `packages/router/src/core/resolveLazyChildren.ts`  | New file: async lazy resolution function                                      |
| `packages/router/src/core/NavigationAPIAdapter.ts` | Resolve lazy children in intercept handler                                    |
| `packages/router/src/Router/index.tsx`             | Add `lazyVersion` state + effect for initial load resolution                  |
| `packages/router/src/index.ts`                     | Export `LazyRouteChildren` type                                               |
| `packages/router/src/__tests__/lazy.test.tsx`      | New file: test cases for lazy route definitions                               |
