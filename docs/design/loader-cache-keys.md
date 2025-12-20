# Loader Cache Key Design

## Problem

The current loader cache uses `${entryId}:${route.path}` as the cache key. This can conflict when multiple routes in a matched stack have the same `path` property.

### Conflict Example

```typescript
routes = [
  route({
    path: "/", // Layout route
    loader: layoutLoader,
    children: [
      route({ path: "/", loader: homeLoader }), // Home page
    ],
  }),
];
```

When navigating to `/`:

- Layout route: cache key = `entry1:/`
- Home route: cache key = `entry1:/` ← **Conflict!**

Both loaders would share the same cache entry, causing incorrect behavior.

## Solution

Use the **match index** instead of the route path:

**New cache key format:** `${entryId}:${matchIndex}`

Where:

- `entryId`: Navigation API's `NavigationHistoryEntry.id`
- `matchIndex`: Zero-based index in the matched route array

### Why This Works

The `matchRoutes` function returns a `MatchedRoute[]` where:

- Each element corresponds to one depth level in the route tree
- Only one route matches per depth level
- The index uniquely identifies the route's position in the match stack

For the example above:

- Layout route (index 0): cache key = `entry1:0`
- Home route (index 1): cache key = `entry1:1`

No conflict.

## Requirements Verification

### 1. Never Conflicts

Within a single navigation entry, each matched route has a unique index. Combined with the unique `entryId`, the cache key is guaranteed unique.

### 2. Stability

The cache key is stable as long as:

- The navigation entry ID remains the same (preserved during back/forward navigation)
- The route structure doesn't change (same number of ancestor routes)

**Acceptable invalidation scenarios:**

- Adding/removing parent routes shifts indices → cache invalidates
- Route configuration changes (e.g., code changes during development)

These are acceptable because:

- Structural changes are rare during a browsing session
- The cache is in-memory only; session-level retention is sufficient

## Implementation

### Changes to `loaderCache.ts`

```typescript
// Before
function getOrCreateLoaderResult(
  entryId: string,
  route: InternalRouteDefinition,
  args: LoaderArgs,
): unknown | undefined {
  const cacheKey = `${entryId}:${route.path}`;
  // ...
}

// After
function getOrCreateLoaderResult(
  entryId: string,
  matchIndex: number,
  route: InternalRouteDefinition,
  args: LoaderArgs,
): unknown | undefined {
  const cacheKey = `${entryId}:${matchIndex}`;
  // ...
}
```

### Changes to `executeLoaders`

```typescript
// Before
export function executeLoaders(
  matchedRoutes: MatchedRoute[],
  entryId: string,
  request: Request,
  signal: AbortSignal,
): MatchedRouteWithData[] {
  return matchedRoutes.map((match) => {
    const { route, params } = match;
    const args: LoaderArgs = { params, request, signal };
    const data = getOrCreateLoaderResult(entryId, route, args);
    return { ...match, data };
  });
}

// After
export function executeLoaders(
  matchedRoutes: MatchedRoute[],
  entryId: string,
  request: Request,
  signal: AbortSignal,
): MatchedRouteWithData[] {
  return matchedRoutes.map((match, index) => {
    const { route, params } = match;
    const args: LoaderArgs = { params, request, signal };
    const data = getOrCreateLoaderResult(entryId, index, route, args);
    return { ...match, data };
  });
}
```

### Cache Cleanup

The `clearLoaderCacheForEntry` function remains unchanged - it still clears all entries prefixed with `${entryId}:`, which works correctly with the new key format.

## Alternatives Considered

### A. Cumulative Pathname + Index

Cache key: `${entryId}:${matchIndex}:${cumulativePathname}`

More complex, provides URL-based semantics but unnecessary given the simplicity of index-only.

### B. Ancestor Path Chain

Cache key: `${entryId}:${ancestorPaths.join('/')}`

Would require tracking and concatenating path patterns, more complex implementation.

### C. Route Identity (Symbol/WeakMap)

Assign unique identity to each route object.

Unstable across HMR and route object recreation.

## Decision

**Use index-only approach** (`${entryId}:${matchIndex}`) for its simplicity and correctness.
