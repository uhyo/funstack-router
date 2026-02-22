import { useCallback } from "react";
import type { InternalRouteState, NavigateOptions } from "../types.js";

type RouteStateCallbacks = {
  setState: (
    stateOrUpdater: unknown | ((prev: unknown) => unknown),
  ) => Promise<void>;
  setStateSync: (
    stateOrUpdater: unknown | ((prev: unknown) => unknown),
  ) => void;
  resetState: () => Promise<void>;
  resetStateSync: () => void;
};

export function useRouteStateCallbacks(
  index: number,
  internalState: InternalRouteState | undefined,
  url: URL | null,
  navigateAsync: (to: string, options?: NavigateOptions) => Promise<void>,
  updateCurrentEntryState: (state: unknown) => void,
): RouteStateCallbacks {
  // Create stable setStateSync callback for this route's slice (synchronous via updateCurrentEntry)
  const setStateSync = useCallback(
    (stateOrUpdater: unknown | ((prev: unknown) => unknown)) => {
      const currentStates = internalState?.__routeStates ?? [];
      const currentRouteState = currentStates[index];

      const newState =
        typeof stateOrUpdater === "function"
          ? (stateOrUpdater as (prev: unknown) => unknown)(currentRouteState)
          : stateOrUpdater;

      const newStates = [...currentStates];
      newStates[index] = newState;
      updateCurrentEntryState({ __routeStates: newStates });
    },
    [internalState, index, updateCurrentEntryState],
  );

  // Create stable setState callback for this route's slice (async via replace navigation)
  const setState = useCallback(
    async (
      stateOrUpdater: unknown | ((prev: unknown) => unknown),
    ): Promise<void> => {
      if (url === null) return;
      const currentStates = internalState?.__routeStates ?? [];
      const currentRouteState = currentStates[index];

      const newState =
        typeof stateOrUpdater === "function"
          ? (stateOrUpdater as (prev: unknown) => unknown)(currentRouteState)
          : stateOrUpdater;

      const newStates = [...currentStates];
      newStates[index] = newState;

      await navigateAsync(url.href, {
        replace: true,
        state: { __routeStates: newStates },
      });
    },
    [internalState, index, url, navigateAsync],
  );

  // Create stable resetStateSync callback (synchronous via updateCurrentEntry)
  const resetStateSync = useCallback(() => {
    const currentStates = internalState?.__routeStates ?? [];
    const newStates = [...currentStates];
    newStates[index] = undefined;
    updateCurrentEntryState({ __routeStates: newStates });
  }, [internalState, index, updateCurrentEntryState]);

  // Create stable resetState callback (async via replace navigation)
  const resetState = useCallback(async (): Promise<void> => {
    if (url === null) return;
    const currentStates = internalState?.__routeStates ?? [];
    const newStates = [...currentStates];
    newStates[index] = undefined;

    await navigateAsync(url.href, {
      replace: true,
      state: { __routeStates: newStates },
    });
  }, [internalState, index, url, navigateAsync]);

  return { setState, setStateSync, resetState, resetStateSync };
}
