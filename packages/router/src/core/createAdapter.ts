import type { RouterAdapter } from "./RouterAdapter.js";
import { NavigationAPIAdapter } from "./NavigationAPIAdapter.js";
import { StaticAdapter } from "./StaticAdapter.js";
import { NullAdapter } from "./NullAdapter.js";
import type { FallbackMode } from "../types.js";

/**
 * Check if Navigation API is available.
 */
function hasNavigation(): boolean {
  return typeof window !== "undefined" && "navigation" in window;
}

/**
 * Create the appropriate router adapter based on browser capabilities
 * and the specified fallback mode.
 *
 * @param fallback - The fallback mode to use when Navigation API is unavailable
 * @returns A RouterAdapter instance
 */
export function createAdapter(fallback: FallbackMode): RouterAdapter {
  // Try Navigation API first
  if (hasNavigation()) {
    return new NavigationAPIAdapter();
  }

  // Fall back to static mode if enabled
  if (fallback === "static") {
    return new StaticAdapter();
  }

  // No adapter available (fallback="none" or default)
  return new NullAdapter();
}

/**
 * Create the adapter for RouteDisplay: the Navigation API adapter when
 * available (without interception), otherwise a static adapter that performs
 * full page navigations.
 */
export function createDisplayAdapter(): RouterAdapter {
  if (hasNavigation()) {
    return new NavigationAPIAdapter();
  }
  return new StaticAdapter({ fullPageNavigation: true });
}
