const bypassInterceptionSymbol = Symbol("bypassInterception");

/**
 * Check if the given info is a bypass interception marker.
 */
export function isBypassInterception(info: unknown): boolean {
  return info === bypassInterceptionSymbol;
}

/**
 * Perform a full page reload, bypassing the router's interception.
 */
export function hardReload(): void {
  navigation.reload({ info: bypassInterceptionSymbol });
}

/**
 * Navigate to the given URL with a full page navigation,
 * bypassing the router's interception.
 */
export function hardNavigate(url: string): void {
  navigation.navigate(url, { info: bypassInterceptionSymbol });
}
