// FUNSTACK Router - A modern React router based on the Navigation API

// Components
export { Router, type RouterProps } from "./Router.js";
export { Link, type LinkProps } from "./Link.js";
export { Outlet } from "./Outlet.js";

// Hooks
export { useNavigate } from "./hooks/useNavigate.js";
export { useLocation } from "./hooks/useLocation.js";
export { useParams } from "./hooks/useParams.js";
export { useSearchParams } from "./hooks/useSearchParams.js";

// Types
export type {
  RouteDefinition,
  MatchedRoute,
  NavigateOptions,
  Location,
} from "./types.js";
