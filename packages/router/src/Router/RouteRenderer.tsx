import { type ReactNode, useContext, useMemo } from "react";
import { RouterContext } from "../context/RouterContext.js";
import { RouteContext } from "../context/RouteContext.js";
import { LoaderError } from "../core/loaderCache.js";
import type { MatchedRouteWithData, InternalRouteState } from "../types.js";
import { useRouteStateCallbacks } from "./useRouteStateCallbacks.js";

export type RouteRendererProps = {
  matchedRoutes: MatchedRouteWithData[];
  index: number;
};

/**
 * Recursively render matched routes with proper context.
 */
export function RouteRenderer({
  matchedRoutes,
  index,
}: RouteRendererProps): ReactNode {
  // Get parent route context (null for root route)
  const parentRouteContext = useContext(RouteContext);

  const routerContext = useContext(RouterContext);
  if (!routerContext) {
    throw new Error("RouteRenderer must be used within RouterContext");
  }
  const {
    locationState,
    locationInfo,
    url,
    isPending,
    navigateAsync,
    updateCurrentEntryState,
  } = routerContext;

  const match = matchedRoutes[index];

  const { route, params, pathname, data } = match ?? {};

  // Extract this route's state from internal structure
  const internalState = locationState as InternalRouteState | undefined;
  const routeState = internalState?.__routeStates?.[index];

  const { setState, setStateSync, resetState, resetStateSync } =
    useRouteStateCallbacks(
      index,
      internalState,
      url,
      navigateAsync,
      updateCurrentEntryState,
    );

  // Create outlet for child routes
  const outlet = useMemo(
    () =>
      index < matchedRoutes.length - 1 ? (
        <RouteRenderer matchedRoutes={matchedRoutes} index={index + 1} />
      ) : null,
    [matchedRoutes, index],
  );

  // Extract id from route definition (if available)
  const routeId = (route as { id?: string } | undefined)?.id;

  const routeContextValue = useMemo(
    () => ({
      id: routeId,
      params: params ?? {},
      matchedPath: pathname ?? "",
      state: routeState,
      data,
      outlet,
      parent: parentRouteContext,
    }),
    [routeId, params, pathname, routeState, data, outlet, parentRouteContext],
  );

  if (!match) return null;

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
    const info = locationInfo;

    // When loader exists, data is defined and component expects data prop
    // When loader doesn't exist, data is undefined and component doesn't expect data prop
    // TypeScript can't narrow this union, so we use runtime check with type assertion
    if (data instanceof LoaderError) {
      // Re-throw synchronous loader errors during rendering so that
      // the nearest Error Boundary can catch them.
      throw data.error;
    }
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
