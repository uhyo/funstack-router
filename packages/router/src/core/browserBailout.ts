import * as ReactDOM from "react-dom";

/**
 * React's `browser()` API (react-dom). Returns an opaque value that, when
 * passed to `use()`, suspends server rendering at the nearest `<Suspense>`
 * boundary and resumes rendering in the browser (where `use()` returns
 * `undefined`).
 */
type BrowserFn = (reason?: string | (() => unknown)) => PromiseLike<undefined>;

const reactDOMExports = ReactDOM as unknown as Record<string, unknown>;
const candidate = reactDOMExports.browser ?? reactDOMExports.unstable_browser;

/**
 * The `browser` function from react-dom, or `null` when the host React build
 * doesn't expose the API. `browser` is currently available only in React
 * Canary.
 */
const browserFn: BrowserFn | null =
  typeof candidate === "function" ? (candidate as BrowserFn) : null;

/**
 * Returns React's `browser()` function, or throws when the host React build
 * doesn't support it.
 */
export function getBrowserFn(): BrowserFn {
  if (browserFn === null) {
    throw new Error(
      "The `experimentalBrowserBailout` option requires a React build that " +
        "supports the `browser()` API from react-dom (currently React Canary). " +
        "Upgrade react and react-dom, or remove the `experimentalBrowserBailout` prop.",
    );
  }
  return browserFn;
}
