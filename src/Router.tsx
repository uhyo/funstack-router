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
      {matchedRoutes ? (
        <RouteRenderer matchedRoutes={matchedRoutes} index={0} />
      ) : null}
      {children}
    </RouterContext.Provider>
  );
}

type RouteRendererProps = {
  matchedRoutes: MatchedRoute[];
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

  const { route, params, pathname } = match;
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

  return (
    <RouteContext.Provider value={routeContextValue}>
      {Component ? <Component /> : outlet}
    </RouteContext.Provider>
  );
}
