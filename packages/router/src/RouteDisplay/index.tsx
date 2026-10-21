import { type ReactNode, useMemo, useState, useSyncExternalStore } from "react";
import { RouterContext, type RouterContextValue } from "../context/RouterContext.js";
import { BlockerContext, createBlockerRegistry } from "../context/BlockerContext.js";
import { type TrailingSlashMode, internalRoutes } from "../types.js";
import { getBrowserFn } from "../core/browserBailout.js";
import { matchRoutes } from "../core/matchRoutes.js";
import { executeLoaders, createLoaderRequest } from "../core/loaderCache.js";
import type { RouteDefinition } from "../route.js";
import type { RouterFeatures, SSRConfig } from "../Router/index.js";
import { RouteRenderer } from "../Router/RouteRenderer.js";
import { createDisplayLocationSource } from "./locationSource.js";

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
 * Loader cache key used for every render of a RouteDisplay. The document
 * (and thus the pathname, barring same-document URL changes made outside the
 * router) doesn't change during the lifetime of a RouteDisplay, and the cache
 * is scoped to the instance and keyed by params as well, so a single key
 * suffices. Using the same key for the hydration render and the
 * post-hydration render lets loader results from hydration be reused instead
 * of re-executed, and fragment navigations and entry state updates don't
 * re-run loaders.
 */
const displayLoaderCacheKey = "__display__";

const getServerSnapshot = () => null;

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
 * When the Navigation API is available, the current entry's id, key and
 * state are exposed (so route state works); otherwise, it falls back to
 * `window.location` and works in all browsers.
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

  const [locationSource] = useState(createDisplayLocationSource);
  // null during SSR/hydration; React re-renders with the real location after hydration.
  const clientLocation = useSyncExternalStore(
    locationSource.subscribe,
    locationSource.getSnapshot,
    getServerSnapshot,
  );

  // useBlocker requires a registry. Blockers never fire because no
  // navigation is intercepted.
  const [blockerRegistry] = useState(() => createBlockerRegistry());

  // Loaders are never aborted: there is no subsequent navigation.
  const [idleSignal] = useState(() => new AbortController().signal);

  // Loader results are scoped to this instance so that multiple renders in
  // the same process (SSR requests, SSG pages) don't share them.
  const [instanceLoaderCache] = useState(() => new Map<string, unknown>());

  // Keyed by href so that state-only entry updates don't re-run matching.
  const clientHref = clientLocation?.url.href ?? null;
  const clientUrl = useMemo(() => (clientHref === null ? null : new URL(clientHref)), [clientHref]);
  // Keyed by the path string so that an inline `ssr` object doesn't create a
  // new URL (and re-run matching) on every render.
  const ssrPath = ssr?.path;
  const ssrUrl = useMemo(() => {
    if (ssrPath === undefined) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    return new URL(ssrPath, origin);
  }, [ssrPath]);
  const urlObject = clientUrl ?? ssrUrl;

  /**
   * Whether to run loaders. Loaders always run on the client; during SSR
   * (and hydration) only when ssr.runLoaders is true and ssr.path is given.
   */
  const runLoaders = clientUrl !== null || (!!ssr?.runLoaders && urlObject !== null);

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
      displayLoaderCacheKey,
      createLoaderRequest(urlObject),
      idleSignal,
      undefined,
      instanceLoaderCache,
    );
  }, [routes, urlObject, runLoaders, trailingSlash, idleSignal, instanceLoaderCache]);

  const routerContextValue: RouterContextValue = useMemo(
    () => ({
      locationState: clientLocation?.state,
      locationInfo: undefined,
      url: urlObject,
      entryId: clientLocation?.entryId ?? null,
      entryKey: clientLocation?.entryKey ?? null,
      isPending: false,
      navigateAsync: locationSource.navigateAsync,
      updateCurrentEntryState: locationSource.updateCurrentEntryState,
      features: resolvedFeatures,
    }),
    [clientLocation, urlObject, locationSource, resolvedFeatures],
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
