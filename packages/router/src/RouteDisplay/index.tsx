import { type ReactNode, useMemo, useState } from "react";
import { RouterContext, type RouterContextValue } from "../context/RouterContext.js";
import { BlockerContext, createBlockerRegistry } from "../context/BlockerContext.js";
import { type TrailingSlashMode, internalRoutes } from "../types.js";
import { getBrowserFn } from "../core/browserBailout.js";
import { matchRoutes } from "../core/matchRoutes.js";
import { createDisplayAdapter } from "../core/createAdapter.js";
import { executeLoaders, createLoaderRequest } from "../core/loaderCache.js";
import type { RouteDefinition } from "../route.js";
import type { RouterFeatures, SSRConfig } from "../Router/index.js";
import { RouteRenderer } from "../Router/RouteRenderer.js";
import { useLocationEntry } from "../Router/useLocationEntry.js";

export type RouteDisplayProps = {
  routes: RouteDefinition[];
  /**
   * SSR configuration for the router.
   *
   * Works the same as the `ssr` prop of `Router`: by default (no `ssr` prop),
   * during SSR only pathless routes match. When provided, the router uses
   * the given pathname to match path-based routes during SSR as well.
   *
   * This prop is only used during SSR and hydration. Once the client
   * hydrates, the real URL of the page takes over.
   */
  ssr?: SSRConfig;
  /**
   * How trailing slashes in the URL pathname are treated during route matching.
   * Same as the `trailingSlash` prop of `Router`.
   *
   * @default "ignore"
   */
  trailingSlash?: TrailingSlashMode;
  /**
   * Opt-in feature flags. See {@link RouterFeatures}.
   */
  features?: RouterFeatures;
};

/**
 * Renders the routes matching the current URL, without client-side routing.
 *
 * Unlike `Router`, it does not intercept navigations: links and form
 * submissions cause regular full page loads, and navigations requested by
 * hooks (e.g. the setter of `useSearchParams`) are performed as full page
 * navigations. This makes it suitable for multi-page applications (MPAs),
 * where each page is a separate document but still uses route definitions
 * to decide what to render.
 *
 * It follows the current location the same way as `Router`: when the
 * Navigation API is available, it reacts to current entry changes (e.g.
 * entry state updates and fragment navigations) and exposes the entry's id,
 * key and state; otherwise, it reads `window.location` and works in all
 * browsers.
 */
export function RouteDisplay({
  routes: inputRoutes,
  ssr,
  trailingSlash,
  features,
}: RouteDisplayProps): ReactNode {
  const routes = internalRoutes(inputRoutes);

  const pathlessSSROutletDeferral = features?.pathlessSSROutletDeferral ?? false;

  if (pathlessSSROutletDeferral) {
    // Fail fast (on both server and client) when the host React build
    // doesn't support the browser() API.
    getBrowserFn();
  }

  const resolvedFeatures = useMemo(
    () => ({ pathlessSSROutletDeferral }),
    [pathlessSSROutletDeferral],
  );

  // Same adapters as Router, but interception is never set up
  const [adapter] = useState(createDisplayAdapter);

  // useBlocker requires a registry. Blockers never fire because no
  // navigation is intercepted.
  const [blockerRegistry] = useState(() => createBlockerRegistry());

  const { locationEntry, actualLocationEntry, isPending } = useLocationEntry(adapter);

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
  const urlObject = useMemo(() => (url ? new URL(url) : null), [url]);

  /**
   * Whether to run loaders. Loaders always run when a location entry is
   * available; during SSR (and hydration) only when ssr.runLoaders is true
   * and ssr.path is given.
   */
  const runLoaders = locationEntry !== null || (!!ssr?.runLoaders && urlObject !== null);

  // Loader cache keying is the same as Router's: the adapter's entry key,
  // or an instance-scoped cache when no entry is available (SSR), so that
  // renders in the same process don't share loader results.
  const realLocationKey = actualLocationEntry?.key ?? null;
  const locationKey = realLocationKey ?? "ssr";
  const [instanceLoaderCache] = useState(() => new Map<string, unknown>());

  const matchedRoutesWithData = useMemo(() => {
    if (!runLoaders) {
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

    const matched = matchRoutes(routes, urlObject.pathname, { trailingSlash });
    if (!matched) return null;

    return executeLoaders(
      matched,
      locationKey,
      createLoaderRequest(urlObject),
      adapter.getIdleAbortSignal(),
      undefined,
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
      navigateAsync: (to, options) => adapter.navigateAsync(to, options),
      updateCurrentEntryState: (state) => adapter.updateCurrentEntryState(state),
      features: resolvedFeatures,
    }),
    [
      locationState,
      locationInfo,
      urlObject,
      entryId,
      entryKey,
      isPending,
      adapter,
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
