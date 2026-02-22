import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import type { LocationEntry } from "../core/RouterAdapter.js";
import {
  RouterContext,
  type RouterContextValue,
} from "../context/RouterContext.js";
import {
  BlockerContext,
  createBlockerRegistry,
} from "../context/BlockerContext.js";
import {
  type NavigateOptions,
  type OnNavigateCallback,
  type FallbackMode,
  internalRoutes,
} from "../types.js";
import { matchRoutes } from "../core/matchRoutes.js";
import { createAdapter } from "../core/createAdapter.js";
import { executeLoaders, createLoaderRequest } from "../core/loaderCache.js";
import type { RouteDefinition } from "../route.js";
import {
  ServerLocationSnapshot,
  isServerSnapshot,
  noopSubscribe,
} from "./ServerLocationSnapshot.js";
import { RouteRenderer } from "./RouteRenderer.js";

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
};

export function Router({
  routes: inputRoutes,
  onNavigate,
  fallback = "none",
  ssr,
}: RouterProps): ReactNode {
  const routes = internalRoutes(inputRoutes);

  // Create adapter once based on browser capabilities and fallback setting
  const adapter = useMemo(() => createAdapter(fallback), [fallback]);

  // Create blocker registry once
  const [blockerRegistry] = useState(() => createBlockerRegistry());

  // Hydration-aware initial value: null during SSR/hydration, real on client-only mount
  const getSnapshot = useCallback(() => adapter.getSnapshot(), [adapter]);
  const serverSnapshotCacheRef = useRef<ServerLocationSnapshot | null>(null);
  const getServerSnapshot = useCallback(() => {
    // During SSR/hydration, return special server snapshot object
    // that captures the real snapshot at the time of first render.
    // This allows us to detect hydration and sync to real snapshot on client.
    return (serverSnapshotCacheRef.current ??= new ServerLocationSnapshot(
      adapter,
    ));
  }, [adapter]);
  const initialEntry = useSyncExternalStore<
    LocationEntry | null | ServerLocationSnapshot
  >(noopSubscribe, getSnapshot, getServerSnapshot);

  const [isPending, startTransition] = useTransition();
  const [locationEntryInternal, setLocationEntry] = useState<
    LocationEntry | null | ServerLocationSnapshot
  >(initialEntry);
  const locationEntry = isServerSnapshot(locationEntryInternal)
    ? null
    : locationEntryInternal;

  if (
    isServerSnapshot(locationEntryInternal) &&
    !isServerSnapshot(initialEntry)
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

  const url = useMemo(() => {
    if (locationEntry) {
      return locationEntry.url.toString();
    }
    if (ssr) {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost";
      return new URL(ssr.path, origin).toString();
    }
    return null;
  }, [locationEntry, ssr]);
  /**
   * URL object. Non-null when client-side or during SSR with ssr.path provided.
   * Null during SSR without ssr.path.
   */
  const urlObject = useMemo(() => (url ? new URL(url) : null), [url]);

  /**
   * Whether to run loaders.
   * 1. Loaders are always run for rendering with URL available (client-side)
   * 2. During SSR, loaders are only run if ssr.runLoaders is true and URL is available (ssr.path provided).
   */
  const runLoaders =
    locationEntry !== null || (!!ssr?.runLoaders && urlObject !== null);

  /**
   * Key of location. This is used as the cache key for loader data saved in navigation entry.
   */
  const locationKey =
    locationEntry?.key ??
    (isServerSnapshot(locationEntryInternal)
      ? locationEntryInternal.actualLocationEntry?.key
      : null) ??
    "ssr";

  // Match routes and execute loaders
  const matchedRoutesWithData = useMemo(() => {
    if (!runLoaders) {
      // SSR/hydration without loader execution: match routes, data is undefined.
      // Routes with loaders are skipped (skipLoaders: true).
      const matched = matchRoutes(routes, urlObject?.pathname ?? null, {
        skipLoaders: true,
      });
      if (!matched) return null;
      return matched.map((m) => ({ ...m, data: undefined }));
    }

    if (urlObject === null) {
      throw new Error("Invariant failure: loaders cannot run without URL.");
    }

    // Unified path: SSR with loaders or client-side.
    // Both cases match routes normally and execute loaders.
    const matched = matchRoutes(routes, urlObject.pathname);
    if (!matched) return null;

    const entryKey = locationKey;
    const request = createLoaderRequest(urlObject);
    const signal = adapter.getIdleAbortSignal();
    return executeLoaders(matched, entryKey, request, signal);
  }, [routes, adapter, urlObject, runLoaders, locationKey]);

  const locationState = locationEntry?.state;
  const locationInfo = locationEntry?.info;
  const routerContextValue: RouterContextValue = useMemo(
    () => ({
      locationState,
      locationInfo,
      url: urlObject,
      isPending,
      navigate,
      navigateAsync,
      updateCurrentEntryState,
    }),
    [
      locationState,
      locationInfo,
      urlObject,
      isPending,
      navigate,
      navigateAsync,
      updateCurrentEntryState,
    ],
  );

  return useMemo(() => {
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
  }, [routerContextValue, matchedRoutesWithData, blockerRegistry]);
}
