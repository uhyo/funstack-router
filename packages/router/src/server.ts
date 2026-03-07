// Server-compatible entry point - no "use client" directive
// Use this entry point when defining routes in server components

// Route Definition Helpers
export { route, routeState, lazyRouteChildren } from "./route.js";
export { bindRoute } from "./bindRoute.js";

// Types
export type {
  LoaderArgs,
  RouteDefinition,
  PathParams,
  RouteComponentProps,
  RouteComponentPropsWithData,
  PartialRouteDefinition,
  LazyRouteChildren,
} from "./route.js";
