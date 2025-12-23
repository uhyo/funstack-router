import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { RouterContext } from "./context/RouterContext.js";
import { RouteContext } from "./context/RouteContext.js";
import {
  type NavigateOptions,
  type MatchedRouteWithData,
  type OnNavigateCallback,
  type FallbackMode,
  type InternalRouteState,
  internalRoutes,
} from "./types.js";
import { matchRoutes } from "./core/matchRoutes.js";
import { createAdapter } from "./core/createAdapter.js";
import { executeLoaders, createLoaderRequest } from "./core/loaderCache.js";
import type { RouteDefinition } from "./route.js";

export type RouterProps = {
  routes: RouteDefinition[];
  /**
   * Callback invoked before navigation is intercepted.
   * Call `event.preventDefault()` to prevent the router from handling this navigation.
   *
   * @param event - The NavigateEvent from the Navigation API
   * @param matched - Array of matched routes, or null if no routes matched
   */
  onNavigate?: OnNavigateCallback;
  /**
   * Fallback mode when Navigation API is unavailable.
   *
   * - `"none"` (default): Render nothing when Navigation API is unavailable
   * - `"static"`: Render matched routes without navigation capabilities (MPA behavior)
   */
  fallback?: FallbackMode;
};

export function Router({
  routes: inputRoutes,
  onNavigate,
  fallback = "none",
}: RouterProps): ReactNode {
  const routes = internalRoutes(inputRoutes);

  // Create adapter once based on browser capabilities and fallback setting
  const adapter = useMemo(() => createAdapter(fallback), [fallback]);

  // Subscribe to location changes via adapter
  const locationEntry = useSyncExternalStore(
    useCallback((callback) => adapter.subscribe(callback), [adapter]),
    () => adapter.getSnapshot(),
    () => adapter.getServerSnapshot(),
  );

  // Set up navigation interception via adapter
  useEffect(() => {
    return adapter.setupInterception(routes, onNavigate);
  }, [adapter, routes, onNavigate]);

  // Navigate function from adapter
  const navigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      adapter.navigate(to, options);
    },
    [adapter],
  );

  // Update current entry's state without navigation
  const updateCurrentEntryState = useCallback(
    (state: unknown) => {
      adapter.updateCurrentEntryState(state);
    },
    [adapter],
  );

  return useMemo(() => {
    if (locationEntry === null) {
      // This happens either when Navigation API is unavailable (and no fallback),
      // or the current document is not fully active.
      return null;
    }

    const { url, key } = locationEntry;

    // Match current URL against routes and execute loaders
    const matchedRoutesWithData = (() => {
      const matched = matchRoutes(routes, url.pathname);
      if (!matched) return null;

      // Execute loaders (results are cached by location entry key)
      const request = createLoaderRequest(url);
      const signal = adapter.getIdleAbortSignal();
      return executeLoaders(matched, key, request, signal);
    })();

    const routerContextValue = {
      locationEntry,
      url,
      navigate,
      updateCurrentEntryState,
    };

    return (
      <RouterContext.Provider value={routerContextValue}>
        {matchedRoutesWithData ? (
          <RouteRenderer matchedRoutes={matchedRoutesWithData} index={0} />
        ) : null}
      </RouterContext.Provider>
    );
  }, [navigate, updateCurrentEntryState, locationEntry, routes, adapter]);
}

type RouteRendererProps = {
  matchedRoutes: MatchedRouteWithData[];
  index: number;
};

/**
 * Recursively render matched routes with proper context.
 */
function RouteRenderer({
  matchedRoutes,
  index,
}: RouteRendererProps): ReactNode {
  const match = matchedRoutes[index];
  if (!match) return null;

  const { route, params, pathname, data } = match;
  const Component = route.component;

  const routerContext = useContext(RouterContext);
  if (!routerContext) {
    throw new Error("RouteRenderer must be used within RouterContext");
  }
  const { locationEntry, updateCurrentEntryState } = routerContext;

  // Extract this route's state from internal structure
  const internalState = locationEntry.state as InternalRouteState | undefined;
  const routeState = internalState?.__routeStates?.[index];

  // Create stable setState callback for this route's slice
  const setState = useCallback(
    (stateOrUpdater: unknown | ((prev: unknown) => unknown)) => {
      const currentStates =
        (locationEntry.state as InternalRouteState | undefined)
          ?.__routeStates ?? [];
      const currentRouteState = currentStates[index];

      const newState =
        typeof stateOrUpdater === "function"
          ? (stateOrUpdater as (prev: unknown) => unknown)(currentRouteState)
          : stateOrUpdater;

      const newStates = [...currentStates];
      newStates[index] = newState;
      updateCurrentEntryState({ __routeStates: newStates });
    },
    [locationEntry.state, index, updateCurrentEntryState],
  );

  // Create stable resetState callback
  const resetState = useCallback(() => {
    const currentStates =
      (locationEntry.state as InternalRouteState | undefined)?.__routeStates ??
      [];
    const newStates = [...currentStates];
    newStates[index] = undefined;
    updateCurrentEntryState({ __routeStates: newStates });
  }, [locationEntry.state, index, updateCurrentEntryState]);

  // Create outlet for child routes
  const outlet =
    index < matchedRoutes.length - 1 ? (
      <RouteRenderer matchedRoutes={matchedRoutes} index={index + 1} />
    ) : null;

  const routeContextValue = useMemo(
    () => ({ params, matchedPath: pathname, outlet }),
    [params, pathname, outlet],
  );

  // Render component with or without data prop based on loader presence
  // Always pass params, state, setState, resetState, and info props to components
  const renderComponent = () => {
    if (!Component) return outlet;

    const stateProps = {
      state: routeState,
      setState,
      resetState,
    };

    // Ephemeral info from the current navigation
    const { info } = locationEntry;

    // When loader exists, data is defined and component expects data prop
    // When loader doesn't exist, data is undefined and component doesn't expect data prop
    // TypeScript can't narrow this union, so we use runtime check with type assertion
    if (route.loader) {
      const ComponentWithData = Component as React.ComponentType<{
        data: unknown;
        params: Record<string, string>;
        state: unknown;
        setState: (s: unknown | ((prev: unknown) => unknown)) => void;
        resetState: () => void;
        info: unknown;
      }>;
      return (
        <ComponentWithData
          data={data}
          params={params}
          {...stateProps}
          info={info}
        />
      );
    }
    const ComponentWithoutData = Component as React.ComponentType<{
      params: Record<string, string>;
      state: unknown;
      setState: (s: unknown | ((prev: unknown) => unknown)) => void;
      resetState: () => void;
      info: unknown;
    }>;
    return <ComponentWithoutData params={params} {...stateProps} info={info} />;
  };

  return (
    <RouteContext.Provider value={routeContextValue}>
      {renderComponent()}
    </RouteContext.Provider>
  );
}
