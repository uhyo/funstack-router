import { type ReactNode, useState } from "react";
import { createBlockerRegistry } from "../context/BlockerContext.js";
import { type TrailingSlashMode, internalRoutes } from "../types.js";
import { createDisplayAdapter } from "../core/createAdapter.js";
import type { RouteDefinition } from "../route.js";
import type { RouterFeatures, SSRConfig } from "../Router/index.js";
import { RouteTree } from "../Router/RouteTree.js";
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

  // Same adapters as Router, but interception is never set up
  const [adapter] = useState(createDisplayAdapter);

  // useBlocker requires a registry. Blockers never fire because no
  // navigation is intercepted.
  const [blockerRegistry] = useState(() => createBlockerRegistry());

  const location = useLocationEntry(adapter);

  return (
    <RouteTree
      {...location}
      adapter={adapter}
      routes={routes}
      ssr={ssr}
      trailingSlash={trailingSlash}
      features={features}
      blockerRegistry={blockerRegistry}
    />
  );
}
