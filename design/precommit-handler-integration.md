# Design: Precommit Handler Integration

## Summary

Add route-level `precommit` handlers to `@funstack/router` using the Navigation API's `precommitHandler`.

V1 scope is intentionally narrow:

- support **route guards** and **internal redirects before commit**
- keep the precommit lifecycle **router-owned**
- leave app-wide precommit hooks, precommit loaders, and view-transition APIs for later

## Motivation

Today the router only uses a post-commit `handler` in `event.intercept()`. That means the destination URL can become visible before route-level guard logic finishes.

`precommitHandler` gives the router a place to run route guards before commit, so the browser can stay on the old URL until the guard passes or redirects.

Example:

```text
User clicks /admin
→ route precommit checks auth
→ redirect to /signin
→ /admin never appears in the address bar
```

## Design Goals

1. Add a simple route-level precommit API
2. Keep redirect/rematch behavior deterministic
3. Preserve existing post-commit action/loader behavior
4. Avoid raw `event.intercept()` composition through `onNavigate`

## Non-Goals for V1

- app-wide precommit hooks on `<Router>`
- precommit data loading
- built-in view transition APIs
- arbitrary external redirects from route `precommit`

## Proposed API

### Route-level `precommit`

```typescript
route({
  path: "/admin/settings",
  precommit: ({ params, signal, redirect, url }) => {
    if (!isAdmin()) {
      redirect("/signin", { replace: true });
      return;
    }
  },
  loader: async ({ params }) => fetchSettings(params),
  component: AdminSettings,
});
```

```typescript
type PrecommitArgs<Params extends Record<string, string>> = {
  params: Params;
  signal: AbortSignal;
  url: URL;
  redirect: (
    url: string,
    options?: {
      replace?: boolean;
      state?: unknown;
    },
  ) => void;
};
```

### Semantics

- matched route `precommit` handlers run **parent → child**
- handlers may be async, but synchronous checks are preferred
- if a handler calls `redirect()`, remaining child handlers are skipped
- the router then re-matches the redirect target and runs the new stack's `precommit` handlers
- if a redirect target is not handled by the router, the navigation is cancelled
- if the redirect chain exceeds the limit, the navigation is cancelled
- if all precommit handlers pass, the navigation commits and existing post-commit logic continues

`redirect()` is for **internal route-to-route redirects only**.

## Why the Lifecycle Must Stay Router-Owned

V1 should not recommend calling `event.intercept({ precommitHandler })` inside `onNavigate`.

That composition is possible at the raw Navigation API level, but it makes redirect/rematch behavior harder to reason about. In particular, route-level guarantees become unclear once multiple independently-registered precommit handlers can redirect before the router's own precommit pass runs.

So in v1:

- `onNavigate` may still observe navigations
- `onNavigate` may still call `event.preventDefault()`
- `onNavigate` is **not** the extension point for precommit composition

If app-wide precommit is needed later, it should be added as a dedicated router API and participate in the same router-owned pipeline.

## Execution Model

For an intercepted navigation:

```text
navigate event
→ blockers
→ onNavigate
→ router event.intercept({ precommitHandler, handler })
→ route precommit pipeline
→ commit
→ existing handler (actions/loaders)
```

### Nested routes

Parent and child `precommit` handlers both run.

```typescript
route({
  path: "/app",
  precommit: ({ redirect }) => {
    if (!isAuthenticated()) redirect("/signin");
  },
  children: [
    route({
      path: "admin",
      precommit: ({ redirect }) => {
        if (!isAdmin()) redirect("/app/unauthorized");
      },
      component: AdminPanel,
    }),
  ],
});
```

Behavior:

- unauthenticated user navigating to `/app/admin` is redirected by the parent
- authenticated non-admin user reaches the child guard and is redirected there

## Implementation Outline

### Type changes

- [packages/router/src/navigation-api.d.ts](packages/router/src/navigation-api.d.ts): add `NavigationPrecommitController` and update `NavigationInterceptOptions`
- [packages/router/src/types.ts](packages/router/src/types.ts): add `PrecommitArgs` and `precommit` to `InternalRouteDefinition`
- [packages/router/src/route.ts](packages/router/src/route.ts): add `precommit` to `route()` / `routeState()` definitions
- [packages/router/src/index.ts](packages/router/src/index.ts): export `PrecommitArgs`

### Adapter changes

Update [packages/router/src/core/NavigationAPIAdapter.ts](packages/router/src/core/NavigationAPIAdapter.ts) so the router:

1. matches the destination
2. installs `precommitHandler` only when needed and supported
3. runs matched route `precommit` handlers sequentially
4. applies redirects through `NavigationPrecommitController.redirect()`
5. re-matches after each redirect
6. cancels on unmatched redirect target or redirect-loop exhaustion
7. runs existing action/loader logic after commit against the final URL

Minimal pseudocode:

```typescript
precommitHandler: async (controller) => {
  let currentUrl = url;
  let currentMatched = matched;

  for (let i = 0; i < MAX_REDIRECTS; i++) {
    let redirectTarget: RedirectTarget | null = null;

    for (const match of currentMatched) {
      await match.route.precommit?.({
        params: match.params,
        signal: event.signal,
        url: currentUrl,
        redirect: (url, options) => {
          redirectTarget = { url, options };
        },
      });

      if (redirectTarget) break;
    }

    if (!redirectTarget) return;

    controller.redirect(redirectTarget.url, {
      history: redirectTarget.options?.replace ? "replace" : "auto",
      state: redirectTarget.options?.state,
    });

    currentUrl = new URL(redirectTarget.url, currentUrl);
    currentMatched = matchRoutes(routes, currentUrl.pathname);
    if (!currentMatched) {
      throw new Error("Precommit redirect target is not handled by the router");
    }
  }

  throw new Error("Precommit redirect loop exceeded the maximum redirect limit");
};
```

### Browser support fallback

`precommitHandler` is not universally supported yet. If installing it throws, the router should fall back to plain `handler` interception and skip route `precommit` behavior.

## Interaction with Existing Features

### `useBlocker`

Blockers run first. If a blocker prevents navigation, precommit does not run.

### `onNavigate`

`onNavigate` still runs before interception and may call `event.preventDefault()`, but it is not used to register additional precommit handlers in v1.

### Loaders and actions

Loaders and actions remain post-commit:

```text
precommit → commit → action/loader handler
```

### `isPending`

The precommit phase is invisible to the React tree. `isPending` still flips when commit triggers `currententrychange`, not while precommit is running.

### SSR / fallback adapters

No change. Precommit is client-side Navigation API behavior only.

## Edge Cases

- non-cancelable navigation: skip route `precommit`
- unsupported browser: skip route `precommit`
- thrown/rejected precommit: cancel navigation
- unmatched redirect target: cancel navigation
- redirect loop: cancel navigation
- redirected destination with its own `precommit`: re-match and run it
- form submission: precommit runs before action

## Tests

Add focused coverage for:

1. precommit runs before commit
2. parent → child execution order
3. parent redirect skips child
4. redirect chain re-matching
5. redirected route receives new params
6. redirect `{ replace, state }` is applied
7. thrown precommit cancels navigation
8. unmatched redirect target cancels navigation
9. redirect loop cancels navigation
10. async precommit is awaited
11. non-cancelable events omit `precommitHandler`
12. browsers without support fall back cleanly
13. loaders run post-commit against the final URL

The test mock in [packages/router/src/**tests**/setup.ts](packages/router/src/__tests__/setup.ts) should model precommit as part of one router-owned interception flow.

## Future Work

Possible follow-ups:

- app-wide router `precommit` API
- precommit loader execution
- view-transition integration

## Files to Change

- [packages/router/src/navigation-api.d.ts](packages/router/src/navigation-api.d.ts)
- [packages/router/src/types.ts](packages/router/src/types.ts)
- [packages/router/src/route.ts](packages/router/src/route.ts)
- [packages/router/src/core/NavigationAPIAdapter.ts](packages/router/src/core/NavigationAPIAdapter.ts)
- [packages/router/src/index.ts](packages/router/src/index.ts)
- [packages/router/src/**tests**/setup.ts](packages/router/src/__tests__/setup.ts)
- [packages/router/src/**tests**/precommit.test.tsx](packages/router/src/__tests__/precommit.test.tsx)
