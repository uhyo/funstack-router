import type { TrailingSlashMode } from "../types.js";
import type { RouteDefinition } from "../route.js";

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

/**
 * Opt-in feature flags for the Router, passed via the `features` prop.
 */
export type RouterFeatures = {
  /**
   * Use React's `browser()` API to defer unmatched outlet content to the
   * browser during pathless SSR.
   *
   * During pathless SSR (no `ssr` prop), path-based child routes cannot match
   * because no URL is available, so `<Outlet />` renders `null` on the server
   * while the same outlet renders content in the browser. When this flag is
   * enabled, `<Outlet />` instead calls `use(browser())` in that situation,
   * suspending server rendering at the nearest `<Suspense>` boundary and
   * deferring the outlet content to the browser — avoiding hydration
   * mismatches. Each such outlet must be wrapped in a `<Suspense>` boundary,
   * or the server render fails.
   *
   * Requires a React build that exports `browser` from react-dom (React 19.3
   * or later). On builds that don't expose the API, enabling this flag
   * throws an error when the Router renders.
   *
   * This behavior will become the default in the next major version of
   * FUNSTACK Router.
   *
   * @default false
   */
  pathlessSSROutletDeferral?: boolean;
};

/**
 * Props shared by `Router` and `RouteDisplay`, which both pass them to
 * `RouteTree` to decide what to render.
 */
export interface RouteTreeSharedProps {
  /** Array of route definitions */
  routes: RouteDefinition[];
  /**
   * SSR configuration for the router.
   *
   * By default (no `ssr` prop), during SSR only pathless routes match.
   * When provided, the router uses the given pathname to match path-based
   * routes during SSR as well.
   *
   * This prop is only used when the location entry is not available (during SSR
   * or hydration). Once the client hydrates, the real URL of the page takes over.
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
  /**
   * How trailing slashes in the URL pathname are treated during route matching.
   *
   * - `"ignore"` (default): a single trailing slash is ignored, so `/users/`
   *   matches a route with `path: "users"` (and a trailing slash in a route's
   *   `path` pattern is likewise ignored). The URL itself is never rewritten —
   *   only matching is affected, and the root pathname `/` is unaffected.
   * - `"strict"`: pathnames must match patterns exactly; `/users/` does not
   *   match `path: "users"`.
   *
   * @default "ignore"
   */
  trailingSlash?: TrailingSlashMode;
  /**
   * Opt-in feature flags that change the router's behavior.
   *
   * Each flag is opt-in in the current major version; see the documentation
   * of the individual flags on {@link RouterFeatures} for details.
   */
  features?: RouterFeatures;
}
