import { type ReactNode, useEffect, useEffectEvent, useMemo, useState } from "react";
import { createBlockerRegistry } from "../context/BlockerContext.js";
import {
  type GetTransitionTypes,
  type OnNavigateCallback,
  type FallbackMode,
  type TrailingSlashMode,
  internalRoutes,
} from "../types.js";
import { createAdapter } from "../core/createAdapter.js";
import type { RouteDefinition } from "../route.js";
import { RouteTree } from "./RouteTree.js";
import { useLocationEntry } from "./useLocationEntry.js";

/**
 * SSR configuration for the router.
 */
export type SSRConfig = {
  /**
   * Pathname to use for route matching during SSR.
   *
   * The router uses this pathname to match path-based routes during SSR.
   * Route params are extracted normally.
   */
  path: string;
  /**
   * Whether to run loaders during SSR.
   *
   * - When `false` or omitted, routes with loaders are skipped during SSR
   *   and the parent route renders as a shell.
   * - When `true`, routes with loaders are matched and their loaders are
   *   executed during SSR. The loader results are passed to components as
   *   the `data` prop, so server-rendered HTML includes loader content.
   *
   * @default false
   */
  runLoaders?: boolean;
};

export type RouterProps = {
  routes: RouteDefinition[];
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
   * SSR configuration for the router.
   *
   * By default (no `ssr` prop), during SSR only pathless routes match.
   * When provided, the router uses the given pathname to match path-based
   * routes during SSR as well.
   *
   * This prop is only used when the location entry is not available (during SSR
   * or hydration). Once the client hydrates, the real URL from the Navigation API
   * takes over.
   *
   * @example
   * ```tsx
   * // SSG: match path-based routes, skip loaders
   * <Router routes={routes} ssr={{ path: "/about" }} />
   *
   * // SSR with loaders: match path-based routes including those with loaders
   * <Router routes={routes} ssr={{ path: "/about", runLoaders: true }} />
   * ```
   */
  ssr?: SSRConfig;
  /**
   * How trailing slashes in the URL pathname are treated during route matching.
   *
   * - `"ignore"` (default): a single trailing slash is ignored, so `/users/`
   *   matches a route with `path: "users"` (and a trailing slash in a route's
   *   `path` pattern is likewise ignored). The URL itself is never rewritten —
   *   only matching is affected, and the root pathname `/` is unaffected.
   * - `"strict"`: pathnames must match patterns exactly; `/users/` does not
   *   match `path: "users"`.
   *
   * @default "ignore"
   */
  trailingSlash?: TrailingSlashMode;
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
  /**
   * Opt-in feature flags that change the Router's behavior.
   *
   * Each flag is opt-in in the current major version; see the documentation
   * of the individual flags on {@link RouterFeatures} for details.
   */
  features?: RouterFeatures;
};

/**
 * Opt-in feature flags for the Router, passed via the `features` prop.
 */
export type RouterFeatures = {
  /**
   * Use React's `browser()` API to defer unmatched outlet content to the
   * browser during pathless SSR.
   *
   * During pathless SSR (no `ssr` prop), path-based child routes cannot match
   * because no URL is available, so `<Outlet />` renders `null` on the server
   * while the same outlet renders content in the browser. When this flag is
   * enabled, `<Outlet />` instead calls `use(browser())` in that situation,
   * suspending server rendering at the nearest `<Suspense>` boundary and
   * deferring the outlet content to the browser — avoiding hydration
   * mismatches. Each such outlet must be wrapped in a `<Suspense>` boundary,
   * or the server render fails.
   *
   * Requires a React build that exports `browser` from react-dom (React 19.3
   * or later). On builds that don't expose the API, enabling this flag
   * throws an error when the Router renders.
   *
   * This behavior will become the default in the next major version of
   * FUNSTACK Router.
   *
   * @default false
   */
  pathlessSSROutletDeferral?: boolean;
};

export function Router({
  routes: inputRoutes,
  onNavigate,
  fallback = "none",
  ssr,
  trailingSlash,
  transitionTypes,
  experimentalTransitionTypes,
  features,
}: RouterProps): ReactNode {
  const routes = internalRoutes(inputRoutes);

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
    <RouteTree
      {...location}
      adapter={adapter}
      routes={routes}
      ssr={ssr}
      trailingSlash={trailingSlash}
      features={features}
      blockerRegistry={blockerRegistry}
    />
  );
}
