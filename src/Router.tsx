import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { RouterContext } from "./context/RouterContext.js";
import { RouteContext } from "./context/RouteContext.js";
import type { RouteDefinition, NavigateOptions, MatchedRoute } from "./types.js";
import { matchRoutes } from "./core/matchRoutes.js";

export type RouterProps = {
  routes: RouteDefinition[];
  children?: ReactNode;
};

/**
 * Check if Navigation API is available.
 */
function hasNavigation(): boolean {
  return typeof navigation !== "undefined";
}

/**
 * Subscribe to Navigation API's currententrychange event.
 */
function subscribeToNavigation(callback: () => void): () => void {
  if (!hasNavigation()) {
    return () => {};
  }
  navigation.addEventListener("currententrychange", callback);
  return () => {
    if (hasNavigation()) {
      navigation.removeEventListener("currententrychange", callback);
    }
  };
}

/**
 * Get current navigation entry snapshot.
 */
function getNavigationSnapshot(): NavigationHistoryEntry | null {
  if (!hasNavigation()) {
    return null;
  }
  return navigation.currentEntry;
}

/**
 * Server snapshot - Navigation API not available on server.
 */
function getServerSnapshot(): null {
  return null;
}

export function Router({ routes, children }: RouterProps): ReactNode {
  const currentEntry = useSyncExternalStore(
    subscribeToNavigation,
    getNavigationSnapshot,
    getServerSnapshot
  );

  // Set up navigation interception
  useEffect(() => {
    if (!hasNavigation()) {
      return;
    }

    const handleNavigate = (event: NavigateEvent) => {
      // Only intercept same-origin navigations
      if (!event.canIntercept || event.hashChange) {
        return;
      }

      // Check if the URL matches any of our routes
      const url = new URL(event.destination.url);
      const matched = matchRoutes(routes, url.pathname);

      if (matched) {
        event.intercept({
          handler: async () => {
            // Navigation will complete and currententrychange will fire
          },
        });
      }
    };

    navigation.addEventListener("navigate", handleNavigate);
    return () => {
      if (hasNavigation()) {
        navigation.removeEventListener("navigate", handleNavigate);
      }
    };
  }, [routes]);

  // Navigate function for programmatic navigation
  const navigate = useCallback((to: string, options?: NavigateOptions) => {
    if (!hasNavigation()) {
      return;
    }
    navigation.navigate(to, {
      history: options?.replace ? "replace" : "push",
      state: options?.state,
    });
  }, []);

  // Match current URL against routes
  const currentUrl = currentEntry?.url;
  const matchedRoutes = useMemo(() => {
    if (!currentUrl) return null;
    const url = new URL(currentUrl);
    return matchRoutes(routes, url.pathname);
  }, [currentUrl, routes]);

  const routerContextValue = useMemo(
    () => ({ currentEntry, navigate }),
    [currentEntry, navigate]
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
    [params, pathname, outlet]
  );

  return (
    <RouteContext.Provider value={routeContextValue}>
      {Component ? <Component /> : outlet}
    </RouteContext.Provider>
  );
}
