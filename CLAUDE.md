# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FUNSTACK Router is a modern React router built on the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) (not the History API). It uses the [URLPattern API](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) for path matching.

## Commands

- `npm run build` - Build with tsdown
- `npm run dev` - Build with watch mode
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run typecheck` - Type check without emitting
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting

## Architecture

### Two-Context Design

The router uses two React contexts:

1. **RouterContext** (`src/context/RouterContext.ts`) - Global router state
   - Current navigation entry from Navigation API
   - `navigate` function for programmatic navigation

2. **RouteContext** (`src/context/RouteContext.ts`) - Per-route state
   - Route params extracted from URL
   - `outlet` ReactNode for nested routing (used by `<Outlet>`)

### Route Matching (`src/core/matchRoutes.ts`)

- Returns an array of `MatchedRoute[]` representing the matched route stack (parent to child)
- Parent routes match as prefixes; leaf routes require exact matches
- Uses URLPattern with `{/*}?` suffix for prefix matching
- Params are merged from parent to child routes

### Component Rendering (`src/Router.tsx`)

- `<Router>` subscribes to Navigation API via `useSyncExternalStore`
- Intercepts navigation events and matches against route definitions
- `RouteRenderer` recursively renders matched routes, each wrapped in its own `RouteContext.Provider`
- Child routes are pre-rendered as `outlet` in the context, consumed by `<Outlet>`

### Testing

Tests run in jsdom with `urlpattern-polyfill` (Navigation API is not available, so tests mock navigation behavior via `src/__tests__/setup.ts`).
