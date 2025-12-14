// FUNSTACK Router - A modern React router based on the Navigation API

// Components
export { Router, type RouterProps } from "./Router.js";
export { Outlet } from "./Outlet.js";

// Hooks
export { useNavigate } from "./hooks/useNavigate.js";
export { useLocation } from "./hooks/useLocation.js";
export { useParams } from "./hooks/useParams.js";
export { useSearchParams } from "./hooks/useSearchParams.js";

// Route Definition Helper
export { route } from "./route.js";

// Types
export type {
  MatchedRoute,
  MatchedRouteWithData,
  NavigateOptions,
  Location,
  OnNavigateCallback,
  FallbackMode,
} from "./types.js";

export type { LoaderArgs, RouteDefinition } from "./route.js";

export type { LocationEntry } from "./core/RouterAdapter.js";
