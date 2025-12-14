import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { RouterContext } from "./context/RouterContext.js";
import { RouteContext } from "./context/RouteContext.js";
import type {
  RouteDefinition,
  NavigateOptions,
  MatchedRouteWithData,
} from "./types.js";
import { matchRoutes } from "./core/matchRoutes.js";
import {
  subscribeToNavigation,
  getNavigationSnapshot,
  getServerSnapshot,
  setupNavigationInterception,
  performNavigation,
  getIdleAbortSignal,
} from "./core/navigation.js";
import { executeLoaders, createLoaderRequest } from "./core/loaderCache.js";

export type RouterProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes: RouteDefinition<any>[];
  children?: ReactNode;
};

export function Router({ routes, children }: RouterProps): ReactNode {
  const currentEntry = useSyncExternalStore(
    subscribeToNavigation,
    getNavigationSnapshot,
    getServerSnapshot,
  );

  // Set up navigation interception
  useEffect(() => {
    return setupNavigationInterception(routes);
  }, [routes]);

  // Navigate function for programmatic navigation
  const navigate = useCallback(
    (to: string, options?: NavigateOptions) => performNavigation(to, options),
    [],
  );

  const render = useMemo(() => {
    if (currentEntry === null) {
      // This happens either when Navigation API is unavailable,
      // or the current document is not fully active.
      return (children: ReactNode) => children;
    }
    const currentUrl = currentEntry.url;
    if (currentUrl === null) {
      // This means currentEntry is not in this document, which is impossible
      return (children: ReactNode) => children;
    }

    const currentEntryId = currentEntry.id;
    // Match current URL against routes and execute loaders
    const matchedRoutesWithData = (() => {
      const url = new URL(currentUrl);
      const matched = matchRoutes(routes, url.pathname);
      if (!matched) return null;

      // Execute loaders (results are cached by navigation entry id)
      const request = createLoaderRequest(url);
      const signal = getIdleAbortSignal();
      return executeLoaders(matched, currentEntryId, request, signal);
    })();

    const routerContextValue = { currentEntry, navigate };

    return (children: ReactNode) => (
      <RouterContext.Provider value={routerContextValue}>
        {matchedRoutesWithData ? (
          <RouteRenderer matchedRoutes={matchedRoutesWithData} index={0} />
        ) : null}
        {children}
      </RouterContext.Provider>
    );
  }, [navigate, currentEntry, routes]);

  return render(children);
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
  const renderComponent = () => {
    if (!Component) return outlet;

    // When loader exists, data is defined and component expects data prop
    // When loader doesn't exist, data is undefined and component doesn't expect data prop
    // TypeScript can't narrow this union, so we use runtime check with type assertion
    if (route.loader) {
      const ComponentWithData = Component as React.ComponentType<{
        data: unknown;
      }>;
      return <ComponentWithData data={data} />;
    }
    const ComponentWithoutData = Component as React.ComponentType;
    return <ComponentWithoutData />;
  };

  return (
    <RouteContext.Provider value={routeContextValue}>
      {renderComponent()}
    </RouteContext.Provider>
  );
}
