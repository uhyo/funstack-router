import type { RouterAdapter } from "./RouterAdapter.js";
import { NavigationAPIAdapter, hasNavigation } from "./NavigationAPIAdapter.js";
import { StaticAdapter } from "./StaticAdapter.js";
import type { FallbackMode } from "../types.js";

/**
 * Create the appropriate RouterAdapter based on browser capabilities and fallback setting.
 *
 * @param fallback - The fallback mode to use when Navigation API is unavailable
 * @returns A RouterAdapter instance, or null if no adapter is available
 */
export function createAdapter(fallback: FallbackMode): RouterAdapter | null {
  // Try Navigation API first
  if (hasNavigation()) {
    return new NavigationAPIAdapter();
  }

  // Fall back to static mode if enabled
  if (fallback === "static") {
    return new StaticAdapter();
  }

  // No adapter available
  return null;
}
