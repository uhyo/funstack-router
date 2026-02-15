# Form Submission Interception Design Document

## Overview

This document describes the design for intercepting and handling HTML form submissions (POST navigations) in FUNSTACK Router. The Navigation API fires a `navigate` event for form submissions just like any other navigation, exposing submitted form data via `NavigateEvent.formData`. The router currently intercepts these navigations but ignores the form data entirely. This feature adds first-class support for handling form submissions within the router.

## Goals

1. **Route-level actions**: Allow routes to define `action` functions that handle form submissions, mirroring the existing `loader` pattern
2. **Type safety**: Provide typed `ActionArgs` and typed action data access via hooks, consistent with the existing `LoaderArgs` / `useRouteData` pattern
3. **Loader revalidation**: Automatically re-run loaders after an action completes, so the UI reflects server-side changes
4. **Progressive enhancement friendly**: Provide a `<Form>` component that submits via the Navigation API in SPA mode and falls back to native form submission when the Navigation API is unavailable

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
  id: "createUser",
  path: "users/new",
  loader: async ({ params, signal }) => {
    return fetchFormOptions(signal);
  },
  action: async ({ request, params, signal }) => {
    const formData = await request.formData();
    const result = await createUser(formData, signal);
    return result;
  },
  component: CreateUserPage,
});
```

**Key distinction from loaders:**

- Loaders handle GET navigations and their results are cached per history entry
- Actions handle POST form submissions and their results are **never cached**

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

### 3. Action Execution Flow

When a navigation event has `formData !== null` and the matched route has an `action`:

1. The router detects `event.formData !== null` in `handleNavigate`
2. Inside `event.intercept()`, the router constructs a POST `Request` with the form data
3. The action is executed (not cached)
4. After the action completes, loaders for the matched routes are **revalidated** (cache entries cleared and loaders re-executed)
5. The action result and refreshed loader data are made available to the component

```
[Form Submit] → [Navigate Event] → [Match Routes] → [Execute Action]
    → [Revalidate Loaders] → [Update UI with action result + fresh data]
```

### 4. NavigationAPIAdapter Changes

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

      if (isFormSubmission) {
        // Find the deepest matched route with an action
        const actionRoute = findActionRoute(matched);
        if (actionRoute) {
          const actionRequest = createActionRequest(url, event.formData!);
          const actionResult = await actionRoute.route.action({
            params: actionRoute.params,
            request: actionRequest,
            signal: event.signal,
          });
          // Store action result (see Section 6)
          storeActionResult(currentEntry.id, actionResult);
        }
        // Revalidate loaders after action
        clearLoaderCacheForEntry(currentEntry.id);
      }

      // Execute loaders (either fresh run or from cache)
      const request = createLoaderRequest(url);
      const results = executeLoaders(
        matched,
        currentEntry.id,
        request,
        event.signal,
      );
      await Promise.all(results.map((r) => r.data));
    },
  });
};
```

### 5. Route Definition Types

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
type RouteWithAction<
  TPath extends string,
  TActionData,
  TData,
  TState,
  TId extends string | undefined = undefined,
> = {
  id?: TId;
  path: TPath;
  action: (args: ActionArgs<PathParams<TPath>>) => TActionData;
  loader?: (args: LoaderArgs<PathParams<TPath>>) => TData;
  component:
    | ComponentType<
        RouteComponentPropsWithAction<
          PathParams<TPath>,
          TActionData,
          TData,
          TState
        >
      >
    | ReactNode;
  children?: RouteDefinition[];
  exact?: boolean;
  requireChildren?: boolean;
};
```

#### TypefulOpaqueRouteDefinition Extension

Add an `ActionData` type parameter:

```typescript
export interface TypefulOpaqueRouteDefinition<
  Id extends string,
  Params extends Record<string, string>,
  State,
  Data,
  ActionData = undefined,
> {
  [routeDefinitionSymbol]: {
    id: Id;
    params: Params;
    state: State;
    data: Data;
    actionData: ActionData;
  };
  // ... existing fields ...
}
```

Note: the new `ActionData` type parameter defaults to `undefined`, so this is backwards compatible with existing route definitions.

### 6. Action Result Storage

Unlike loader data which is cached per history entry, action results are **ephemeral** — they exist for the current render cycle after a form submission and are cleared on the next navigation.

#### Approach: Ephemeral action result store

```typescript
// Simple in-memory store, not tied to history entries
let currentActionResult: { entryId: string; data: unknown } | null = null;

function storeActionResult(entryId: string, data: unknown): void {
  currentActionResult = { entryId, data };
}

function getActionResult(entryId: string): unknown | undefined {
  if (currentActionResult?.entryId === entryId) {
    return currentActionResult.data;
  }
  return undefined;
}

function clearActionResult(): void {
  currentActionResult = null;
}
```

Action results are cleared when the user navigates away from the page (i.e., on the next non-form-submission navigation). This prevents stale action data from appearing when the user navigates back.

### 7. Component Props

A new props interface extends the existing ones with `actionData`:

```typescript
export interface RouteComponentPropsWithAction<
  TParams extends Record<string, string>,
  TActionData,
  TData,
  TState = undefined,
> extends RouteComponentPropsWithData<TParams, TData, TState> {
  /** Data returned from the action (undefined if no form was submitted) */
  actionData: TActionData | undefined;
}
```

When no action has been submitted, `actionData` is `undefined`. After a form submission, it contains the action's return value.

### 8. Hooks

#### `useActionData`

A type-safe hook for accessing action data, following the same pattern as `useRouteData`:

```typescript
export function useActionData<
  T extends TypefulOpaqueRouteDefinition<
    string,
    Record<string, string>,
    unknown,
    unknown,
    unknown
  >,
>(route: T): ExtractRouteActionData<T> | undefined {
  // Look up route context by id, return action data
}
```

Usage:

```typescript
const createUserRoute = route({
  id: "createUser",
  path: "users/new",
  action: async ({ request }) => {
    const formData = await request.formData();
    return createUser(formData);
  },
  component: CreateUserPage,
});

// In a component:
function CreateUserPage() {
  const actionData = useActionData(createUserRoute);
  // actionData is typed as the return type of the action, or undefined
}
```

### 9. `<Form>` Component

A `<Form>` component that integrates with the router:

```typescript
export function Form({
  action,
  method = "post",
  children,
  onSubmit,
  ...rest
}: FormProps): ReactNode {
  return (
    <form action={action} method={method} onSubmit={onSubmit} {...rest}>
      {children}
    </form>
  );
}

export type FormProps = React.FormHTMLAttributes<HTMLFormElement> & {
  /** Target URL. Defaults to the current URL. */
  action?: string;
  /** HTTP method. Defaults to "post". */
  method?: "get" | "post";
};
```

When the Navigation API is available, the browser fires a `navigate` event for form submissions, which the router intercepts. No special JavaScript is needed — a standard `<form>` element works. The `<Form>` component's main value is:

1. **Defaults**: `method="post"` and `action` defaults to current URL
2. **Future extensibility**: Potential for `navigate` options (e.g., `replace`, `info`), submission state tracking, etc.

Native `<form>` elements work identically with the router's interception. `<Form>` is a convenience, not a requirement.

### 10. Handling Routes Without Actions

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

### 11. GET Form Submissions

GET form submissions encode data in the URL query string. The Navigation API does **not** set `event.formData` for GET submissions — they are indistinguishable from normal navigations at the API level.

The router already handles these correctly: it intercepts the navigation, matches the route based on the destination URL (which includes the query string), and runs loaders. The query parameters are accessible via `useSearchParams()` or through the `request.url` in loaders.

No special handling is needed for GET form submissions.

### 12. Action Target Resolution

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

### 13. `onNavigate` Callback Extension

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

### Action Errors

When an action throws, the error should be surfaced to the component rather than silently swallowed. Two approaches:

1. **Let it propagate**: The error propagates through the `event.intercept()` handler, and the navigation fails. The browser stays on the current page. This is the simplest approach but gives the component no chance to render error UI.

2. **Catch and store as action result**: Catch the error, store it as the action result, and let the component decide how to render it. This requires a convention for distinguishing success from error in `actionData`.

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

Whether to support a `redirect()` helper as a first-class concept is deferred to implementation. The user can always call `navigate()` after the action completes, or handle it in the component based on `actionData`.

### Action Caching

Actions are **never cached**. Each form submission executes the action fresh. This is fundamentally different from loaders, which are cached by history entry ID. The `loaderCache` module is not used for actions.

### Revalidation Scope

After an action completes, which loaders should revalidate?

**Option A (Recommended): Revalidate all matched route loaders**

Clear the loader cache for the current entry and re-execute all loaders in the matched route stack. This is simple and safe.

**Option B: Selective revalidation**

Allow actions to declare which routes need revalidation. This is more efficient but adds complexity.

Start with Option A. Selective revalidation can be added later as an optimization.

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

Actions are a client-side concept in this router. During SSR (when `pathname === null`), no action execution occurs. The `actionData` prop is always `undefined` during SSR.

## API Summary

### Route Definition

```typescript
// Route with action only
route({
  id: "createUser",
  path: "users/new",
  action: async ({ request, params, signal }) => {
    const formData = await request.formData();
    return createUser(formData, signal);
  },
  component: CreateUserPage,
});

// Route with both loader and action
route({
  id: "editUser",
  path: "users/:userId/edit",
  loader: async ({ params, signal }) => fetchUser(params.userId, signal),
  action: async ({ request, params, signal }) => {
    const formData = await request.formData();
    return updateUser(params.userId, formData, signal);
  },
  component: EditUserPage,
});
```

### Component Usage

```typescript
function EditUserPage({
  data,       // from loader
  actionData, // from action (undefined until form is submitted)
  params,
  isPending,
}: RouteComponentPropsOf<typeof editUserRoute>) {
  return (
    <form method="post">
      {actionData?.error && <p className="error">{actionData.error}</p>}
      <input name="name" defaultValue={data.name} />
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

### Hooks

```typescript
// Type-safe action data access
const actionData = useActionData(editUserRoute);
```

## Migration Path

This is an additive, non-breaking change:

1. Existing routes without `action` continue to work identically
2. POST form submissions to routes without `action` are no longer intercepted (behavior change, but the previous behavior was silently discarding form data, which was a bug)
3. New routes can opt into action handling by adding an `action` field
4. The `<Form>` component is optional — native `<form>` elements work

## Implementation Order

1. **`ActionArgs` type and `createActionRequest` helper** — foundation types
2. **`InternalRouteDefinition` and route definition types** — add `action` field
3. **`route()` helper overloads** — new overloads for routes with action
4. **`NavigationAPIAdapter.setupInterception()`** — detect `formData`, execute action, revalidate loaders
5. **Action result storage** — ephemeral store for action results
6. **Component props injection** — pass `actionData` to components
7. **`useActionData` hook** — type-safe hook
8. **`<Form>` component** — convenience wrapper
9. **Tests** — action execution, revalidation, error handling, concurrent submissions
10. **`onNavigate` info extension** — add `formData` to `OnNavigateInfo`

## References

- [NavigateEvent.formData - MDN](https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent/formData)
- [NavigateEvent.intercept() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent/intercept)
- [Navigation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
