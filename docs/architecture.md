# FUNSTACK Router Architecture

## Overview

FUNSTACK Router is a modern React router built on the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API), the browser's native replacement for the History API. This document outlines the core architecture and design decisions.

## Why Navigation API?

The Navigation API provides several advantages over the History API:

| Feature                 | History API                               | Navigation API            |
| ----------------------- | ----------------------------------------- | ------------------------- |
| Navigation interception | Requires `popstate` + link click handlers | Single `navigate` event   |
| Programmatic navigation | `pushState`/`replaceState`                | `navigation.navigate()`   |
| Traversal handling      | Limited `popstate`                        | Proper traverse events    |
| Navigation state        | Manual URL parsing                        | `currentEntry` with state |
| Cancel/redirect         | Manual, error-prone                       | Built-in `intercept()`    |

## Core Concepts

### 1. Navigation Event Flow

```
User Action (click link, back/forward, programmatic)
         │
         ▼
┌─────────────────────────────────┐
│   Navigation API 'navigate'     │
│         event fires             │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Router intercepts event       │
│   via event.intercept()         │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Route matching                │
│   (URL → Route configuration)   │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   React state update            │
│   (triggers re-render)          │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Matched component renders     │
└─────────────────────────────────┘
```

### 2. Route Definition

Routes are defined as a tree structure:

```typescript
type RouteDefinition = {
  path: string;
  component?: React.ComponentType;
  children?: RouteDefinition[];
};

// Example
const routes: RouteDefinition[] = [
  {
    path: "/",
    component: Layout,
    children: [
      { path: "", component: Home },
      { path: "users", component: Users },
      { path: "users/:id", component: UserDetail },
    ],
  },
];
```

### 3. Path Matching

Path matching uses the [URLPattern API](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) where available, with a fallback for unsupported browsers.

Pattern syntax:

- `/users` - Exact match
- `/users/:id` - Named parameter
- `/files/*` - Wildcard (catch-all)
- `/docs/:path+` - One or more segments

## Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      <Router>                           │
│  - Receives route definitions as prop                   │
│  - Owns Navigation API subscription                     │
│  - Provides RouterContext                               │
│  - Performs route matching                              │
│  - Manages current route state                          │
│  - Renders matched route tree                           │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │          Matched Layout Component                 │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │              <Outlet>                       │  │  │
│  │  │  - Renders child route component            │  │  │
│  │  │  - Used in layout components                │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Core Components

#### `<Router>`

The root provider component that:

- Receives route definitions as a prop
- Subscribes to Navigation API events
- Performs route matching against current URL
- Maintains current navigation state in React state
- Renders the matched route component tree
- Provides context to child components

```tsx
const routes: RouteDefinition[] = [
  {
    path: "/",
    component: Layout,
    children: [
      { path: "", component: Home },
      { path: "about", component: About },
    ],
  },
];

<Router routes={routes} />;
```

#### `<Link>`

Navigation component that uses the Navigation API:

```tsx
<Link to="/users/123">View User</Link>
```

#### `<Outlet>`

Renders the matched child route in a layout component:

```tsx
function Layout() {
  return (
    <div>
      <nav>...</nav>
      <Outlet /> {/* Child route renders here */}
    </div>
  );
}
```

## Hooks API

### `useNavigate()`

Returns a function for programmatic navigation:

```typescript
const navigate = useNavigate();

// Basic navigation
navigate("/users");

// With options
navigate("/users", { replace: true, state: { from: "home" } });
```

### `useLocation()`

Returns the current location object:

```typescript
const location = useLocation();
// { pathname: "/users/123", search: "?tab=posts", hash: "#section1" }
```

### `useParams()`

Returns route parameters from the matched path:

```typescript
// Route: /users/:id
const { id } = useParams();
```

### `useSearchParams()`

Returns and allows manipulation of URL search parameters:

```typescript
const [searchParams, setSearchParams] = useSearchParams();
const page = searchParams.get("page");
```

## Internal Architecture

### Context Structure

```typescript
// Main router context
type RouterContextValue = {
  // Current navigation state
  currentEntry: NavigationHistoryEntry;
  // Navigation function
  navigate: (to: string, options?: NavigateOptions) => void;
};

// Route matching context (provided by Router for each matched route)
type RouteContextValue = {
  // Matched route parameters
  params: Record<string, string>;
  // Matched route path pattern
  matchedPath: string;
  // Child routes to render via Outlet
  outlet: React.ReactNode | null;
};
```

### State Management

The Router uses `useSyncExternalStore` to subscribe to the Navigation API. This is the recommended approach for integrating external state sources with React 18+.

```
┌──────────────────────────────────────────────────────┐
│                 Navigation API                        │
│                 (External Store)                      │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │           useSyncExternalStore                  │  │
│  │                                                 │  │
│  │  subscribe: 'currententrychange' event         │  │
│  │  getSnapshot: () => navigation.currentEntry    │  │
│  └─────────────────────────────────────────────────┘  │
│                         │                             │
│                         ▼                             │
│                  currentEntry                         │
│                         │                             │
│                         ▼                             │
│                  Context Provider                     │
│                         │                             │
│                         ▼                             │
│                Consumer Components                    │
└──────────────────────────────────────────────────────┘
```

```typescript
// Inside Router component
const currentEntry = useSyncExternalStore(
  // subscribe: called when component mounts
  (callback) => {
    navigation.addEventListener("currententrychange", callback);
    return () => navigation.removeEventListener("currententrychange", callback);
  },
  // getSnapshot: returns current state
  () => navigation.currentEntry,
  // getServerSnapshot: for SSR (Navigation API not available)
  () => null,
);
```

**Why `useSyncExternalStore` over `useState` + `useEffect`:**

- Handles React concurrent rendering correctly (prevents tearing)
- Clean subscription/snapshot separation
- React manages subscription lifecycle automatically

## File Structure

```
src/
├── index.ts                 # Public exports
├── Router.tsx               # <Router> provider component
├── Link.tsx                 # <Link> component
├── Outlet.tsx               # <Outlet> component
├── hooks/
│   ├── useNavigate.ts
│   ├── useLocation.ts
│   ├── useParams.ts
│   └── useSearchParams.ts
├── context/
│   ├── RouterContext.ts     # Main router context
│   └── RouteContext.ts      # Route matching context
├── core/
│   ├── matchRoutes.ts       # Route matching logic
│   └── pathPattern.ts       # Path pattern parsing
└── types.ts                 # Shared type definitions
```

## Browser Support

The Navigation API is supported in:

- Chrome 102+
- Edge 102+
- Opera 88+

For unsupported browsers (Firefox, Safari), a polyfill or fallback strategy will be needed. Options:

1. Use the `navigation-api-polyfill` package
2. Provide a History API fallback mode
3. Require polyfill as peer dependency

**Initial implementation will target Navigation API-supporting browsers only.**

## Future Considerations

- **Data loading**: Route-based data fetching (loaders)
- **Pending UI**: Navigation state for loading indicators
- **View Transitions**: Integration with View Transitions API
- **Scroll restoration**: Automatic scroll position management
- **Prefetching**: Preload routes on link hover
