// Server-compatible entry point - no "use client" directive
// Use this entry point when defining routes in server components

// Route Definition Helpers
export { route, routes, routeState } from "./route.js";

// Types
export type {
  LoaderArgs,
  RouteDefinition,
  PathParams,
  RouteComponentProps,
  RouteComponentPropsWithData,
} from "./route.js";
