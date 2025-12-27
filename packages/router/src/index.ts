// FUNSTACK Router - A modern React router based on the Navigation API

// Components
export { Router, type RouterProps } from "./Router.js";
export { Outlet } from "./Outlet.js";

// Hooks
export { useNavigate } from "./hooks/useNavigate.js";
export { useLocation } from "./hooks/useLocation.js";
export { useSearchParams } from "./hooks/useSearchParams.js";
export { useBlocker } from "./hooks/useBlocker.js";

// Route Definition Helpers
export { route, routeState } from "./route.js";

// Types
export type {
  MatchedRoute,
  MatchedRouteWithData,
  NavigateOptions,
  Location,
  OnNavigateCallback,
  FallbackMode,
} from "./types.js";

export type { LocationEntry } from "./core/RouterAdapter.js";

export type {
  LoaderArgs,
  RouteDefinition,
  PathParams,
  RouteComponentProps,
  RouteComponentPropsWithData,
} from "./route.js";
