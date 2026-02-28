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

One new API surface on route definitions:

- **Route-level `precommit` function** — per-route pre-commit logic (guards, prefetching, animations)

For app-wide precommit logic, no new Router prop is needed. The existing `onNavigate` callback receives the raw `NavigateEvent`, so users can call `event.intercept({ precommitHandler })` directly. The Navigation API aggregates handlers from multiple `intercept()` calls, so the user's precommit handler runs alongside the router's.

### Route-Level `precommit`

A new optional `precommit` property on route definitions:

```typescript
route({
  path: "/admin/settings",
  precommit: ({ params, redirect }) => {
    if (!isAdmin()) {
      redirect("/unauthorized");
      return;
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
  /**
   * Redirect the navigation to a different URL before it commits.
   * Call `return` after `redirect()` to avoid executing subsequent logic in the handler.
   */
  redirect: (url: string) => void;
  /** The destination URL */
  url: URL;
};
```

#### Execution semantics

- Precommit handlers may be synchronous or asynchronous — the router `await`s each handler before proceeding to the next. However, **synchronous handlers are strongly recommended**. The precommit phase runs before the URL bar updates, so async work (network requests, server-side auth) delays the visible navigation and degrades perceived performance. Prefer checking local state (tokens, flags, stores) in precommit and deferring async work to loaders, which run post-commit.
- **All matched routes** with `precommit` handlers run **sequentially, parent to child**. This allows layout routes to define guards that protect all their children.
- If `redirect()` is called, the remaining child handlers are **skipped**. The router then **re-matches** routes against the new URL and runs the new match stack's precommit handlers from parent to child. This process repeats until no redirect occurs (or a maximum iteration limit is reached), naturally resolving redirect chains.
- If any precommit handler throws (or returns a rejected promise), the navigation is cancelled (the browser handles this natively via precommitHandler rejection).
- After all precommit handlers complete without redirect, the navigation commits and the post-commit `handler` runs loaders against the final URL.

#### Type-safe route definition

The `route()` helper infers `Params` from the path pattern:

```typescript
const adminRoute = route({
  path: "/admin/:section",
  precommit: ({ params }) => {
    // params is typed as { section: string }
  },
  component: AdminPage,
});
```

### Global Precommit via `onNavigate`

Users who need app-wide precommit logic (global auth, analytics, view transitions) can use the existing `onNavigate` callback:

```typescript
<Router
  routes={routes}
  onNavigate={(event, info) => {
    if (info.intercepting) {
      event.intercept({
        precommitHandler: async (controller) => {
          // Global precommit logic
          if (needsAuth(info.matches) && !isAuthenticated()) {
            controller.redirect("/signin", { history: "replace" });
          }
        },
      });
    }
  }}
/>
```

The Navigation API aggregates handlers from multiple `intercept()` calls. Precommit handlers run in registration order, so the user's handler (registered during `onNavigate`) runs **before** the router's handler (registered after `onNavigate` returns). This is the natural order: global guards run before route-level guards.

#### Execution order

```
1. navigate event fires
2. onNavigate callback (existing) — can preventDefault() or call event.intercept()
3. Router calls event.intercept() with precommitHandler + handler
4. precommitHandler starts:
   a. User's precommitHandler from onNavigate (if registered)
   b. Router's precommitHandler:
      - Route precommit handlers run sequentially (parent → child)
5. All precommitHandler promises resolve → navigation COMMITS
6. handler runs:
   a. Actions (form submissions, existing)
   b. Loaders (existing)
```

### `InternalRouteDefinition` Changes

```typescript
export type InternalRouteDefinition = {
  // ... existing fields ...
  /** Pre-commit handler for this route */
  precommit?: (
    args: PrecommitArgs<Record<string, string>>,
  ) => void | Promise<void>;
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

1. Runs matched routes' `precommit` handlers sequentially, parent to child
2. If `redirect()` is called, skips remaining children, re-matches routes against the new URL, and repeats (redirect chain loop with max iteration guard)
3. Calls `nativeController.redirect()` on each redirect to update the Navigation API's destination
4. If no matched route has a `precommit`, no `precommitHandler` is passed to `intercept()` (preserving current behavior for browsers without support)

```typescript
// Pseudocode for the key change in setupInterception
const hasPrecommit = matched.some((m) => m.route.precommit);

event.intercept({
  // Only include precommitHandler if there's something to run.
  // This preserves backwards compatibility with browsers that don't support it.
  ...(hasPrecommit && event.cancelable
    ? {
        precommitHandler: async (nativeController) => {
          const MAX_REDIRECTS = 10;
          let currentUrl = url;
          let currentMatched = matched;

          for (let i = 0; i < MAX_REDIRECTS; i++) {
            let redirectTarget: string | null = null;
            const redirect = (to: string) => {
              redirectTarget = to;
            };

            // Run precommit handlers sequentially, parent → child
            for (const match of currentMatched) {
              if (match.route.precommit) {
                await match.route.precommit({
                  params: match.params,
                  url: currentUrl,
                  redirect,
                });
                // Parent redirected → skip remaining children
                if (redirectTarget !== null) break;
              }
            }

            // No redirect → done, proceed to commit
            if (redirectTarget === null) break;

            // Apply redirect and re-match against new URL
            nativeController.redirect(redirectTarget);
            currentUrl = new URL(redirectTarget, currentUrl);
            const newMatched = matchRoutes(routes, currentUrl.pathname);

            // No routes match the redirect target → done
            if (newMatched === null) break;

            currentMatched = newMatched;
            // Loop continues: run new match stack's precommit handlers
          }
        },
      }
    : {}),
  handler: async () => {
    // After commit, use the committed URL (may differ from original if redirected)
    const committedEntry = navigation.currentEntry;
    const committedUrl = new URL(committedEntry!.url!);
    const finalMatches = matchRoutes(routes, committedUrl.pathname);

    if (!finalMatches) return;

    // ... existing action + loader logic, using finalMatches ...
  },
});
```

### Step 4: Export new types

**File: `packages/router/src/index.ts`**

Export `PrecommitArgs`.

No changes are needed to `RouterAdapter`, `Router`, `StaticAdapter`, or `NullAdapter` since the precommit handling is entirely within `NavigationAPIAdapter`'s existing `setupInterception` method — it simply reads `precommit` from the matched route definitions.

### Step 5: Update test mock

**File: `packages/router/src/__tests__/setup.ts`**

The mock navigation needs to support `precommitHandler` in `event.intercept()`:

- When `intercept()` is called with `precommitHandler`, the mock should:
  1. Create a `NavigationPrecommitController` mock
  2. Call the `precommitHandler` with the controller
  3. Wait for it to resolve before committing (updating `currentEntry`)
  4. Then call the `handler` if present
- `controller.redirect()` should update the destination URL
- `controller.addHandler()` should queue a post-commit callback

### Step 6: Add tests

New test cases:

1. **Route precommit handler runs before commit**: Verify that during the precommit handler, the old URL is still active
2. **Route precommit redirect**: Navigate to `/admin`, precommit redirects to `/signin`, verify the final URL is `/signin` and the correct route renders
3. **Route precommit cancellation**: Precommit throws → navigation is cancelled, old page remains
4. **Multi-level precommit (parent → child)**: Both parent and child have precommit handlers; verify both run in order (parent first)
5. **Parent redirect skips child precommit**: Parent precommit calls `redirect()`; verify child precommit does not run
6. **Redirect chain**: `/a` precommit redirects to `/b`, `/b` precommit redirects to `/c`; verify final URL is `/c` and `/c`'s route renders
7. **Redirect chain with nested routes**: Parent precommit passes, child redirects to a different parent's subtree; verify new parent's precommit runs
8. **Infinite redirect loop detection**: `/a` redirects to `/b`, `/b` redirects to `/a`; verify the loop stops at the iteration limit with a warning
9. **Precommit receives correct params after redirect**: After a redirect, the new match stack's precommit handlers receive params extracted from the redirect target URL, not the original
10. **Precommit with loaders**: Verify loaders run post-commit against the final (potentially redirected) URL
11. **Precommit not passed for non-cancelable events**: Verify no `precommitHandler` is included when `event.cancelable` is false
12. **No precommit when no handlers defined**: Verify `precommitHandler` is omitted from `intercept()` when no matched route has `precommit`
13. **Global precommit via onNavigate**: Verify user can register precommit handler via `onNavigate` + `event.intercept()`
14. **Async precommit handler**: Verify that an async precommit handler is awaited before the navigation commits

## Interaction with Existing Features

### Blockers (`useBlocker`)

Blockers run **before** `event.intercept()` is called — during the `navigate` event handler. If a blocker prevents navigation (`event.preventDefault()`), the precommit handler never runs. This is correct: blockers are a UI-level "are you sure?" mechanism and should take precedence.

```
navigate event → blockers check → (blocked? → preventDefault, done)
                                → (allowed? → intercept with precommit + handler)
```

### `onNavigate` callback

`onNavigate` runs during the `navigate` event, before the router calls `event.intercept()`. It can:

1. Call `event.preventDefault()` to stop the navigation entirely.
2. Call `event.intercept({ precommitHandler })` to register a global precommit handler.

If the user registers a precommit handler via `onNavigate`, it runs **before** the router's route-level precommit handlers (since `intercept()` calls are processed in registration order).

```
navigate event → onNavigate callback → (prevented? → done)
               ↓                      → user may call event.intercept({ precommitHandler })
               → router calls event.intercept({ precommitHandler, handler })
               → all precommitHandlers run (user's first, then router's)
               → commit
               → all handlers run
```

No changes to the `onNavigate` type signature or behavior are needed.

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

## Multi-Level Execution Model

All matched routes with `precommit` handlers run **sequentially, parent to child**. This allows layout routes to define guards that protect all their children without duplicating logic.

### Example: Nested Auth Guards

```typescript
const routes = [
  route({
    path: "/app",
    precommit: ({ redirect }) => {
      // Parent guard: require authentication for all /app/* routes
      if (!isAuthenticated()) {
        redirect("/signin");
        return;
      }
    },
    component: AppLayout,
    children: [
      route({
        path: "admin",
        precommit: ({ redirect }) => {
          // Child guard: require admin role (only runs if parent didn't redirect)
          if (!isAdmin()) {
            redirect("/app/unauthorized");
            return;
          }
        },
        component: AdminPanel,
      }),
    ],
  }),
];
```

Navigating to `/app/admin` as an unauthenticated user:

1. Parent precommit runs → redirects to `/signin`
2. Child precommit is **skipped** (redirect already issued)

Navigating to `/app/admin` as a non-admin authenticated user:

1. Parent precommit runs → passes (user is authenticated)
2. Child precommit runs → redirects to `/app/unauthorized`

### Short-Circuiting and Redirect Chains

When `redirect()` is called in a precommit handler:

1. The remaining child handlers are **skipped** — the current match stack is invalidated since child handlers' `params` were extracted from the original URL, not the redirect target.
2. The router **re-matches** routes against the redirect target URL.
3. The new match stack's precommit handlers run from parent to child.
4. This process repeats until no redirect occurs, up to a maximum of 10 iterations.

This naturally resolves redirect chains: if `/old` redirects to `/new`, and `/new`'s layout route redirects to `/final`, both redirects are resolved in a single navigation. A maximum iteration guard prevents infinite redirect loops (e.g., `/a` → `/b` → `/a`), with a warning in development mode.

The `redirect` function provided by the router is a simple callback that captures the target URL — the router checks whether it was called after each precommit handler returns. This avoids wrapping the native `NavigationPrecommitController` while still giving the router full control over the redirect chain.

### Contrast with `action`

Unlike `action` (which runs only the deepest match), `precommit` runs all levels. This difference is intentional:

- **`action`** handles form submission — only one route should process a given form.
- **`precommit`** defines guards and pre-navigation logic — parent routes naturally want to guard access to their entire subtree.

## Re-Matching After Redirect

When a precommit handler calls `redirect()`, two levels of re-matching occur:

### 1. During the precommit phase (redirect chains)

Each time `redirect()` is called, the router immediately re-matches routes against the new URL and runs the new match stack's precommit handlers. This loop continues until no precommit handler redirects (or the iteration limit is reached). The router calls `nativeController.redirect()` on each iteration to update the Navigation API's destination.

```
Navigate to /old-page
  → Match: [Layout, OldPage]
  → Layout.precommit → no redirect
  → OldPage.precommit → redirect("/new-page")
  → Re-match /new-page: [Layout, NewPage]
  → Layout.precommit → no redirect
  → NewPage.precommit → no redirect
  → Done. Navigation commits to /new-page.
```

### 2. In the post-commit handler (loader execution)

After the precommit phase resolves and the navigation commits, the `handler` re-matches routes against the committed URL (which reflects the final redirect target) to determine which loaders to run:

```typescript
handler: async () => {
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
- A console warning is logged if precommit handlers are defined but not supported

### Precommit + form submissions

For POST form submissions, the current flow is: match routes → find action route → run action in handler → revalidate loaders. Precommit handlers run before actions. This is correct — a guard can redirect before any action executes.

### Redirect to a route with its own precommit

If a precommit handler redirects to a URL whose matched route also has a `precommit` handler, the redirected route's precommit **does** run. The router re-matches routes after each redirect and runs the new match stack's precommit handlers, forming a redirect chain. This is intentionally different from the raw Navigation API semantics (where `controller.redirect()` simply changes the destination without restarting interception) — the router adds this re-evaluation to ensure all guards on the final destination are respected.

A maximum iteration limit (10) prevents infinite redirect loops. If the limit is exceeded, the router stops redirecting, logs a warning in development, and commits to the last redirect target.

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

| File                                               | Change                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/router/src/navigation-api.d.ts`          | Add `NavigationPrecommitController` type, update `intercept()` options   |
| `packages/router/src/types.ts`                     | Add `PrecommitArgs`; add `precommit` to `InternalRouteDefinition`        |
| `packages/router/src/route.ts`                     | Add `precommit` to `route()` and `routeState()` helpers                  |
| `packages/router/src/core/NavigationAPIAdapter.ts` | Pass `precommitHandler` to `intercept()`, implement sequential execution |
| `packages/router/src/index.ts`                     | Export `PrecommitArgs`                                                   |
| `packages/router/src/__tests__/setup.ts`           | Add `precommitHandler` support to mock navigation                        |
| `packages/router/src/__tests__/precommit.test.tsx` | New test file for precommit handler tests                                |
