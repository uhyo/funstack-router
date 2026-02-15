"use client";

// FUNSTACK Router - A modern React router based on the Navigation API

// Components
export { Router, type RouterProps } from "./Router.js";
export { Outlet } from "./Outlet.js";

// Hooks
export { useNavigate } from "./hooks/useNavigate.js";
export { useLocation } from "./hooks/useLocation.js";
export { useSearchParams } from "./hooks/useSearchParams.js";
export { useBlocker, type UseBlockerOptions } from "./hooks/useBlocker.js";
export { useRouteParams } from "./hooks/useRouteParams.js";
export { useRouteState } from "./hooks/useRouteState.js";
export { useRouteData } from "./hooks/useRouteData.js";
export { useIsPending } from "./hooks/useIsPending.js";

// Route Definition Helpers
export { route, routeState } from "./route.js";

// Types
export type {
  MatchedRoute,
  MatchedRouteWithData,
  NavigateOptions,
  Location,
  OnNavigateCallback,
  OnNavigateInfo,
  FallbackMode,
} from "./types.js";

export type { LocationEntry } from "./core/RouterAdapter.js";

export type {
  ActionArgs,
  LoaderArgs,
  RouteDefinition,
  PathParams,
  RouteComponentProps,
  RouteComponentPropsWithData,
  OpaqueRouteDefinition,
  TypefulOpaqueRouteDefinition,
  ExtractRouteId,
  ExtractRouteParams,
  ExtractRouteState,
  ExtractRouteData,
  RouteComponentPropsOf,
} from "./route.js";
