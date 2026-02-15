# Form Submission Interception Design Document

## Overview

This document describes the design for intercepting and handling HTML form submissions (POST navigations) in FUNSTACK Router. The Navigation API fires a `navigate` event for form submissions just like any other navigation, exposing submitted form data via `NavigateEvent.formData`. The router currently intercepts these navigations but ignores the form data entirely. This feature adds first-class support for handling form submissions within the router.

## Goals

1. **Route-level actions**: Allow routes to define `action` functions that handle form submissions, mirroring the existing `loader` pattern
2. **Action results flow through loaders**: After an action completes, its return value is passed to the loader as a parameter, keeping the loader as the single source of truth for component data
3. **Loader revalidation**: Automatically re-run loaders after an action completes, so the UI reflects server-side changes
4. **Works with native `<form>`**: No wrapper component needed — the Navigation API fires `navigate` events for standard `<form>` submissions, which the router intercepts

## Background: Navigation API and Form Submissions

When a user submits an `<form>`, the browser fires a `navigate` event on `window.navigation`. The `NavigateEvent` exposes:

- `event.formData` — a `FormData` object for POST submissions, or `null` for everything else (including GET form submissions, which encode data in the URL query string)
- `event.destination.url` — the form's `action` URL
- `event.canIntercept` — `true` for same-origin submissions
- `event.navigationType` — typically `"push"` (no special value for form submissions)

Calling `event.intercept()` converts the form submission into a same-document navigation. The form data is **not** sent to the server automatically — the intercept handler must do that explicitly (e.g. via `fetch()`).

### Current Behavior

The router's `NavigationAPIAdapter.setupInterception()` intercepts all matched navigations regardless of whether `event.formData` is present. The interception handler creates a GET `Request` via `createLoaderRequest()` and runs loaders. The form data payload is silently discarded.

## Design

### 1. Route Definition with Action

Add an `action` field to route definitions alongside the existing `loader`:

```typescript
route({
  id: "editUser",
  path: "users/:userId/edit",
  action: async ({ request, params, signal }) => {
    const formData = await request.formData();
    return updateUser(params.userId, formData, signal);
  },
  loader: async ({ params, signal, actionResult }) => {
    // actionResult is the return value of the action (undefined on normal navigation)
    const user = await fetchUser(params.userId, signal);
    return {
      user,
      // Include the action result in loader data so the component can display it
      updateResult: actionResult ?? null,
    };
  },
  component: EditUserPage,
});
```

**Key distinction from loaders:**

- Loaders handle GET navigations and their results are cached per history entry
- Actions handle POST form submissions and their results are **never cached**
- After an action completes, its return value is passed to the loader via `actionResult`

### 2. ActionArgs Type

`ActionArgs` mirrors `LoaderArgs` but its `request` carries the POST method and `FormData` body:

```typescript
export type ActionArgs<Params extends Record<string, string>> = {
  /** Extracted path parameters */
  params: Params;
  /** Request object with method POST and FormData body */
  request: Request;
  /** AbortSignal for cancellation */
  signal: AbortSignal;
};
```

The `request` is constructed from the navigate event:

```typescript
function createActionRequest(url: URL, formData: FormData): Request {
  return new Request(url.href, {
    method: "POST",
    body: formData,
  });
}
```

This follows the same convention as `createLoaderRequest`, but with `method: "POST"` and the form data as the body. Actions that need the raw `FormData` can call `request.formData()`. Actions that don't need it can ignore the body entirely.

### 3. LoaderArgs Extension

Add an optional `actionResult` field to `LoaderArgs`:

```typescript
export type LoaderArgs<
  Params extends Record<string, string>,
  ActionResult = undefined,
> = {
  /** Extracted path parameters */
  params: Params;
  /** Request object with URL and headers */
  request: Request;
  /** AbortSignal for cancellation on navigation */
  signal: AbortSignal;
  /** Result from the action, if this load was triggered by a form submission */
  actionResult: ActionResult | undefined;
};
```

On normal navigations (GET, traversal), `actionResult` is `undefined`. After a form submission, it contains the action's return value.

The `ActionResult` type parameter defaults to `undefined` for backwards compatibility — existing loaders that don't use `actionResult` are unaffected.

### 4. Action Execution Flow

When a navigation event has `formData !== null` and the matched route has an `action`:

1. The router detects `event.formData !== null` in `handleNavigate`
2. Inside `event.intercept()`, the router constructs a POST `Request` with the form data
3. The action is executed (not cached)
4. The action result is passed to the loader via `actionResult`
5. Loaders for the matched routes are **revalidated** (cache entries cleared and loaders re-executed with the action result)
6. The loader returns data that incorporates the action result as needed

```
[Form Submit] → [Navigate Event] → [Match Routes] → [Execute Action]
    → [Pass actionResult to Loader] → [Loader returns merged data] → [Component renders via data prop]
```

### 5. NavigationAPIAdapter Changes

The `handleNavigate` function needs to differentiate between regular navigations and form submissions:

```typescript
const handleNavigate = (event: NavigateEvent) => {
  // ... existing blocker, canIntercept, and route matching checks ...

  const isFormSubmission = event.formData !== null;

  // Compute whether we will intercept
  const willIntercept =
    matched !== null && !event.hashChange && event.downloadRequest === null;

  // ... existing onNavigate callback ...

  if (!willIntercept) return;

  event.intercept({
    handler: async () => {
      const currentEntry = navigation.currentEntry;
      if (!currentEntry) {
        throw new Error("...");
      }

      let actionResult: unknown = undefined;

      if (isFormSubmission) {
        // Find the deepest matched route with an action
        const actionRoute = findActionRoute(matched);
        if (actionRoute) {
          const actionRequest = createActionRequest(url, event.formData!);
          actionResult = await actionRoute.route.action({
            params: actionRoute.params,
            request: actionRequest,
            signal: event.signal,
          });
        }
        // Revalidate loaders after action
        clearLoaderCacheForEntry(currentEntry.id);
      }

      // Execute loaders (either fresh run or from cache)
      // actionResult is passed through so loaders can incorporate it
      const request = createLoaderRequest(url);
      const results = executeLoaders(
        matched,
        currentEntry.id,
        request,
        event.signal,
        actionResult,
      );
      await Promise.all(results.map((r) => r.data));
    },
  });
};
```

### 6. Loader Cache Changes

The `executeLoaders` function needs to pass `actionResult` through to loaders:

```typescript
export function executeLoaders(
  matchedRoutes: MatchedRoute[],
  entryId: string,
  request: Request,
  signal: AbortSignal,
  actionResult?: unknown,
): MatchedRouteWithData[] {
  return matchedRoutes.map((match, index) => {
    const { route, params } = match;
    const args: LoaderArgs<Record<string, string>> = {
      params,
      request,
      signal,
      actionResult,
    };
    const data = getOrCreateLoaderResult(entryId, index, route, args);
    return { ...match, data };
  });
}
```

Since loader results are cached by entry ID and the cache is cleared after an action (`clearLoaderCacheForEntry`), the loader will always re-execute after an action and receive the `actionResult`. On subsequent renders from cache, the loader is not re-executed, so `actionResult` is irrelevant — the cached result already incorporates it.

### 7. Route Definition Types

#### Internal Route Definition Extension

Add `action` to `InternalRouteDefinition`:

```typescript
export type InternalRouteDefinition = {
  // ... existing fields ...
  action?: (args: ActionArgs<Record<string, string>>) => unknown;
};
```

#### Public Route Definition Types

New route definition types that include action:

```typescript
type RouteWithActionAndLoader<
  TPath extends string,
  TActionResult,
  TData,
  TState,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path: TPath;
  action: (args: ActionArgs<PathParams<TPath>>) => TActionResult;
  loader: (
    args: LoaderArgs<PathParams<TPath>, Awaited<TActionResult>>,
  ) => TData;
  component:
    | ComponentType<
        RouteComponentPropsWithData<PathParams<TPath>, TData, TState>
      >
    | ReactNode;
  children?: RouteDefinition[];
  exact?: boolean;
  requireChildren?: boolean;
};

type RouteWithActionOnly<
  TPath extends string,
  TState,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path: TPath;
  action: (args: ActionArgs<PathParams<TPath>>) => unknown;
  component?:
    | ComponentType<RouteComponentProps<PathParams<TPath>, TState>>
    | ReactNode;
  children?: RouteDefinition[];
  exact?: boolean;
  requireChildren?: boolean;
};
```

Note: `TypefulOpaqueRouteDefinition` does **not** need an `ActionData` type parameter. The action result type is captured in the loader's `actionResult` parameter and flows into the loader's return type (`Data`). The component only sees `data`, which already has full type information.

### 8. Handling Routes Without Actions

When a POST form submission matches a route that has no `action` defined, the router has two reasonable options:

**Option A (Recommended): Do not intercept**

Let the browser handle it as a normal form submission (full page navigation to the server). This is the safest default — if a route didn't declare an action, it likely expects server-side handling.

```typescript
// In handleNavigate:
if (isFormSubmission) {
  const hasAction = matched.some((m) => m.route.action);
  if (!hasAction) {
    // Don't intercept — let browser submit the form normally
    return;
  }
}
```

**Option B: Intercept and ignore the form data**

Intercept as a normal navigation (current behavior). The form data is lost, but loaders run. This could be surprising.

Option A is recommended because it avoids silently discarding form data.

### 9. GET Form Submissions

GET form submissions encode data in the URL query string. The Navigation API does **not** set `event.formData` for GET submissions — they are indistinguishable from normal navigations at the API level.

The router already handles these correctly: it intercepts the navigation, matches the route based on the destination URL (which includes the query string), and runs loaders. The query parameters are accessible via `useSearchParams()` or through the `request.url` in loaders.

No special handling is needed for GET form submissions.

### 10. Action Target Resolution

When a form is submitted, which route's action should execute? The rule:

**The deepest matched route with an `action` defined handles the submission.**

This mirrors how Remix resolves actions. In a nested route structure, the leaf route's action takes priority:

```typescript
// Route structure:
// /users        → LayoutRoute (has action)
// /users/new    → CreateUserRoute (has action)

// Form submitted to /users/new:
// CreateUserRoute.action is called (deepest match with action)
```

```typescript
function findActionRoute(matched: MatchedRoute[]): MatchedRoute | undefined {
  // Iterate from deepest to shallowest
  for (let i = matched.length - 1; i >= 0; i--) {
    if (matched[i].route.action) {
      return matched[i];
    }
  }
  return undefined;
}
```

### 11. `onNavigate` Callback Extension

The existing `OnNavigateInfo` type should be extended to indicate form submissions:

```typescript
export type OnNavigateInfo = {
  matches: readonly MatchedRoute[] | null;
  intercepting: boolean;
  /** FormData from the NavigateEvent, or null for non-POST navigations */
  formData: FormData | null;
};
```

This allows users to inspect or prevent form submission interception via the `onNavigate` callback:

```typescript
<Router
  routes={routes}
  onNavigate={(event, info) => {
    if (info.formData) {
      console.log("Form submission to:", event.destination.url);
      // Optionally prevent interception:
      // event.preventDefault();
    }
  }}
/>
```

## Considerations

### History Traversals and Form Data

The Navigation API does **not** store or replay form data in the history. When the user navigates back/forward to a history entry that was originally created by a POST form submission, the `navigate` event fires with `navigationType: "traverse"` and `formData: null`.

This means:

- Back/forward to a "post result" page runs **loaders only** — the action is never re-executed
- The loader receives `actionResult: undefined` on traversals, just like on normal GET navigations
- This naturally avoids the "resubmit form?" problem that plagues traditional MPAs
- If a component needs to display action-related data after a traversal, the loader should fetch it from the server (where the action persisted it)

No special handling is needed — `formData: null` on traversals means the existing loader-only code path runs.

### Action Errors

When an action throws, the error should be surfaced to the component rather than silently swallowed. Two approaches:

1. **Let it propagate**: The error propagates through the `event.intercept()` handler, and the navigation fails. The browser stays on the current page. This is the simplest approach but gives the component no chance to render error UI.

2. **Catch and pass to loader**: Catch the error and pass it as `actionResult` so the loader can incorporate error information into its return value.

**Recommendation**: Start with approach 1 (let errors propagate). Add error boundaries or a structured error mechanism in a future iteration. The `onNavigate` callback provides an escape hatch for custom error handling.

### Action Results and History

POST form submissions that create new resources traditionally use the Post/Redirect/Get pattern to prevent "resubmit form?" dialogs on back navigation. Within the router, actions can trigger a client-side redirect:

```typescript
action: async ({ request, params, signal }) => {
  const formData = await request.formData();
  const user = await createUser(formData, signal);
  // Action can return a redirect instruction
  return redirect(`/users/${user.id}`);
};
```

Whether to support a `redirect()` helper as a first-class concept is deferred to implementation. The user can always call `navigate()` after the action completes, or handle the redirect in the loader based on `actionResult`.

### Action Caching

Actions are **never cached**. Each form submission executes the action fresh. This is fundamentally different from loaders, which are cached by history entry ID. The `loaderCache` module is not used for actions.

### Revalidation Scope

After an action completes, which loaders should revalidate?

**Option A (Recommended): Revalidate all matched route loaders**

Clear the loader cache for the current entry and re-execute all loaders in the matched route stack. This is simple and safe. All loaders receive the same `actionResult` — loaders that don't care about it simply ignore the parameter.

**Option B: Selective revalidation**

Allow actions to declare which routes need revalidation. This is more efficient but adds complexity.

Start with Option A. Selective revalidation can be added later as an optimization.

### Routes with Action but No Loader

A route can define an `action` without a `loader`. In this case, the action executes as a pure side effect (e.g., sending data to a server). The action result has nowhere to flow, and that's fine — the component doesn't need to see it. The action's purpose is the server-side mutation, and subsequent navigations will pick up the changed data through their own loaders.

### StaticAdapter and NullAdapter

These adapters do not support navigation interception and therefore cannot handle form submissions. When the Navigation API is unavailable:

- **StaticAdapter**: Forms submit normally (full page navigation). This is correct MPA behavior.
- **NullAdapter**: Forms submit normally. No special handling needed.

No changes are needed to these adapters.

### Pending State During Actions

The existing `isPending` state (from `useTransition`) applies to actions as well. While an action + subsequent loader revalidation is in progress, `isPending` is `true`. This lets components show loading indicators during form submission.

### Concurrent Submissions

If a user submits a form while a previous action is still in progress, the Navigation API's `event.signal` aborts the previous navigation. The router should rely on this built-in mechanism — the previous action's `signal` will be aborted, and the new action takes over.

### SSR

Actions are a client-side concept in this router. During SSR (when `pathname === null`), no action execution occurs. Loaders always receive `actionResult: undefined` during SSR.

## API Summary

### Route Definition

```typescript
// Route with action and loader — action result flows to loader
route({
  id: "editUser",
  path: "users/:userId/edit",
  action: async ({ request, params, signal }) => {
    const formData = await request.formData();
    return updateUser(params.userId, formData, signal);
  },
  loader: async ({ params, signal, actionResult }) => {
    const user = await fetchUser(params.userId, signal);
    return {
      user,
      updateResult: actionResult ?? null,
    };
  },
  component: EditUserPage,
});

// Route with action only — pure side effect, no data for component
route({
  path: "users/:userId/delete",
  action: async ({ request, params, signal }) => {
    await deleteUser(params.userId, signal);
  },
  component: DeleteConfirmation,
});
```

### Component Usage

```typescript
function EditUserPage({
  data,   // { user, updateResult } — from loader, includes action result
  params,
  isPending,
}: RouteComponentPropsOf<typeof editUserRoute>) {
  return (
    <form method="post">
      {data.updateResult?.error && (
        <p className="error">{data.updateResult.error}</p>
      )}
      <input name="name" defaultValue={data.user.name} />
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

## Migration Path

This is an additive, non-breaking change:

1. Existing routes without `action` continue to work identically
2. Existing loaders receive `actionResult: undefined` — no behavior change since the parameter is optional
3. POST form submissions to routes without `action` are no longer intercepted (behavior change, but the previous behavior was silently discarding form data, which was a bug)
4. New routes can opt into action handling by adding an `action` field
5. Native `<form>` elements work out of the box — no wrapper component needed

## Implementation Order

1. **`ActionArgs` type and `createActionRequest` helper** — foundation types
2. **`LoaderArgs` extension** — add optional `actionResult` parameter
3. **`InternalRouteDefinition` and route definition types** — add `action` field
4. **`route()` helper overloads** — new overloads for routes with action
5. **`executeLoaders` and `loaderCache`** — pass `actionResult` through to loaders
6. **`NavigationAPIAdapter.setupInterception()`** — detect `formData`, execute action, revalidate loaders
7. **Tests** — action execution, revalidation, actionResult in loaders, error handling, concurrent submissions
8. **`onNavigate` info extension** — add `formData` to `OnNavigateInfo`

## References

- [NavigateEvent.formData - MDN](https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent/formData)
- [NavigateEvent.intercept() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent/intercept)
- [Navigation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
