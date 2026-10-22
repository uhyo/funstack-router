import { type ReactNode, useEffect, useEffectEvent, useMemo, useState } from "react";
import { createBlockerRegistry } from "../context/BlockerContext.js";
import {
  type GetTransitionTypes,
  type OnNavigateCallback,
  type FallbackMode,
  internalRoutes,
} from "../types.js";
import { createAdapter } from "../core/createAdapter.js";
import type { RouteTreeSharedProps } from "./props.js";
import { RouteTree } from "./RouteTree.js";
import { useLocationEntry } from "./useLocationEntry.js";

export type { RouterFeatures, SSRConfig } from "./props.js";

export interface RouterProps extends RouteTreeSharedProps {
  /**
   * Callback invoked before navigation is intercepted.
   * Call `event.preventDefault()` to prevent the router from handling this navigation.
   *
   * @param event - The NavigateEvent from the Navigation API
   * @param info - Information about the navigation including matched routes and whether it will be intercepted
   */
  onNavigate?: OnNavigateCallback;
  /**
   * Fallback mode when Navigation API is unavailable.
   *
   * - `"none"` (default): Render nothing when Navigation API is unavailable
   * - `"static"`: Render matched routes without navigation capabilities (MPA behavior)
   */
  fallback?: FallbackMode;
  /**
   * Function returning the React transition types to attach to entry-change
   * transitions via `addTransitionType`. Called inside `startTransition` for
   * each navigation; the returned types replace the default `["navigation"]`.
   *
   * Requires a React build that exports `addTransitionType` (React 19.3 or
   * later). On builds that don't expose the API, the function is still
   * invoked but the types are silently discarded.
   *
   * @default () => ["navigation"]
   */
  transitionTypes?: GetTransitionTypes;
  /**
   * @deprecated Use {@link RouterProps.transitionTypes} instead. This alias
   * will be removed in the next major version. When both are given,
   * `transitionTypes` takes precedence.
   */
  experimentalTransitionTypes?: GetTransitionTypes;
}

export function Router({
  onNavigate,
  fallback = "none",
  transitionTypes,
  experimentalTransitionTypes,
  ...sharedProps
}: RouterProps): ReactNode {
  const routes = internalRoutes(sharedProps.routes);
  const { trailingSlash } = sharedProps;

  // Create adapter once based on browser capabilities and fallback setting
  const adapter = useMemo(() => createAdapter(fallback), [fallback]);

  // Create blocker registry once
  const [blockerRegistry] = useState(() => createBlockerRegistry());

  const location = useLocationEntry(adapter, transitionTypes ?? experimentalTransitionTypes);

  // Wrap in useEffectEvent so interception doesn't re-setup when routes,
  // onNavigate, or trailingSlash change
  const getRoutes = useEffectEvent(() => routes);
  const handleNavigate = useEffectEvent<OnNavigateCallback>((...args) => onNavigate?.(...args));
  // Interception must match with the same trailing-slash policy as rendering,
  // so the interception decision agrees with what will render.
  const getMatchOptions = useEffectEvent(() => ({ trailingSlash }));

  // Set up navigation interception via adapter
  useEffect(() => {
    return adapter.setupInterception(
      getRoutes,
      handleNavigate,
      blockerRegistry.checkAll,
      getMatchOptions,
    );
  }, [adapter, blockerRegistry]);

  return (
    <RouteTree {...sharedProps} {...location} adapter={adapter} blockerRegistry={blockerRegistry} />
  );
}
