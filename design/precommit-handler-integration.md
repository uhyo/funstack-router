# Design: Precommit Handler Integration

## Background: Navigation API Precommit

The Navigation API recently added a `precommitHandler` option to `NavigateEvent.intercept()`. This handler runs **after** the `navigate` event finishes dispatching but **before** the navigation "commits" — that is, before `navigation.currentEntry` is updated and the URL in the browser's address bar changes.

```
Navigation lifecycle with precommitHandler:

1. navigate event fires
2. event.intercept({ precommitHandler, handler }) is called
3. navigate event finishes dispatching
4. precommitHandler(controller) runs
   - location.href === OLD URL
   - navigation.currentEntry === old entry
5. precommitHandler promise resolves → navigation COMMITS
   - URL updates in address bar
   - navigation.currentEntry changes to new entry
   - committed promise fulfills
6. handler() runs
   - location.href === NEW URL
7. handler promise resolves → finished promise fulfills
```

If the `precommitHandler` promise rejects, the navigation is fully cancelled — no URL change, no history entry created. The `navigateerror` event fires.

### `NavigationPrecommitController`

The `precommitHandler` receives a [`NavigationPrecommitController`](https://developer.mozilla.org/en-US/docs/Web/API/NavigationPrecommitController) with two methods:

- **`redirect(url, options?)`**: Redirects the navigation to a different URL before committing. Options include `state` and `history` (`"push"` | `"replace"` | `"auto"`). Only works for `push`/`replace` navigations.
- **`addHandler(callback)`**: Dynamically adds a post-commit handler that runs after commit, as if it were passed as `handler` to `intercept()`.

### Constraints

- `precommitHandler` can only be provided when `event.cancelable` is `true`. Passing it on a non-cancelable event (e.g., certain traversals) throws a `"SecurityError"` DOMException.

### Browser Support (as of February 2026)

| Feature                   | Chrome/Edge | Firefox | Safari  |
| ------------------------- | ----------- | ------- | ------- |
| `precommitHandler`        | 141+        | 141+    | Not yet |
| `controller.redirect()`   | 141+        | 141+    | Not yet |
| `controller.addHandler()` | 145+        | 148+    | Not yet |

Safari signaled support and the Navigation API is an Interop 2026 focus area, so support is expected.

## Problem / Motivation

Currently, `@funstack/router` intercepts navigations with only a post-commit `handler`:

```typescript
// NavigationAPIAdapter.ts (current)
event.intercept({
  handler: async () => {
    // Execute actions (form submissions)
    // Execute loaders
    // Wait for async loaders
  },
});
```

This means:

1. **The URL updates immediately** when the `navigate` event finishes dispatching, even though content isn't ready yet.
2. **No pre-commit control** — there is no place to redirect before the destination URL is displayed.
3. **No pre-commit data fetching** — loaders run post-commit, so the user sees the new URL with a loading state (`isPending: true`) until data arrives.

Integrating `precommitHandler` enables three categories of functionality:

### 1. Route Guards / Pre-Commit Redirects

Redirect users before the destination URL ever appears in the address bar:

```
User clicks /admin → precommit checks auth → redirects to /signin
                     (URL never shows /admin)
```

Today, the `onNavigate` callback can call `event.preventDefault()` to cancel navigation, but cannot redirect within the same navigation. The workaround (cancel + start new navigation) creates two separate navigation events and exposes intermediate state.

### 2. Pre-Commit Data Fetching

Keep the old page visible while fetching data for the new page, then commit and render instantly:

```
Current:  click → URL changes → loading spinner → content appears
Proposed: click → old page stays → content ready → URL changes + content appears
```

This is the "keep old page while loading" pattern common in traditional MPAs and some SPA routers.

### 3. View Transitions

Start exit animations or view transitions before the URL commits, enabling two-phase transitions:

```
Phase 1 (precommit): Old page fades out, data loads
Phase 2 (commit):    New page fades in with data ready
```

## Proposed API

### Overview

Two new API surfaces, mirroring the existing `onNavigate`/`loader` pattern:

1. **Route-level `precommit` function** — per-route pre-commit logic (guards, prefetching, animations)
2. **Router-level `onPrecommit` callback** — app-wide pre-commit logic (global auth, analytics, view transitions)

### Route-Level `precommit`

A new optional `precommit` property on route definitions:

```typescript
route({
  path: "/admin/settings",
  precommit: async ({ params, controller, signal }) => {
    const user = await checkAuth({ signal });
    if (!user.isAdmin) {
      controller.redirect("/unauthorized", { history: "replace" });
    }
  },
  loader: async ({ params, signal }) => fetchSettings(params),
  component: AdminSettings,
});
```

#### `PrecommitArgs`

```typescript
type PrecommitArgs<Params extends Record<string, string>> = {
  /** Extracted path parameters for this route */
  params: Params;
  /** NavigationPrecommitController for redirect/addHandler */
  controller: NavigationPrecommitController;
  /** AbortSignal — aborted if the navigation is cancelled */
  signal: AbortSignal;
  /** The destination URL */
  url: URL;
};
```

#### Execution semantics

- Only the **deepest matched route** with a `precommit` handler runs. This mirrors how `action` works — the most specific route takes precedence for pre-commit behavior.
- If the precommit handler throws or returns a rejected promise, the navigation is cancelled (the browser handles this natively).
- If `controller.redirect()` is called, the navigation destination changes. The router should re-match routes against the redirected URL for the post-commit `handler`.

#### Type-safe route definition

The `route()` helper infers `Params` from the path pattern:

```typescript
const adminRoute = route({
  path: "/admin/:section",
  precommit: async ({ params }) => {
    // params is typed as { section: string }
  },
  component: AdminPage,
});
```

### Router-Level `onPrecommit`

A new optional prop on `<Router>`:

```typescript
<Router
  routes={routes}
  onPrecommit={async (controller, info) => {
    // Runs before any route-level precommit handlers
    console.log("Navigating to:", info.destination.pathname);
  }}
/>
```

#### `OnPrecommitCallback`

```typescript
type OnPrecommitInfo = {
  /** Matched routes for the destination */
  matches: readonly MatchedRoute[] | null;
  /** The destination URL */
  destination: URL;
  /** AbortSignal for the navigation */
  signal: AbortSignal;
};

type OnPrecommitCallback = (
  controller: NavigationPrecommitController,
  info: OnPrecommitInfo,
) => void | Promise<void>;
```

#### Execution order

```
1. navigate event fires
2. onNavigate callback (existing) — can preventDefault()
3. event.intercept() is called with precommitHandler + handler
4. precommitHandler starts:
   a. onPrecommit callback (global, new)
   b. Route-level precommit (new)
5. precommitHandler resolves → navigation COMMITS
6. handler runs:
   a. Actions (form submissions, existing)
   b. Loaders (existing)
```

### `RouterProps` Changes

```typescript
export type RouterProps = {
  routes: RouteDefinition[];
  onNavigate?: OnNavigateCallback;
  onPrecommit?: OnPrecommitCallback; // NEW
  fallback?: FallbackMode;
  ssr?: SSRConfig;
};
```

### `InternalRouteDefinition` Changes

```typescript
export type InternalRouteDefinition = {
  // ... existing fields ...
  /** Pre-commit handler for this route */
  precommit?: (args: PrecommitArgs<Record<string, string>>) => unknown;
};
```

## Implementation Plan

### Step 1: Add TypeScript declarations for `NavigationPrecommitController`

The project uses custom type declarations for the Navigation API. Add types for the new interfaces:

**File: `packages/router/src/navigation-api.d.ts`**

```typescript
interface NavigationPrecommitController {
  redirect(
    url: string,
    options?: {
      state?: unknown;
      history?: "auto" | "push" | "replace";
    },
  ): void;
  addHandler(callback: () => Promise<void>): void;
}

// Update NavigateEvent.intercept() options
interface NavigationInterceptOptions {
  handler?: () => Promise<void>;
  precommitHandler?: (
    controller: NavigationPrecommitController,
  ) => Promise<void>;
  focusReset?: "after-transition" | "manual";
  scroll?: "after-transition" | "manual";
}
```

### Step 2: Add `precommit` to route definitions

**Files:**

- `packages/router/src/route.ts` — Add `precommit` to `route()` and `routeState()` helpers
- `packages/router/src/types.ts` — Add `precommit` to `InternalRouteDefinition`, add `PrecommitArgs` type

### Step 3: Update `NavigationAPIAdapter.setupInterception`

**File: `packages/router/src/core/NavigationAPIAdapter.ts`**

Add `precommitHandler` to the `event.intercept()` call. The precommit handler:

1. Calls the router-level `onPrecommit` callback (if provided)
2. Finds and runs the deepest matched route's `precommit` handler (if any)
3. If neither exists, no `precommitHandler` is passed to `intercept()` (preserving current behavior for browsers without support)

```typescript
// Pseudocode for the key change in setupInterception
const hasPrecommit = onPrecommit || matched.some((m) => m.route.precommit);

event.intercept({
  // Only include precommitHandler if there's something to run
  // This preserves backwards compatibility with browsers that don't support it
  ...(hasPrecommit && event.cancelable
    ? {
        precommitHandler: async (controller) => {
          // 1. Global onPrecommit
          await onPrecommit?.(controller, {
            matches: matched,
            destination: url,
            signal: event.signal,
          });

          // 2. Route-level precommit (deepest match with precommit)
          const precommitRoute = findPrecommitRoute(matched);
          if (precommitRoute) {
            await precommitRoute.route.precommit!({
              params: precommitRoute.params,
              controller,
              signal: event.signal,
              url,
            });
          }
        },
      }
    : {}),
  handler: async () => {
    // ... existing handler code (actions + loaders) ...
  },
});
```

### Step 4: Update `RouterAdapter` interface

**File: `packages/router/src/core/RouterAdapter.ts`**

Update `setupInterception` to accept the new `onPrecommit` parameter:

```typescript
setupInterception(
  routes: InternalRouteDefinition[],
  onNavigate?: OnNavigateCallback,
  onPrecommit?: OnPrecommitCallback,    // NEW
  checkBlockers?: () => boolean,
): (() => void) | undefined;
```

### Step 5: Thread `onPrecommit` through `Router` component

**File: `packages/router/src/Router/index.tsx`**

Pass `onPrecommit` from props through to `adapter.setupInterception()`:

```typescript
useEffect(() => {
  return adapter.setupInterception(
    routes,
    onNavigate,
    onPrecommit, // NEW
    blockerRegistry.checkAll,
  );
}, [adapter, routes, onNavigate, onPrecommit, blockerRegistry]);
```

### Step 6: Export new types

**File: `packages/router/src/index.ts`**

Export `PrecommitArgs`, `OnPrecommitCallback`, and `OnPrecommitInfo`.

### Step 7: Update test mock

**File: `packages/router/src/__tests__/setup.ts`**

The mock navigation needs to support `precommitHandler` in `event.intercept()`:

- When `intercept()` is called with `precommitHandler`, the mock should:
  1. Create a `NavigationPrecommitController` mock
  2. Call the `precommitHandler` with the controller
  3. Wait for it to resolve before committing (updating `currentEntry`)
  4. Then call the `handler` if present
- `controller.redirect()` should update the destination URL
- `controller.addHandler()` should queue a post-commit callback

### Step 8: Add tests

New test cases:

1. **Route precommit handler runs before commit**: Verify that during the precommit handler, the old URL is still active
2. **Route precommit redirect**: Navigate to `/admin`, precommit redirects to `/signin`, verify the final URL is `/signin` and the correct route renders
3. **Route precommit cancellation**: Precommit throws → navigation is cancelled, old page remains
4. **Global onPrecommit callback**: Verify it runs before route-level precommit
5. **Precommit with loaders**: Verify loaders still run post-commit after precommit resolves
6. **Precommit not passed for non-cancelable events**: Verify no `precommitHandler` is included when `event.cancelable` is false
7. **No precommit when no handlers defined**: Verify `precommitHandler` is omitted from `intercept()` when neither `onPrecommit` nor route `precommit` exists

## Interaction with Existing Features

### Blockers (`useBlocker`)

Blockers run **before** `event.intercept()` is called — during the `navigate` event handler. If a blocker prevents navigation (`event.preventDefault()`), the precommit handler never runs. This is correct: blockers are a UI-level "are you sure?" mechanism and should take precedence.

```
navigate event → blockers check → (blocked? → preventDefault, done)
                                → (allowed? → intercept with precommit + handler)
```

### `onNavigate` callback

`onNavigate` runs during the `navigate` event, before `event.intercept()`. It can `preventDefault()` to stop the navigation entirely. If it doesn't prevent, the precommit handler runs next. No change to `onNavigate` behavior.

```
navigate event → onNavigate callback → (prevented? → done)
                                      → intercept({ precommitHandler, handler })
```

### Loaders and Actions

Loaders and actions remain in the post-commit `handler`, unchanged. The precommit handler runs before them:

```
precommitHandler → commit → handler (actions → loaders)
```

### `isPending`

`isPending` currently becomes `true` when a navigation starts (via `useTransition`). With precommit handlers, `isPending` will still become `true` at the same time — the transition starts when `currententrychange` fires (at commit). However, the commit is now delayed until the precommit handler resolves.

This means `isPending` does **not** become `true` during the precommit phase. The old page remains fully rendered and interactive. `isPending` only becomes `true` after commit while loaders are running.

This is the desired behavior: the precommit phase is invisible to the React tree.

### SSR / Static Fallback

Precommit handlers are a client-side Navigation API feature. They have no effect during SSR or in static/null adapter modes. No changes needed for `StaticAdapter` or `NullAdapter`.

## Deepest-Match vs. All-Matches Execution

A key design decision is whether precommit handlers run for the **deepest matched route** or for **all matched routes** in the stack.

### Option A: Deepest match only (recommended)

Only the most specific matched route's `precommit` runs. This is consistent with how `action` works.

**Pros:**

- Simple mental model: one route "owns" the pre-commit behavior
- No ordering concerns between parent/child precommit handlers
- Consistent with `action` precedent

**Cons:**

- Parent layout routes can't define their own guards (must use `onPrecommit` for global guards)

### Option B: All matches (parent to child)

All matched routes' `precommit` handlers run sequentially, parent first.

**Pros:**

- Layout routes can define guards for all their children
- More granular control

**Cons:**

- Ordering and early-return semantics are complex (if parent redirects, do children run?)
- No existing precedent in the router (`action` is deepest-only)
- Can be approximated with `onPrecommit` + route matching for the global case

### Recommendation

**Option A (deepest match only)** is recommended for the initial implementation. It keeps the API simple and consistent. Global precommit logic belongs in `onPrecommit`. If demand for parent-level guards emerges, it can be added later as an opt-in without breaking changes.

## Re-Matching After Redirect

When `controller.redirect()` is called in a precommit handler, the destination URL changes. The post-commit `handler` needs to know the new matched routes to run loaders correctly.

### Approach

After the precommit handler resolves, the `handler` should re-match routes against the (potentially redirected) URL. The URL after redirect is available as `navigation.currentEntry.url` after commit.

```typescript
event.intercept({
  precommitHandler: async (controller) => {
    // May call controller.redirect()
    await runPrecommitHandlers(controller, matched, url);
  },
  handler: async () => {
    // After commit, use the committed URL (may differ from original if redirected)
    const committedEntry = navigation.currentEntry;
    const committedUrl = new URL(committedEntry!.url!);
    const finalMatches = matchRoutes(routes, committedUrl.pathname);

    if (!finalMatches) return;

    // Execute loaders for the final matched routes
    const request = createLoaderRequest(committedUrl);
    const results = executeLoaders(
      finalMatches,
      committedEntry!.id,
      request,
      event.signal,
    );
    await Promise.all(results.map((r) => r.data));
  },
});
```

## Edge Cases

### Non-cancelable events

Traverse navigations (back/forward) may have `event.cancelable === false`. Since `precommitHandler` requires a cancelable event, the router must not pass `precommitHandler` for non-cancelable events. Route-level `precommit` handlers are silently skipped in this case.

### Browsers without `precommitHandler` support

If the browser supports the Navigation API but not `precommitHandler` (currently Safari), passing `precommitHandler` to `intercept()` may throw. The router should feature-detect support:

```typescript
// Feature detection: check if precommitHandler is supported
const supportsPrecommit = (() => {
  try {
    // precommitHandler support can be detected by checking
    // if the option is recognized by the browser
    return typeof NavigationPrecommitController !== "undefined";
  } catch {
    return false;
  }
})();
```

When `precommitHandler` is not supported:

- Route `precommit` handlers are silently skipped
- `onPrecommit` is silently skipped
- A console warning is logged if precommit handlers are defined but not supported

### Precommit + form submissions

For POST form submissions, the current flow is: match routes → find action route → run action in handler → revalidate loaders. Precommit handlers run before actions. This is correct — a guard can redirect before any action executes.

### Redirect to a route with its own precommit

If a precommit handler redirects to a URL whose matched route also has a `precommit` handler, the redirected route's precommit does **not** run. The redirect happens within a single precommit phase — there is no recursive precommit evaluation. This matches the Navigation API's semantics where `controller.redirect()` changes the destination but doesn't restart the interception flow.

## Future Considerations

### Pre-commit loader execution

A natural extension is running loaders during the precommit phase instead of post-commit, implementing the "keep old page while loading" pattern:

```typescript
route({
  path: "/users/:id",
  loader: async ({ params }) => fetchUser(params.id),
  loaderTiming: "precommit", // Run loader before URL changes
  component: UserPage,
});
```

This is intentionally deferred from the initial implementation to keep scope focused, but the precommit infrastructure enables it naturally.

### View transition integration

The precommit handler is the building block for two-phase view transitions. A dedicated view transition API could be built on top:

```typescript
<Router
  routes={routes}
  viewTransition={true} // Automatically use precommit for view transitions
/>
```

This is also deferred from the initial implementation.

## Summary of Files to Change

| File                                               | Change                                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `packages/router/src/navigation-api.d.ts`          | Add `NavigationPrecommitController` type, update `intercept()` options                                      |
| `packages/router/src/types.ts`                     | Add `PrecommitArgs`, `OnPrecommitCallback`, `OnPrecommitInfo`; add `precommit` to `InternalRouteDefinition` |
| `packages/router/src/route.ts`                     | Add `precommit` to `route()` and `routeState()` helpers                                                     |
| `packages/router/src/core/RouterAdapter.ts`        | Update `setupInterception` signature to accept `onPrecommit`                                                |
| `packages/router/src/core/NavigationAPIAdapter.ts` | Pass `precommitHandler` to `intercept()`, implement precommit execution logic                               |
| `packages/router/src/core/StaticAdapter.ts`        | Update `setupInterception` parameter types                                                                  |
| `packages/router/src/core/NullAdapter.ts`          | Update `setupInterception` parameter types                                                                  |
| `packages/router/src/Router/index.tsx`             | Accept `onPrecommit` prop, pass to adapter                                                                  |
| `packages/router/src/index.ts`                     | Export new types                                                                                            |
| `packages/router/src/__tests__/setup.ts`           | Add `precommitHandler` support to mock navigation                                                           |
| `packages/router/src/__tests__/precommit.test.tsx` | New test file for precommit handler tests                                                                   |
