import { type ReactNode, useCallback, useMemo, useState } from "react";
import { RouterContext, type RouterContextValue } from "../context/RouterContext.js";
import { BlockerContext, type BlockerRegistry } from "../context/BlockerContext.js";
import { type NavigateOptions, internalRoutes } from "../types.js";
import type { RouterAdapter } from "../core/RouterAdapter.js";
import { getBrowserFn } from "../core/browserBailout.js";
import { matchRoutes } from "../core/matchRoutes.js";
import { executeLoaders, createLoaderRequest } from "../core/loaderCache.js";
import type { RouteTreeSharedProps } from "./props.js";
import type { UseLocationEntryResult } from "./useLocationEntry.js";
import { RouteRenderer } from "./RouteRenderer.js";

export interface RouteTreeProps extends RouteTreeSharedProps, UseLocationEntryResult {
  adapter: RouterAdapter;
  blockerRegistry: BlockerRegistry;
}

/**
 * Renders the routes matching the resolved location, with the contexts
 * around them. Shared by `Router` and `RouteDisplay`, which differ only in
 * how they obtain the adapter and whether they intercept navigations.
 */
export function RouteTree({
  locationEntry,
  actualLocationEntry,
  isPending,
  adapter,
  routes: inputRoutes,
  ssr,
  trailingSlash,
  features,
  blockerRegistry,
}: RouteTreeProps): ReactNode {
  const routes = internalRoutes(inputRoutes);

  const pathlessSSROutletDeferral = features?.pathlessSSROutletDeferral ?? false;

  if (pathlessSSROutletDeferral) {
    // Fail fast (on both server and client) when the host React build
    // doesn't support the browser() API.
    getBrowserFn();
  }

  // Feature flags with defaults applied, for consumption via RouterContext
  const resolvedFeatures = useMemo(
    () => ({ pathlessSSROutletDeferral }),
    [pathlessSSROutletDeferral],
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
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
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
  const runLoaders = locationEntry !== null || (!!ssr?.runLoaders && urlObject !== null);

  /**
   * Key of location provided by the adapter, or null when no location entry
   * is available (SSR, or Navigation API unavailable with fallback="none").
   */
  const realLocationKey = actualLocationEntry?.key ?? null;
  /**
   * Key of location. This is used as the cache key for loader data saved in navigation entry.
   */
  const locationKey = realLocationKey ?? "ssr";

  // Loader cache for renders without a location entry. The module-level cache
  // is keyed by navigation entry and cleaned up via dispose events; without an
  // entry, every render in the same process would share the literal "ssr" slot,
  // serving one request's loader data to all subsequent SSR/SSG renders. An
  // instance-scoped cache keeps such results memoized for this router's
  // lifetime only, and is garbage-collected with it.
  const [instanceLoaderCache] = useState(() => new Map<string, unknown>());

  // Match routes and execute loaders
  const matchedRoutesWithData = useMemo(() => {
    if (!runLoaders) {
      // SSR/hydration without loader execution: match routes, data is undefined.
      // Routes with loaders are skipped (skipLoaders: true).
      const matched = matchRoutes(routes, urlObject?.pathname ?? null, {
        skipLoaders: true,
        trailingSlash,
      });
      if (!matched) return null;
      return matched.map((m) => ({ ...m, data: undefined }));
    }

    if (urlObject === null) {
      throw new Error("Invariant failure: loaders cannot run without URL.");
    }

    // Unified path: SSR with loaders or client-side.
    // Both cases match routes normally and execute loaders.
    const matched = matchRoutes(routes, urlObject.pathname, { trailingSlash });
    if (!matched) return null;

    const entryKey = locationKey;
    const request = createLoaderRequest(urlObject);
    const signal = adapter.getIdleAbortSignal();
    return executeLoaders(
      matched,
      entryKey,
      request,
      signal,
      undefined,
      // Without a real location entry, scope loader results to this router
      // instance instead of the shared module-level cache.
      realLocationKey === null ? instanceLoaderCache : undefined,
    );
  }, [
    routes,
    adapter,
    urlObject,
    runLoaders,
    trailingSlash,
    locationKey,
    realLocationKey,
    instanceLoaderCache,
  ]);

  const locationState = locationEntry?.state;
  const locationInfo = locationEntry?.info;
  const entryId = actualLocationEntry?.entryId ?? null;
  const entryKey = actualLocationEntry?.entryKey ?? null;
  const routerContextValue: RouterContextValue = useMemo(
    () => ({
      locationState,
      locationInfo,
      url: urlObject,
      entryId,
      entryKey,
      isPending,
      navigateAsync,
      updateCurrentEntryState,
      features: resolvedFeatures,
    }),
    [
      locationState,
      locationInfo,
      urlObject,
      entryId,
      entryKey,
      isPending,
      navigateAsync,
      updateCurrentEntryState,
      resolvedFeatures,
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
