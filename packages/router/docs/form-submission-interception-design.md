# Form Submission Interception Design Document

## Overview

The Navigation API fires a `navigate` event for HTML `<form>` submissions, just as it does for link clicks and programmatic navigations. POST form submissions are distinguished by a non-null `event.formData` property. FUNSTACK Router currently ignores this property and does not intercept POST navigations. This design adds support for intercepting form submissions by introducing **action functions** on route definitions, analogous to the existing `loader` functions.

Loaders are for reading data (GET). Actions are for writing data (POST).

## Design Goals

1. **Symmetric with loaders** - Actions mirror the loader API (`{ params, request, signal }`) so users have one mental model for data flow
2. **Type-safe** - Action return types flow through to component props, just like loader data
3. **Progressive enhancement** - Standard `<form method="post" action="/path">` elements work out of the box; no special components required
4. **Automatic revalidation** - Loaders re-run after an action completes, since the action may have mutated server-side state
5. **No new caching semantics** - Actions are never cached; they run once per form submission

## Navigation API Background

When a `<form method="post">` is submitted, the browser fires a `navigate` event with these relevant properties:

| Property                | Value for POST form        |
| ----------------------- | -------------------------- |
| `event.formData`        | Non-null `FormData` object |
| `event.destination.url` | The form's `action` URL    |
| `event.navigationType`  | `"push"`                   |
| `event.canIntercept`    | `true` (if same-origin)    |

Key distinctions:

- **POST form submissions**: `event.formData` is a `FormData` object. The submitted data lives in this object.
- **GET form submissions**: `event.formData` is `null`. The form data is encoded into `event.destination.url` as query parameters. These are indistinguishable from normal link navigations and are already handled correctly by the existing router.
- **`navigation.navigate()`** does not support POST. POST form data only enters the Navigation API through actual `<form>` submissions (or `form.requestSubmit()`).

## API Design

### Route Definition

A new optional `action` field is added to route definitions:

```typescript
route({
  path: "contacts/:contactId/edit",
  action: async ({ params, request, signal }) => {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const result = await fetch(`/api/contacts/${params.contactId}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
      signal,
    });
    return result.json();
  },
  loader: async ({ params, signal }) => {
    const res = await fetch(`/api/contacts/${params.contactId}`, { signal });
    return res.json();
  },
  component: EditContact,
});
```

Actions and loaders can be defined independently:

- Route with both `action` and `loader`: action handles POST, loader handles GET, component receives both
- Route with only `action`: action handles POST, no loader data
- Route with only `loader`: current behavior unchanged; POST navigations are **not intercepted** for this route

### ActionArgs Type

```typescript
/**
 * Arguments passed to action functions.
 * Same shape as LoaderArgs. The request has method "POST" and a FormData body.
 */
export type ActionArgs<Params extends Record<string, string>> = {
  /** Extracted path parameters */
  params: Params;
  /** Request object with method POST and FormData body */
  request: Request;
  /** AbortSignal that aborts if a new navigation occurs */
  signal: AbortSignal;
};
```

`ActionArgs` is intentionally the same shape as `LoaderArgs`. The difference is semantic: the `request.method` is `"POST"` and the body contains the submitted `FormData`. A shared type alias could be used, but separate types make the API more self-documenting.

### Component Props

A new `actionData` prop is passed to route components when the route has an action:

```typescript
/**
 * Props for route components with action and loader.
 */
interface RouteComponentPropsWithAction<TParams, TData, TActionData, TState> {
  params: TParams;
  data: TData;                        // from loader
  actionData: TActionData | undefined; // from action (undefined on GET navigations)
  state: TState | undefined;
  setState: ...;
  setStateSync: ...;
  resetState: ...;
  resetStateSync: ...;
  info: unknown;
  isPending: boolean;
}
```

`actionData` is `undefined` when:

- The current navigation was a GET (normal navigation)
- The route has no action defined
- The user navigated back/forward to a page that was originally reached via POST (action results are not persisted in history)

### `useActionData` Hook

For components that need to access action data without receiving it as props (e.g., child components, or when using ReactNode-style route components):

```typescript
function useActionData<T = unknown>(): T | undefined;
```

This reads from `RouteContext`, similar to `useRouteData()`.

### `route()` Helper Overloads

New overloads are added to the `route()` and `routeState()` helper functions to support the `action` field with full type inference:

```typescript
// Route with action + loader
route({
  path: "users/:id",
  action: async ({ params, request }) => { ... },   // ActionArgs<{ id: string }>
  loader: async ({ params, signal }) => { ... },     // LoaderArgs<{ id: string }>
  component: UserPage, // Receives { data, actionData, params: { id: string }, ... }
});

// Route with action only (no loader)
route({
  path: "users/:id",
  action: async ({ params, request }) => { ... },
  component: UserPage, // Receives { actionData, params: { id: string }, ... }
});
```

The type of `TActionData` is inferred from the action's return type, just as `TData` is inferred from the loader's return type.

## Behavior

### Interception Decision Logic

The current interception condition is:

```
willIntercept = matched !== null && !event.hashChange && event.downloadRequest === null
```

This is extended for POST navigations:

```
isFormSubmission = event.formData !== null
matchedRouteHasAction = matched route stack contains at least one route with an `action`

if isFormSubmission:
  willIntercept = matched !== null && matchedRouteHasAction
else:
  willIntercept = matched !== null && !event.hashChange && event.downloadRequest === null
```

If a POST form submission targets a route that **does not** have an action, the router does **not** intercept. The browser performs its default behavior (full-page POST navigation). This supports progressive enhancement: forms that don't have client-side action handlers fall through to server-side handling.

### Execution Flow

#### GET Navigation (unchanged)

```
navigate event (formData === null)
  → match routes
  → intercept
  → handler: run loaders (cached per entry)
  → component renders with { data }
```

#### POST Navigation (new)

```
navigate event (formData !== null)
  → match routes
  → check if any matched route has an action
  → intercept (with focusReset: "manual", scroll: "manual")
  → handler:
      1. Run action for the deepest matched route that has one
      2. Store action result in ephemeral action store
      3. Run loaders for all matched routes (fresh, not from cache)
      4. Wait for action + loaders to complete
  → component renders with { data, actionData }
```

#### Which Route's Action Runs?

Only the **deepest (most specific) matched route** that defines an `action` has its action invoked. This matches the intuition that a form submitting to `/users/123/edit` should trigger the action on the `edit` route, not on the parent `users/:id` layout route.

If multiple routes in the match stack define actions, only the leaf-most one runs. This mirrors Remix's behavior.

### Focus and Scroll Behavior

For POST navigations, `event.intercept()` is called with:

```typescript
event.intercept({
  focusReset: "manual",
  scroll: "manual",
  handler: async () => { ... },
});
```

This prevents the browser from resetting focus or scrolling to the top after a form submission. This is important for UX: if the action returns validation errors, the user should remain at the form with focus preserved.

For GET navigations, the current behavior (browser defaults) is unchanged.

### Action Data Lifecycle

Action data is **ephemeral**. It follows these rules:

1. **Set** when a POST navigation completes successfully
2. **Available** for the duration of the current navigation entry
3. **Cleared** when a new GET navigation occurs (link click, programmatic `navigate()`, back/forward)
4. **Not persisted** in history state (navigating back to a POST-created entry does not restore actionData)
5. **Not cached** across navigations to the same URL

This means action data is a "one-shot" value: available on the render immediately after the form submission, cleared on the next navigation.

### Loader Revalidation After Action

After an action completes, **all loaders in the matched route stack are re-run**, regardless of cache state. This is because actions typically mutate server-side data that loaders depend on.

Implementation: since the Navigation API pushes a new history entry for POST navigations, the entry ID changes. The loader cache is keyed by entry ID, so all loaders naturally miss the cache and re-execute. No special invalidation logic is needed.

### Request Objects

Two separate `Request` objects are created during a POST navigation:

1. **Action request**: `new Request(url, { method: "POST", body: formData })` - passed to the action function
2. **Loader request**: `new Request(url, { method: "GET" })` - passed to loaders during revalidation

Loaders always receive GET requests, even after a POST navigation. This matches the Remix convention where loaders are pure data-fetching functions.

## Architecture

### Action Store

A new module-level store holds ephemeral action results:

```typescript
// actionStore.ts

/**
 * Ephemeral store for action results.
 * Key format: `${entryId}:${matchIndex}`
 * Cleared on every GET navigation.
 */
const actionStore = new Map<string, unknown>();

export function setActionResult(
  entryId: string,
  matchIndex: number,
  result: unknown,
): void;
export function getActionResult(
  entryId: string,
  matchIndex: number,
): unknown | undefined;
export function clearActionResults(): void;
```

The store is cleared at the start of every GET navigation in `setupInterception`. This ensures action data does not leak across navigations.

### Changes to `NavigationAPIAdapter.setupInterception()`

The navigate event handler is extended to detect POST navigations and run actions:

```typescript
const handleNavigate = (event: NavigateEvent) => {
  // ... existing: capture info, check blockers, check canIntercept

  const url = new URL(event.destination.url);
  const matched = matchRoutes(routes, url.pathname);
  const isFormSubmission = event.formData !== null;

  // For POST: only intercept if a matched route has an action
  const actionRouteIndex = isFormSubmission
    ? findDeepestActionRoute(matched)
    : -1;

  const willIntercept = isFormSubmission
    ? matched !== null && actionRouteIndex >= 0
    : matched !== null && !event.hashChange && event.downloadRequest === null;

  // ... existing: call onNavigate, check preventDefault

  if (!willIntercept) return;

  // Clear action store on GET navigations
  if (!isFormSubmission) {
    clearActionResults();
  }

  event.intercept({
    // For POST: preserve focus and scroll position
    ...(isFormSubmission && { focusReset: "manual", scroll: "manual" }),
    handler: async () => {
      const currentEntry = navigation.currentEntry;

      if (isFormSubmission) {
        // 1. Run action
        const actionRequest = new Request(url.href, {
          method: "POST",
          body: event.formData,
        });
        const actionRoute = matched[actionRouteIndex];
        const actionResult = await actionRoute.route.action({
          params: actionRoute.params,
          request: actionRequest,
          signal: event.signal,
        });
        setActionResult(currentEntry.id, actionRouteIndex, actionResult);
      }

      // 2. Run loaders (always GET)
      const loaderRequest = createLoaderRequest(url);
      const results = executeLoaders(
        matched,
        currentEntry.id,
        loaderRequest,
        event.signal,
      );
      await Promise.all(results.map((r) => r.data));
    },
  });
};
```

### Changes to `InternalRouteDefinition`

Add the `action` field:

```typescript
export type InternalRouteDefinition = {
  // ... existing fields
  /** Action function for handling form submissions (POST) */
  action?: (args: ActionArgs<Record<string, string>>) => unknown;
};
```

### Changes to `MatchedRouteWithData`

Add `actionData`:

```typescript
export type MatchedRouteWithData = MatchedRoute & {
  data: unknown | undefined;
  actionData: unknown | undefined;
};
```

### Changes to `Router.tsx`

The `useMemo` block that computes `matchedRoutesWithData` is extended to retrieve action data:

```typescript
const matchedRoutesWithData = (() => {
  // ... existing matching and loader execution

  return loaderResults.map((match, index) => ({
    ...match,
    actionData: getActionResult(key, index),
  }));
})();
```

The `RouteRenderer` component passes `actionData` to components:

```typescript
if (route.action && route.loader) {
  return <Component data={data} actionData={actionData} params={params} ... />;
} else if (route.action) {
  return <Component actionData={actionData} params={params} ... />;
} else if (route.loader) {
  return <Component data={data} params={params} ... />;  // unchanged
} else {
  return <Component params={params} ... />;  // unchanged
}
```

### Changes to `RouteContext`

Add `actionData` to the context value:

```typescript
export type RouteContextValue = {
  // ... existing fields
  /** Data from action (if route has action and was reached via POST) */
  actionData: unknown;
};
```

### Changes to `route.ts`

New overloads for routes with actions. Example (simplified, full overload set would follow existing patterns):

```typescript
// Route with action + loader
type RouteWithActionAndLoader<
  TPath extends string,
  TData,
  TActionData,
  TState,
> = {
  path: TPath;
  action: (args: ActionArgs<PathParams<TPath>>) => TActionData;
  loader: (args: LoaderArgs<PathParams<TPath>>) => TData;
  component: ComponentType<
    RouteComponentPropsWithActionAndData<
      PathParams<TPath>,
      TData,
      TActionData,
      TState
    >
  >;
  children?: RouteDefinition[];
  exact?: boolean;
  requireChildren?: boolean;
};

// Route with action only (no loader)
type RouteWithAction<TPath extends string, TActionData, TState> = {
  path: TPath;
  action: (args: ActionArgs<PathParams<TPath>>) => TActionData;
  component: ComponentType<
    RouteComponentPropsWithAction<PathParams<TPath>, TActionData, TState>
  >;
  children?: RouteDefinition[];
  exact?: boolean;
  requireChildren?: boolean;
};
```

This doubles the overload surface area. The existing `route()` and `routeState()` functions already have 8 overloads each; adding `action` variants would add approximately 8 more each (with-action + with-loader, with-action + without-loader, for path/pathless, with-id/without-id). This is a significant increase in type complexity but is necessary for full type safety.

## Edge Cases

### Form Submitting to a Different Route

A form on `/contacts/1` with `action="/contacts/1/edit"` posts to a different route. This is handled correctly because the Navigation API fires the navigate event with the destination URL, and the router matches routes against that URL.

### Form Submitting to the Same URL

A form on `/contacts/1/edit` with `action="/contacts/1/edit"` (or no `action` attribute, which defaults to the current URL). The Navigation API pushes a new history entry to the same URL. Since the entry ID changes, loaders get fresh cache slots and re-run. This is the correct behavior.

### Multiple Forms on One Page

Multiple forms can coexist. Each submission fires a separate navigate event. Only one action runs at a time (subsequent submissions cancel the previous one via the abort signal, as per Navigation API semantics).

### Action Throws an Error

If the action function throws, the Navigation API's `navigateerror` event fires. The router should propagate this error. Error boundary integration is out of scope for this design but is a natural follow-up.

### Back/Forward to a POST-Created Entry

When the user navigates back to a history entry that was created by a POST form submission, the navigation is a "traverse" type with `formData === null`. The router treats this as a normal GET navigation. The action does not re-run, and `actionData` is `undefined`.

### Action with Redirect

An action may want to redirect after completion (POST/Redirect/GET pattern). The action can call `navigation.navigate(url, { history: "replace" })` to perform a client-side redirect that replaces the POST entry in history. This prevents the "resubmit form?" dialog on back navigation.

```typescript
action: async ({ request, signal }) => {
  const formData = await request.formData();
  await saveData(formData);
  // Client-side redirect (replaces POST entry in history)
  navigation.navigate("/success", { history: "replace" });
},
```

Whether the router should provide a more ergonomic API for this (e.g., returning a `redirect()` sentinel) is left as a future consideration.

### Static/Null Adapter

The `StaticAdapter` and `NullAdapter` do not support navigation interception. Form submissions in these modes fall through to the browser's default behavior (full-page POST). No changes are needed for these adapters.

### `onNavigate` Callback

The existing `onNavigate` callback already receives the full `NavigateEvent`, which includes `formData`. Users can inspect `event.formData` to detect form submissions and call `event.preventDefault()` to block interception. No changes to `OnNavigateInfo` are required, though we may consider adding `formData` or `isFormSubmission` as a convenience field in the future.

## Progressive Enhancement

This design supports progressive enhancement naturally:

1. **Without JavaScript**: Forms submit normally to the server. The server handles the POST and returns a response (typically a redirect).
2. **With JavaScript + Navigation API**: The router intercepts the POST, runs the action client-side, and updates the UI without a full page reload.
3. **With JavaScript, no action defined**: The router does not intercept the POST. The form submits to the server as in case 1.

No special `<Form>` component is required. Standard HTML `<form method="post">` elements work directly.

A `<Form>` component may be added in the future as a convenience (e.g., for automatic `isPending` state on the submit button, optimistic UI helpers), but it is not part of this initial design.

## Testing Strategy

### Unit Tests

1. **POST interception**: Verify that a form submission to a route with an `action` is intercepted
2. **POST passthrough**: Verify that a form submission to a route **without** an `action` is not intercepted
3. **Action execution**: Verify the action receives correct `{ params, request, signal }`
4. **Action request**: Verify `request.method === "POST"` and `request.formData()` returns the submitted data
5. **Loader revalidation**: Verify all loaders re-run after an action completes
6. **Action data delivery**: Verify `actionData` is passed to the component
7. **Action data clearing**: Verify `actionData` is `undefined` after a subsequent GET navigation
8. **Deepest action selection**: Verify only the deepest matched route's action runs when multiple routes define actions

### Integration Tests

1. **Full form submission flow**: Submit form, verify action runs, loaders revalidate, UI updates
2. **Validation errors**: Action returns error data, component renders errors, form state preserved
3. **Redirect after action**: Action redirects, verify history state is correct
4. **Back navigation**: Navigate back to POST-created entry, verify actionData is undefined
5. **Multiple forms**: Submit different forms in sequence, verify correct action runs each time

### Test Mock Updates

The test setup at `packages/router/src/__tests__/setup.ts` already sets `formData: null` on mock NavigateEvents. Tests will need to:

- Create mock NavigateEvents with non-null `formData` (a `FormData` instance)
- Verify that actions are called with the correct arguments
- Verify the interception behavior based on `formData` presence

## Migration / Backwards Compatibility

This is a purely additive feature with **no breaking changes**:

- Routes without `action` behave exactly as before
- POST navigations to routes without actions are not intercepted (same as current behavior, since the router currently does not intercept any POST navigations)
- The `onNavigate` callback API is unchanged
- All existing component prop types are unchanged (no new required props)
- `actionData` is a new optional prop, only passed when `action` is defined

## Open Questions / Future Work

1. **`<Form>` component**: A convenience component that provides `isPending` state for the submit button and enables optimistic UI patterns. Not needed for the core feature but a natural follow-up.

2. **`redirect()` helper**: A sentinel value that actions can return to trigger a client-side redirect, avoiding direct use of `navigation.navigate()` inside actions. This would make actions more testable and portable.

3. **Error boundaries**: How should action errors integrate with React error boundaries? The current design lets errors propagate naturally, but a dedicated error handling pattern may be desirable.

4. **`useNavigation()` hook**: A hook exposing the current navigation state (idle, submitting, loading), similar to Remix's `useNavigation()`. This would let components show loading indicators during form submission.

5. **Optimistic UI**: Patterns for showing optimistic updates while the action is in flight. Could be built on top of `useNavigation()` and the form's `FormData`.

6. **Revalidation control**: Allow routes to opt out of automatic revalidation after actions (e.g., via a `shouldRevalidate` function), for performance optimization when the action is known not to affect certain loaders.

7. **`event.sourceElement`**: The Navigation API exposes `sourceElement` on the navigate event, which identifies the form or submit button that triggered the navigation. This could be useful for multi-form pages but is not needed for the core feature.

## Implementation Plan

1. Add `ActionArgs` type to `route.ts`
2. Add `action` field to `InternalRouteDefinition` in `types.ts`
3. Create `actionStore.ts` for ephemeral action result storage
4. Add `actionData` to `MatchedRouteWithData` and `RouteContextValue`
5. Modify `NavigationAPIAdapter.setupInterception()` to detect POST navigations and run actions
6. Modify `Router.tsx` to retrieve and pass action data to components
7. Modify `RouteRenderer` to pass `actionData` prop to components
8. Add `route()` and `routeState()` overloads for action variants
9. Implement `useActionData()` hook
10. Update `navigation-api.d.ts` if any missing types are needed
11. Write tests
12. Update documentation

## File Changes

```
packages/router/src/
├── route.ts                     # Modified: Add ActionArgs type, action overloads
├── types.ts                     # Modified: Add action to InternalRouteDefinition,
│                                #           actionData to MatchedRouteWithData
├── index.ts                     # Modified: Export ActionArgs, useActionData
├── Router.tsx                   # Modified: Retrieve/pass actionData
├── context/
│   └── RouteContext.ts          # Modified: Add actionData to RouteContextValue
├── core/
│   ├── actionStore.ts           # New: Ephemeral action result storage
│   ├── NavigationAPIAdapter.ts  # Modified: POST detection, action execution,
│   │                            #           action store management
│   └── loaderCache.ts           # Unchanged (loaders always GET)
├── hooks/
│   └── useActionData.ts         # New: useActionData hook
└── __tests__/
    ├── action.test.tsx          # New: Action-specific tests
    └── setup.ts                 # Modified: Support formData in mock events
```
