import { type ReactNode, useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { RouterContext, type RouterContextValue } from "../context/RouterContext.js";
import { BlockerContext, createBlockerRegistry } from "../context/BlockerContext.js";
import { type NavigateOptions, type TrailingSlashMode, internalRoutes } from "../types.js";
import { getBrowserFn } from "../core/browserBailout.js";
import { matchRoutes } from "../core/matchRoutes.js";
import { executeLoaders, createLoaderRequest } from "../core/loaderCache.js";
import type { RouteDefinition } from "../route.js";
import type { RouterFeatures, SSRConfig } from "../Router/index.js";
import { noopSubscribe } from "../Router/ServerLocationSnapshot.js";
import { RouteRenderer } from "../Router/RouteRenderer.js";

export type StaticRouterProps = {
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
 * Loader cache key used for every render of a StaticRouter. The URL never
 * changes during the lifetime of a StaticRouter, and the cache is scoped to
 * the instance, so a single key suffices. Using the same key for the
 * hydration render and the post-hydration render lets loader results from
 * hydration be reused instead of re-executed.
 */
const staticLoaderCacheKey = "__static__";

const getServerSnapshot = () => null;

/**
 * Router that only renders the routes matching the current URL.
 *
 * Unlike `Router`, it does not subscribe to or intercept navigations:
 * links and form submissions cause regular full page loads. This makes it
 * suitable for multi-page applications (MPAs), where each page is a separate
 * document but still uses route definitions to decide what to render.
 *
 * It does not depend on the Navigation API, so it works in all browsers.
 */
export function StaticRouter({
  routes: inputRoutes,
  ssr,
  trailingSlash,
  features,
}: StaticRouterProps): ReactNode {
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

  // The page URL never changes without a full page load, so it is read once
  // and cached for this instance.
  const [getSnapshot] = useState(() => {
    let cachedUrl: string | null = null;
    return () => (cachedUrl ??= window.location.href);
  });
  // null during SSR/hydration; React re-renders with the real URL after hydration.
  const clientUrl = useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);

  // useBlocker requires a registry. Blockers never fire because no
  // navigation is intercepted.
  const [blockerRegistry] = useState(() => createBlockerRegistry());

  // Loaders are never aborted: there is no subsequent navigation.
  const [idleSignal] = useState(() => new AbortController().signal);

  // Loader results are scoped to this instance so that multiple renders in
  // the same process (SSR requests, SSG pages) don't share them.
  const [instanceLoaderCache] = useState(() => new Map<string, unknown>());

  const navigateAsync = useCallback(async (_to: string, _options?: NavigateOptions) => {
    console.warn(
      "FUNSTACK Router: navigation was requested inside a StaticRouter. " +
        "StaticRouter does not perform client-side navigation; " +
        "use regular links or a Router instead.",
    );
  }, []);

  const updateCurrentEntryState = useCallback((_state: unknown) => {
    // No-op: StaticRouter does not manage navigation entry state
  }, []);

  const url = useMemo(() => {
    if (clientUrl !== null) {
      return clientUrl;
    }
    if (ssr) {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
      return new URL(ssr.path, origin).toString();
    }
    return null;
  }, [clientUrl, ssr]);
  const urlObject = useMemo(() => (url ? new URL(url) : null), [url]);

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
      staticLoaderCacheKey,
      createLoaderRequest(urlObject),
      idleSignal,
      undefined,
      instanceLoaderCache,
    );
  }, [routes, urlObject, runLoaders, trailingSlash, idleSignal, instanceLoaderCache]);

  const routerContextValue: RouterContextValue = useMemo(
    () => ({
      locationState: undefined,
      locationInfo: undefined,
      url: urlObject,
      entryId: null,
      entryKey: null,
      isPending: false,
      navigateAsync,
      updateCurrentEntryState,
      features: resolvedFeatures,
    }),
    [urlObject, navigateAsync, updateCurrentEntryState, resolvedFeatures],
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
