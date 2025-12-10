# FUNSTACK Router

A modern React router built on the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API).

> **Warning**
> This project is in early development and is not ready for production use. APIs may change without notice.

## Features

- **Navigation API based** - Uses the modern Navigation API instead of the History API
- **Object-based routes** - Define routes as plain JavaScript objects
- **Nested routing** - Support for layouts and nested routes with `<Outlet>`
- **Type-safe** - Full TypeScript support
- **Lightweight** - ~2.5 kB gzipped

## Installation

```bash
npm install @funstack/router
```

## Quick Start

```tsx
import { Router, Link, Outlet, useParams } from "@funstack/router";
import type { RouteDefinition } from "@funstack/router";

function Layout() {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/users">Users</Link>
      </nav>
      <Outlet />
    </div>
  );
}

function Home() {
  return <h1>Home</h1>;
}

function Users() {
  return <h1>Users</h1>;
}

function UserDetail() {
  const { id } = useParams<{ id: string }>();
  return <h1>User {id}</h1>;
}

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

function App() {
  return <Router routes={routes} />;
}
```

## API Reference

### Components

#### `<Router>`

The root component that provides routing context.

```tsx
<Router routes={routes} />
```

| Prop | Type | Description |
|------|------|-------------|
| `routes` | `RouteDefinition[]` | Array of route definitions |
| `children` | `ReactNode` | Optional children rendered alongside routes |

#### `<Link>`

Navigation link component.

```tsx
<Link to="/users" replace state={{ from: "home" }}>
  Users
</Link>
```

| Prop | Type | Description |
|------|------|-------------|
| `to` | `string` | Destination URL |
| `replace` | `boolean` | Replace history entry instead of push |
| `state` | `unknown` | State to pass to the destination |

#### `<Outlet>`

Renders the matched child route. Used in layout components.

```tsx
function Layout() {
  return (
    <div>
      <nav>...</nav>
      <Outlet />
    </div>
  );
}
```

### Hooks

#### `useNavigate()`

Returns a function for programmatic navigation.

```tsx
const navigate = useNavigate();

// Basic navigation
navigate("/users");

// With options
navigate("/users", { replace: true, state: { from: "home" } });
```

#### `useLocation()`

Returns the current location.

```tsx
const location = useLocation();
// { pathname: "/users", search: "?page=1", hash: "#section" }
```

#### `useParams()`

Returns the current route's path parameters.

```tsx
// Route: /users/:id
const { id } = useParams<{ id: string }>();
```

#### `useSearchParams()`

Returns and allows updating URL search parameters.

```tsx
const [searchParams, setSearchParams] = useSearchParams();

// Read
const page = searchParams.get("page");

// Update
setSearchParams({ page: "2" });

// Update with function
setSearchParams((prev) => {
  prev.set("page", "2");
  return prev;
});
```

### Types

#### `RouteDefinition`

```typescript
type RouteDefinition = {
  path: string;
  component?: React.ComponentType;
  children?: RouteDefinition[];
};
```

#### `Location`

```typescript
type Location = {
  pathname: string;
  search: string;
  hash: string;
};
```

#### `NavigateOptions`

```typescript
type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
};
```

## Path Patterns

FUNSTACK Router uses the [URLPattern API](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) for path matching.

| Pattern | Example | Matches |
|---------|---------|---------|
| `/users` | `/users` | Exact match |
| `/users/:id` | `/users/123` | Named parameter |
| `/files/*` | `/files/a/b/c` | Wildcard |

## Browser Support

The Navigation API is supported in:

- Chrome 102+
- Edge 102+
- Opera 88+

Firefox and Safari do not yet support the Navigation API. For these browsers, consider using a polyfill.

## License

MIT
