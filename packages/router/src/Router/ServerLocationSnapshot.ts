import type { LocationEntry, RouterAdapter } from "../core/RouterAdapter.js";

/**
 * Special class returned as server snapshot during SSR/hydration.
 */
export class ServerLocationSnapshot {
  actualLocationEntry: LocationEntry | null;
  constructor(adapter: RouterAdapter) {
    this.actualLocationEntry = adapter.getSnapshot();
  }
}

export function isServerSnapshot(
  value: unknown,
): value is ServerLocationSnapshot {
  return value instanceof ServerLocationSnapshot;
}

export const noopSubscribe = () => () => {};
