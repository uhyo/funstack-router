import {
  type ReactNode,
  useCallback,
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
  internalRoutes,
} from "./types.js";
import { matchRoutes } from "./core/matchRoutes.js";
import {
  getIdleAbortSignal,
  hasNavigation,
} from "./core/NavigationAPIAdapter.js";
import { executeLoaders, createLoaderRequest } from "./core/loaderCache.js";
import type { RouteDefinition } from "./route.js";
import type { LocationEntry } from "./core/RouterAdapter.js";

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
   * Fallback mode for when Navigation API is unavailable.
   *
   * - "none" (default): Render nothing when Navigation API is unavailable
   * - "static": Render matched routes without navigation capabilities (MPA behavior)
   */
  fallback?: FallbackMode;
};

// Module-level fallback mode - set by Router component
let currentFallbackMode: FallbackMode = "none";

// Internal static entry type
interface StaticEntry {
  url: string;
  id: string;
  getState(): unknown;
  __static: true;
}

// Module-level cache for static entry
let staticEntry: StaticEntry | null = null;

// Subscribe to Navigation API's currententrychange event
function subscribeToNavigation(callback: () => void): () => void {
  if (hasNavigation()) {
    navigation.addEventListener("currententrychange", callback);
    return () => {
      // Guard against navigation being undefined during cleanup
      if (hasNavigation()) {
        navigation.removeEventListener("currententrychange", callback);
      }
    };
  }
  // In static/none mode, no subscription needed
  return () => {};
}

// Get current navigation entry snapshot
function getNavigationSnapshot(): NavigationHistoryEntry | StaticEntry | null {
  if (hasNavigation()) {
    return navigation.currentEntry;
  }

  // Static fallback mode
  if (currentFallbackMode === "static" && typeof window !== "undefined") {
    if (!staticEntry) {
      staticEntry = {
        url: window.location.href,
        id: "__static__",
        getState: () => undefined,
        __static: true,
      };
    }
    return staticEntry;
  }

  return null;
}

// Server snapshot - Navigation API not available on server
function getServerSnapshot(): null {
  return null;
}

// Convert entry to LocationEntry
function toLocationEntry(
  entry: NavigationHistoryEntry | StaticEntry,
): LocationEntry {
  // entry.url is string for StaticEntry, string | null for NavigationHistoryEntry
  // At this point we know entry.url is valid because we checked earlier
  const urlString = entry.url as string;
  return {
    url: new URL(urlString),
    key: entry.id,
    state: entry.getState(),
  };
}

// Reset module-level caches (for testing)
export function resetRouterCache(): void {
  staticEntry = null;
  currentFallbackMode = "none";
}

export function Router({
  routes: inputRoutes,
  onNavigate,
  fallback = "none",
}: RouterProps): ReactNode {
  // Set the fallback mode for the module-level functions
  currentFallbackMode = fallback;

  const routes = internalRoutes(inputRoutes);

  const currentEntry = useSyncExternalStore(
    subscribeToNavigation,
    getNavigationSnapshot,
    getServerSnapshot,
  );

  // Set up navigation interception (only in Navigation API mode)
  useEffect(() => {
    if (!hasNavigation()) {
      return;
    }

    const handleNavigate = (event: NavigateEvent) => {
      if (!event.canIntercept || event.hashChange) {
        return;
      }

      const url = new URL(event.destination.url);
      const matched = matchRoutes(routes, url.pathname);

      if (onNavigate) {
        onNavigate(event, matched);
        if (event.defaultPrevented) {
          return;
        }
      }

      if (matched) {
        event.intercept({
          handler: async () => {
            const request = createLoaderRequest(url);
            const navCurrentEntry = navigation.currentEntry;
            if (!navCurrentEntry) {
              throw new Error(
                "Navigation currentEntry is null during navigation interception",
              );
            }

            const results = executeLoaders(
              matched,
              navCurrentEntry.id,
              request,
              event.signal,
            );

            await Promise.all(results.map((r) => r.data));
          },
        });
      }
    };

    navigation.addEventListener("navigate", handleNavigate);
    return () => {
      // Guard against navigation being undefined during cleanup
      if (hasNavigation()) {
        navigation.removeEventListener("navigate", handleNavigate);
      }
    };
  }, [routes, onNavigate]);

  // Navigate function
  const navigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      if (hasNavigation()) {
        navigation.navigate(to, {
          history: options?.replace ? "replace" : "push",
          state: options?.state,
        });
      } else if (fallback === "static") {
        console.warn(
          "FUNSTACK Router: navigate() called in static fallback mode. " +
            "Navigation API is not available in this browser. " +
            `Attempted to navigate to: ${to}`,
        );
      }
    },
    [fallback],
  );

  return useMemo(() => {
    if (currentEntry === null) {
      return null;
    }

    const locationEntry = toLocationEntry(currentEntry);
    const { url, key: entryKey } = locationEntry;

    const matchedRoutesWithData = (() => {
      const matched = matchRoutes(routes, url.pathname);
      if (!matched) return null;

      const request = createLoaderRequest(url);
      const signal = getIdleAbortSignal();
      return executeLoaders(matched, entryKey, request, signal);
    })();

    const routerContextValue = { locationEntry, url, navigate };

    return (
      <RouterContext.Provider value={routerContextValue}>
        {matchedRoutesWithData ? (
          <RouteRenderer matchedRoutes={matchedRoutesWithData} index={0} />
        ) : null}
      </RouterContext.Provider>
    );
  }, [navigate, currentEntry, routes]);
}

type RouteRendererProps = {
  matchedRoutes: MatchedRouteWithData[];
  index: number;
};

function RouteRenderer({
  matchedRoutes,
  index,
}: RouteRendererProps): ReactNode {
  const match = matchedRoutes[index];
  if (!match) return null;

  const { route, params, pathname, data } = match;
  const Component = route.component;

  const outlet =
    index < matchedRoutes.length - 1 ? (
      <RouteRenderer matchedRoutes={matchedRoutes} index={index + 1} />
    ) : null;

  const routeContextValue = useMemo(
    () => ({ params, matchedPath: pathname, outlet }),
    [params, pathname, outlet],
  );

  const renderComponent = () => {
    if (!Component) return outlet;

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
