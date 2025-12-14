import type { RouterAdapter, LocationEntry } from "./RouterAdapter.js";
import type {
  InternalRouteDefinition,
  NavigateOptions,
  OnNavigateCallback,
} from "../types.js";

/**
 * Null adapter for when Navigation API is unavailable and no fallback is configured.
 * All methods are no-ops that return safe default values.
 */
export class NullAdapter implements RouterAdapter {
  private idleController: AbortController | null = null;

  getSnapshot(): LocationEntry | null {
    return null;
  }

  getServerSnapshot(): LocationEntry | null {
    return null;
  }

  subscribe(_callback: () => void): () => void {
    return () => {};
  }

  navigate(_to: string, _options?: NavigateOptions): void {
    console.warn(
      "FUNSTACK Router: navigate() called but no adapter is available. " +
        "Navigation API is not available in this browser and no fallback mode is configured.",
    );
  }

  setupInterception(
    _routes: InternalRouteDefinition[],
    _onNavigate?: OnNavigateCallback,
  ): (() => void) | undefined {
    return undefined;
  }

  getIdleAbortSignal(): AbortSignal {
    this.idleController ??= new AbortController();
    return this.idleController.signal;
  }
}
