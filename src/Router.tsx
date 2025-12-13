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
  MatchedRoute,
} from "./types.js";
import { matchRoutes } from "./core/matchRoutes.js";
import {
  subscribeToNavigation,
  getNavigationSnapshot,
  getServerSnapshot,
  setupNavigationInterception,
  performNavigation,
} from "./core/navigation.js";
import { getLoaderResource } from "./core/loaderCache.js";

export type RouterProps = {
  routes: RouteDefinition[];
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

  // Match current URL against routes
  const currentUrl = currentEntry?.url;
  const matchedRoutes = useMemo(() => {
    if (!currentUrl) return null;
    const url = new URL(currentUrl);
    return matchRoutes(routes, url.pathname);
  }, [currentUrl, routes]);

  const routerContextValue = useMemo(
    () => ({ currentEntry, navigate }),
    [currentEntry, navigate],
  );

  return (
    <RouterContext.Provider value={routerContextValue}>
      {matchedRoutes && currentUrl ? (
        <RouteRenderer
          matchedRoutes={matchedRoutes}
          index={0}
          url={currentUrl}
        />
      ) : null}
      {children}
    </RouterContext.Provider>
  );
}

type RouteRendererProps = {
  matchedRoutes: MatchedRoute[];
  index: number;
  url: string;
};

/**
 * Recursively render matched routes with proper context.
 * If the route has a loader, reading its resource will suspend until data is ready.
 */
function RouteRenderer({
  matchedRoutes,
  index,
  url,
}: RouteRendererProps): ReactNode {
  const match = matchedRoutes[index];
  if (!match) return null;

  const { route, params, pathname } = match;
  const Component = route.component;

  // Get loader data (will suspend if loader is pending)
  const loaderResource = getLoaderResource(match, url);
  const loaderData = loaderResource ? loaderResource.read() : undefined;

  // Create outlet for child routes
  const outlet =
    index < matchedRoutes.length - 1 ? (
      <RouteRenderer
        matchedRoutes={matchedRoutes}
        index={index + 1}
        url={url}
      />
    ) : null;

  const routeContextValue = useMemo(
    () => ({ params, matchedPath: pathname, outlet, loaderData }),
    [params, pathname, outlet, loaderData],
  );

  return (
    <RouteContext.Provider value={routeContextValue}>
      {Component ? <Component /> : outlet}
    </RouteContext.Provider>
  );
}
