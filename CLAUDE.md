# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FUNSTACK Router is a modern React router built on the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) (not the History API). It uses the [URLPattern API](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) for path matching.

## Monorepo Structure

This is a pnpm monorepo with the following packages:

- `packages/router` - The main `@funstack/router` package
- `packages/docs` - Documentation site
- `packages/example` - Example application demonstrating usage

## Commands

- `pnpm build` - Build all packages
- `pnpm dev` - Build all packages with watch mode
- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run tests once
- `pnpm typecheck` - Type check all packages
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check formatting

### Package-specific commands

- `pnpm --filter @funstack/router build` - Build router package
- `pnpm --filter @funstack/router test` - Test router package
- `pnpm --filter funstack-router-example dev` - Run example app dev server

## Architecture

### Two-Context Design

The router uses two React contexts:

1. **RouterContext** (`packages/router/src/context/RouterContext.ts`) - Global router state
   - Current navigation entry from Navigation API
   - `navigate` function for programmatic navigation

2. **RouteContext** (`packages/router/src/context/RouteContext.ts`) - Per-route state
   - Route params extracted from URL
   - `outlet` ReactNode for nested routing (used by `<Outlet>`)

### Route Matching (`packages/router/src/core/matchRoutes.ts`)

- Returns an array of `MatchedRoute[]` representing the matched route stack (parent to child)
- Parent routes match as prefixes; leaf routes require exact matches
- Uses URLPattern with `{/*}?` suffix for prefix matching
- Params are merged from parent to child routes

### Component Rendering (`packages/router/src/Router.tsx`)

- `<Router>` subscribes to Navigation API via `useSyncExternalStore`
- Intercepts navigation events and matches against route definitions
- `RouteRenderer` recursively renders matched routes, each wrapped in its own `RouteContext.Provider`
- Child routes are pre-rendered as `outlet` in the context, consumed by `<Outlet>`

### Testing

Tests run in jsdom with `urlpattern-polyfill` (Navigation API is not available, so tests mock navigation behavior via `packages/router/src/__tests__/setup.ts`).

## Development Guidelines

### Documentation Updates

When adding a new feature to the router, you must also update the documentation in `packages/docs` to reflect the changes. This ensures users can discover and learn how to use new functionality.
