# FUNSTACK Router

![FUNSTACK Router](docs/FUNSTACK_Router_Hero_small.png)

A modern React router built on the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API).

## Features

- :white_check_mark: **Navigation API based** - Uses the modern Navigation API (supported by Chrome, Firefox and Safari 26.2+)
  - **Native `<a>` tags just work** - No special `<Link>` component needed; use standard HTML links
- :white_check_mark: **[Async React](https://github.com/reactwg/async-react) compatible** - navigations are transitions by default
- :white_check_mark: **RSC Compatible** - Designed to work also with React Server Components

## Installation

```bash
npm install @funstack/router
```

## AI Coding Agent Support

`@funstack/router` ships with an Agent skill that gives your coding assistant (Claude Code, Cursor, GitHub Copilot, etc.) knowledge about the router's API and best practices. Run:

```bash
npx -p @funstack/router funstack-router-skill-installer
# or
pnpm dlx --package @funstack/router funstack-router-skill-installer
# or
yarn dlx -p @funstack/router funstack-router-skill-installer
```

The installer will guide you through setting up the skill for your preferred AI agent. Alternatively, if you prefer [npx skills](https://skills.sh/):

```bash
npx skills add uhyo/funstack-router
```

## Development

This is a pnpm monorepo. To set up the development environment:

```bash
# Install dependencies
pnpm install

# Build the router package
pnpm build

# Run the example app
pnpm --filter funstack-router-example dev

# Run tests
pnpm test
```

### Packages

- `packages/router` - The main `@funstack/router` library
- `packages/example` - Example application
- `packages/docs` - Documentation site

## Quick Start

```tsx
import { Router, Outlet, route } from "@funstack/router";
import type { RouteDefinition, RouteComponentProps } from "@funstack/router";

function Layout() {
  return (
    <div>
      <nav>
        {/* Native <a> tags work for client-side navigation */}
        <a href="/">Home</a>
        <a href="/users">Users</a>
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

function UserDetail({ params }: RouteComponentProps<{ id: string }>) {
  return <h1>User {params.id}</h1>;
}

const routes: RouteDefinition[] = [
  route({
    path: "/",
    component: Layout,
    children: [
      route({ path: "", component: Home }),
      route({ path: "users", component: Users }),
      route({ path: "users/:id", component: UserDetail }),
    ],
  }),
];

function App() {
  return <Router routes={routes} />;
}
```

## Documentation

Full documentation is available at [router.funstack.work](https://router.funstack.work/), including:

- [API Reference](https://router.funstack.work/api) - Components, hooks, utilities, and types
- [Learn](https://router.funstack.work/learn) - Guides on nested routes, type safety, SSR, RSC, and more

## Path Patterns

FUNSTACK Router uses the [URLPattern API](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) for path matching.

| Pattern      | Example        | Matches         |
| ------------ | -------------- | --------------- |
| `/users`     | `/users`       | Exact match     |
| `/users/:id` | `/users/123`   | Named parameter |
| `/files/*`   | `/files/a/b/c` | Wildcard        |

## License

MIT
