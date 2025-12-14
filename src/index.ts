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
  RouteDefinition,
  MatchedRoute,
  MatchedRouteWithData,
  NavigateOptions,
  Location,
  LoaderArgs,
} from "./types.js";
