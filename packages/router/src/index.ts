"use client";

// FUNSTACK Router - A modern React router based on the Navigation API

// Components
export { Router, type RouterProps, type RouterFeatures, type SSRConfig } from "./Router/index.js";
export { Outlet } from "./Outlet.js";

// Hooks
export { useLocation } from "./hooks/useLocation.js";
export { useSearchParams, type SetSearchParamsOptions } from "./hooks/useSearchParams.js";
export { useBlocker, type UseBlockerOptions } from "./hooks/useBlocker.js";
export { useRouteParams } from "./hooks/useRouteParams.js";
export { useRouteState } from "./hooks/useRouteState.js";
export { useRouteData } from "./hooks/useRouteData.js";
export { useIsPending } from "./hooks/useIsPending.js";

// Route Definition Helpers
export { route, routeState } from "./route.js";
export { bindRoute } from "./bindRoute.js";

// Bypass Interception
export { hardReload, hardNavigate } from "./bypassInterception.js";

// Types
export type {
  MatchedRoute,
  NavigateOptions,
  Location,
  OnNavigateCallback,
  OnNavigateInfo,
  FallbackMode,
  NavigationType,
  TrailingSlashMode,
  TransitionTypeContext,
  GetTransitionTypes,
} from "./types.js";

export type {
  ActionArgs,
  LoaderArgs,
  RouteDefinition,
  PathParams,
  RouteComponentProps,
  RouteComponentPropsWithData,
  OpaqueRouteDefinition,
  TypefulOpaqueRouteDefinition,
  RouteHandle,
  ExtractRouteId,
  ExtractRouteParams,
  ExtractRouteState,
  ExtractRouteData,
  RouteComponentPropsOf,
  PartialRouteDefinition,
} from "./route.js";
