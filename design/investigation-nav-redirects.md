# Investigation: Navigation API Multiple Redirect Behavior

## Question

The design document for precommit handler integration proposes wrapping
`NavigationPrecommitController` to detect `redirect()` calls and short-circuit
remaining child precommit handlers. Is this wrapping truly needed, or does the
Navigation API already handle multiple `redirect()` calls gracefully?

## Findings

### `redirect()` can be called multiple times — last one wins

The [WPT test `precommitHandler-redirect-push.html`][wpt-redirect-push]
explicitly tests calling `redirect()` twice within a single precommitHandler:

```js
precommitHandler: (controller) => {
  controller.redirect("#redirect1");
  assert_equals(new URL(e.destination.url).hash, "#redirect1");

  controller.redirect("#redirect2");
  assert_equals(new URL(e.destination.url).hash, "#redirect2");
};
// After commit: location.hash === "#redirect2"
```

Each call **synchronously updates** `e.destination.url`. No error is thrown.

### Calling `redirect()` many times with options also works

The [WPT test `precommitHandler-redirect-options.html`][wpt-redirect-options]
calls `redirect()` **five times** in a row with various combinations of URL,
`info`, and `state` options. Each call updates the destination. No errors.

Key behaviors:

- `redirect(url)` without options preserves existing `info` and `state`
- `redirect(url, { info })` updates `info`, preserves `state`
- `redirect(url, { state })` updates `state`, preserves `info`
- `redirect(url, { info: undefined, state: undefined })` is treated as absent (no change)

### `redirect()` does NOT abort the signal

During the precommit phase, `location.hash` remains unchanged even after
`redirect()` is called. The navigation continues normally — just with a
different destination. The `AbortSignal` passed to the precommit handler is
not aborted by `redirect()`.

### When `redirect()` DOES throw

The [WPT test `precommitHandler-redirect-throws.html`][wpt-redirect-throws]
documents all `InvalidStateError` conditions:

| Condition                                   | Error               |
| ------------------------------------------- | ------------------- |
| Called after navigation finishes            | `InvalidStateError` |
| Called after commit (in `handler` callback) | `InvalidStateError` |
| Called in a detached iframe                 | `InvalidStateError` |
| Called on a **reload** navigation           | `InvalidStateError` |
| Called on a **traversal** (back/forward)    | `InvalidStateError` |
| Invalid URL                                 | `SyntaxError`       |
| Cross-origin URL                            | `SecurityError`     |
| Unserializable state                        | `DataCloneError`    |

**Calling `redirect()` multiple times is NOT an error condition.**

### Multiple `intercept()` calls with precommitHandlers

The [WPT test `multiple-intercept.html`][wpt-multiple-intercept] confirms:

- When any `intercept()` call includes a `precommitHandler`, commit is deferred
- Multiple `precommitHandler`s from different `intercept()` calls all run
- They execute in registration order

This means if both a user-registered handler (via `onNavigate`) and the
router's handler call `redirect()`, the **last call wins** — which would be
the router's call since it's registered after `onNavigate`.

## Implications for the Design

### Wrapping is NOT needed for correctness

The Navigation API handles multiple `redirect()` calls gracefully. There is no
error, no abort, no special state to track. The spec was intentionally designed
this way — [WICG/navigation-api#124] explicitly asked about chained redirects
and the answer was "Yes, I think that's the ideal" and "All of these steps
should work if done more than once."

### Wrapping IS still valuable for the router's semantics

Even though multiple `redirect()` calls are safe at the API level, the router
still benefits from detecting redirect calls for its own logic:

1. **Stale params**: If a parent route redirects to `/signin`, the child
   route's precommit handler would receive `params` extracted from the original
   URL (e.g., `/admin/:id`), not the redirect target. Running the child
   handler with stale params is at best wasteful and at worst incorrect.

2. **Unintended override**: Since "last redirect wins," a child handler could
   accidentally override the parent's redirect. For example:
   - Parent redirects unauthenticated users: `controller.redirect("/signin")`
   - Child checks admin role and doesn't redirect (user IS admin)
   - Result: parent's redirect to `/signin` stands — correct!
   - But if the child also called `redirect("/admin/default")` as a
     default-route behavior, it would override the parent's auth redirect.

3. **Wasted work**: Running async precommit handlers (e.g., fetching auth
   status for child routes) after a parent has already decided to redirect
   is unnecessary network traffic and latency.

## Conclusion

The wrapping of `NavigationPrecommitController.redirect()` proposed in the
original design document is **not required by the Navigation API** — calling
`redirect()` multiple times is explicitly supported and the last call wins.

### Chosen approach: router-provided `redirect` function

Based on these findings, the design document has been updated to use a different
approach: instead of wrapping `NavigationPrecommitController`, the router
provides its own `redirect` function to each route's precommit handler. This
function captures the redirect target, allowing the router to:

1. **Skip remaining child handlers** — when a parent redirects, children's
   params would be stale (extracted from the original URL, not the redirect target).
2. **Re-match routes** against the redirect target URL and run the new match
   stack's precommit handlers, naturally resolving redirect chains.
3. **Hide the native API** — route authors never interact with
   `NavigationPrecommitController` directly. The router calls
   `nativeController.redirect()` internally after each redirect chain iteration.

This provides stronger guarantees than wrapping (redirect chains are resolved,
not just short-circuited) while keeping the user-facing API simple.

## References

- [MDN: NavigationPrecommitController.redirect()][mdn-redirect]
- [WPT: precommitHandler-redirect-push.html][wpt-redirect-push]
- [WPT: precommitHandler-redirect-options.html][wpt-redirect-options]
- [WPT: precommitHandler-redirect-throws.html][wpt-redirect-throws]
- [WPT: multiple-intercept.html][wpt-multiple-intercept]
- [WICG/navigation-api#124: First-class "client-side redirect" support][WICG/navigation-api#124]
- [whatwg/html#10919: Navigation API: deferred commit][whatwg-pr]

[mdn-redirect]: https://developer.mozilla.org/en-US/docs/Web/API/NavigationPrecommitController/redirect
[wpt-redirect-push]: https://github.com/web-platform-tests/wpt/blob/master/navigation-api/precommit-handler/precommitHandler-redirect-push.html
[wpt-redirect-options]: https://github.com/web-platform-tests/wpt/blob/master/navigation-api/precommit-handler/precommitHandler-redirect-options.html
[wpt-redirect-throws]: https://github.com/web-platform-tests/wpt/blob/master/navigation-api/precommit-handler/precommitHandler-redirect-throws.html
[wpt-multiple-intercept]: https://github.com/web-platform-tests/wpt/blob/master/navigation-api/precommit-handler/multiple-intercept.html
[WICG/navigation-api#124]: https://github.com/WICG/navigation-api/issues/124
[whatwg-pr]: https://github.com/whatwg/html/pull/10919
