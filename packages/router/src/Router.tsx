import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import type { LocationEntry } from "./core/RouterAdapter.js";
import { RouterContext } from "./context/RouterContext.js";
import { RouteContext } from "./context/RouteContext.js";
import {
  BlockerContext,
  createBlockerRegistry,
} from "./context/BlockerContext.js";
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
   * Pathname to use for route matching during SSR.
   *
   * By default, during SSR only pathless routes match. When this prop is provided,
   * the router uses this pathname to match path-based routes during SSR as well.
   * Loaders are not executed during SSR regardless of this setting.
   *
   * This prop is only used when the location entry is not available (during SSR
   * or hydration). Once the client hydrates, the real URL from the Navigation API
   * takes over.
   *
   * @example
   * ```tsx
   * <Router routes={routes} ssrPathname="/about" />
   * ```
   */
  ssrPathname?: string;
};

/**
 * Special value returned as server snapshot during SSR/hydration.
 */
const serverSnapshotSymbol = Symbol();

const noopSubscribe = () => () => {};
const getServerSnapshot = (): typeof serverSnapshotSymbol =>
  serverSnapshotSymbol;

export function Router({
  routes: inputRoutes,
  onNavigate,
  fallback = "none",
  ssrPathname,
}: RouterProps): ReactNode {
  const routes = internalRoutes(inputRoutes);

  // Create adapter once based on browser capabilities and fallback setting
  const adapter = useMemo(() => createAdapter(fallback), [fallback]);

  // Create blocker registry once
  const [blockerRegistry] = useState(() => createBlockerRegistry());

  // Hydration-aware initial value: null during SSR/hydration, real on client-only mount
  const getSnapshot = useCallback(() => adapter.getSnapshot(), [adapter]);
  const initialEntry = useSyncExternalStore<
    LocationEntry | null | typeof serverSnapshotSymbol
  >(noopSubscribe, getSnapshot, getServerSnapshot);

  const [isPending, startTransition] = useTransition();
  const [locationEntryInternal, setLocationEntry] = useState<
    LocationEntry | null | typeof serverSnapshotSymbol
  >(initialEntry);
  const locationEntry =
    locationEntryInternal === serverSnapshotSymbol
      ? null
      : locationEntryInternal;

  if (
    locationEntryInternal === serverSnapshotSymbol &&
    initialEntry !== serverSnapshotSymbol
  ) {
    // On second hydrated render on client, sync state with real snapshot
    // Rendering flow on hydration:
    // 1. Hydrated Render 1: initialEntry = serverSnapshotSymbol, locationEntryInternal = serverSnapshotSymbol
    // 2. Render 1 is committed
    // 3. Hydrated Render 2: initialEntry = client snapshot, locationEntryInternal = serverSnapshotSymbol
    // 4. This `if` block runs, updating state to client snapshot
    // 5. Hydrated Render 2 (retry): initialEntry = client snapshot, locationEntryInternal = client snapshot
    // 6. Render 2 is committed
    setLocationEntry(initialEntry);
  }

  // Subscribe to navigation changes (conditionally wrapped in transition)
  useEffect(() => {
    return adapter.subscribe((changeType) => {
      if (changeType === "navigation") {
        startTransition(() => {
          setLocationEntry(adapter.getSnapshot());
        });
      } else {
        // State-only update: apply synchronously, no transition
        setLocationEntry(adapter.getSnapshot());
      }
    });
  }, [adapter, startTransition]);

  // Set up navigation interception via adapter
  useEffect(() => {
    return adapter.setupInterception(
      routes,
      onNavigate,
      blockerRegistry.checkAll,
    );
  }, [adapter, routes, onNavigate, blockerRegistry]);

  // Navigate function from adapter
  const navigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      adapter.navigate(to, options);
    },
    [adapter],
  );

  // Navigate function that returns a Promise
  const navigateAsync = useCallback(
    (to: string, options?: NavigateOptions) => {
      return adapter.navigateAsync(to, options);
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
    // Match routes and execute loaders
    const matchedRoutesWithData = (() => {
      if (locationEntry === null) {
        // SSR/hydration: match routes without executing loaders.
        // When ssrPathname is provided, path-based routes can match;
        // otherwise only pathless routes match (null pathname).
        // Routes with loaders are always skipped during SSR.
        const matched = matchRoutes(routes, ssrPathname ?? null, {
          skipLoaders: true,
        });
        if (!matched) return null;
        return matched.map((m) => ({ ...m, data: undefined }));
      }

      const { url, key } = locationEntry;
      const matched = matchRoutes(routes, url.pathname);
      if (!matched) return null;

      // Execute loaders (results are cached by location entry key)
      const request = createLoaderRequest(url);
      const signal = adapter.getIdleAbortSignal();
      return executeLoaders(matched, key, request, signal);
    })();

    const routerContextValue = {
      locationEntry: locationEntry,
      url: locationEntry?.url ?? null,
      isPending,
      navigate,
      navigateAsync,
      updateCurrentEntryState,
    };

    const blockerContextValue = { registry: blockerRegistry };

    return (
      <BlockerContext.Provider value={blockerContextValue}>
        <RouterContext.Provider value={routerContextValue}>
          {matchedRoutesWithData ? (
            <RouteRenderer matchedRoutes={matchedRoutesWithData} index={0} />
          ) : null}
        </RouterContext.Provider>
      </BlockerContext.Provider>
    );
  }, [
    navigate,
    navigateAsync,
    updateCurrentEntryState,
    isPending,
    locationEntry,
    routes,
    adapter,
    blockerRegistry,
    ssrPathname,
  ]);
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
  // Get parent route context (null for root route)
  const parentRouteContext = useContext(RouteContext);

  const match = matchedRoutes[index];
  if (!match) return null;

  const { route, params, pathname, data } = match;

  const routerContext = useContext(RouterContext);
  if (!routerContext) {
    throw new Error("RouteRenderer must be used within RouterContext");
  }
  const {
    locationEntry,
    url,
    isPending,
    navigateAsync,
    updateCurrentEntryState,
  } = routerContext;

  // Extract this route's state from internal structure
  const internalState = locationEntry?.state as InternalRouteState | undefined;
  const routeState = internalState?.__routeStates?.[index];

  // Create stable setStateSync callback for this route's slice (synchronous via updateCurrentEntry)
  const setStateSync = useCallback(
    (stateOrUpdater: unknown | ((prev: unknown) => unknown)) => {
      if (locationEntry === null) return;
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
    [locationEntry?.state, index, updateCurrentEntryState],
  );

  // Create stable setState callback for this route's slice (async via replace navigation)
  const setState = useCallback(
    async (
      stateOrUpdater: unknown | ((prev: unknown) => unknown),
    ): Promise<void> => {
      if (locationEntry === null || url === null) return;
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

      await navigateAsync(url.href, {
        replace: true,
        state: { __routeStates: newStates },
      });
    },
    [locationEntry?.state, index, url, navigateAsync],
  );

  // Create stable resetStateSync callback (synchronous via updateCurrentEntry)
  const resetStateSync = useCallback(() => {
    if (locationEntry === null) return;
    const currentStates =
      (locationEntry.state as InternalRouteState | undefined)?.__routeStates ??
      [];
    const newStates = [...currentStates];
    newStates[index] = undefined;
    updateCurrentEntryState({ __routeStates: newStates });
  }, [locationEntry?.state, index, updateCurrentEntryState]);

  // Create stable resetState callback (async via replace navigation)
  const resetState = useCallback(async (): Promise<void> => {
    if (locationEntry === null || url === null) return;
    const currentStates =
      (locationEntry.state as InternalRouteState | undefined)?.__routeStates ??
      [];
    const newStates = [...currentStates];
    newStates[index] = undefined;

    await navigateAsync(url.href, {
      replace: true,
      state: { __routeStates: newStates },
    });
  }, [locationEntry?.state, index, url, navigateAsync]);

  // Create outlet for child routes
  const outlet =
    index < matchedRoutes.length - 1 ? (
      <RouteRenderer matchedRoutes={matchedRoutes} index={index + 1} />
    ) : null;

  // Extract id from route definition (if available)
  const routeId = (route as { id?: string }).id;

  const routeContextValue = useMemo(
    () => ({
      id: routeId,
      params,
      matchedPath: pathname,
      state: routeState,
      data,
      outlet,
      parent: parentRouteContext,
    }),
    [routeId, params, pathname, routeState, data, outlet, parentRouteContext],
  );

  // Render component with or without data prop based on loader presence
  // Always pass params, state, setState, resetState, and info props to components
  const renderComponent = () => {
    const componentOrElement = route.component;

    if (componentOrElement == null) return outlet;

    // Check if it's a component reference (function) or a ReactNode (JSX element)
    if (typeof componentOrElement !== "function") {
      // ReactNode (JSX element, string, number, etc.): render as-is without router props
      return componentOrElement;
    }

    // Component reference: inject router props (existing behavior)
    const Component = componentOrElement;

    const stateProps = {
      state: routeState,
      setState,
      setStateSync,
      resetState,
      resetStateSync,
    };

    // Ephemeral info from the current navigation
    const info = locationEntry?.info;

    // When loader exists, data is defined and component expects data prop
    // When loader doesn't exist, data is undefined and component doesn't expect data prop
    // TypeScript can't narrow this union, so we use runtime check with type assertion
    if (route.loader) {
      const ComponentWithData = Component as React.ComponentType<{
        data: unknown;
        params: Record<string, string>;
        state: unknown;
        setState: (s: unknown | ((prev: unknown) => unknown)) => Promise<void>;
        setStateSync: (s: unknown | ((prev: unknown) => unknown)) => void;
        resetState: () => Promise<void>;
        resetStateSync: () => void;
        info: unknown;
        isPending: boolean;
      }>;
      return (
        <ComponentWithData
          data={data}
          params={params}
          {...stateProps}
          info={info}
          isPending={isPending}
        />
      );
    }
    const ComponentWithoutData = Component as React.ComponentType<{
      params: Record<string, string>;
      state: unknown;
      setState: (s: unknown | ((prev: unknown) => unknown)) => Promise<void>;
      setStateSync: (s: unknown | ((prev: unknown) => unknown)) => void;
      resetState: () => Promise<void>;
      resetStateSync: () => void;
      info: unknown;
      isPending: boolean;
    }>;
    return (
      <ComponentWithoutData
        params={params}
        {...stateProps}
        info={info}
        isPending={isPending}
      />
    );
  };

  return (
    <RouteContext.Provider value={routeContextValue}>
      {renderComponent()}
    </RouteContext.Provider>
  );
}
