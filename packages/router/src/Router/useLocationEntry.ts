import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import type { LocationEntry, RouterAdapter } from "../core/RouterAdapter.js";
import type { GetTransitionTypes, TransitionTypeContext } from "../types.js";
import { addTransitionType } from "../core/addTransitionType.js";
import {
  ServerLocationSnapshot,
  isServerSnapshot,
  noopSubscribe,
} from "./ServerLocationSnapshot.js";

export type UseLocationEntryResult = {
  /**
   * The location entry to render. Null during SSR and hydration, or when
   * the adapter has no location (Navigation API unavailable with
   * fallback="none").
   */
  locationEntry: LocationEntry | null;
  /**
   * The adapter's real location entry. Same as `locationEntry`, except
   * during hydration, where it is available while `locationEntry` is still
   * null. Used for identity (loader cache key, entry id/key) so that it stays
   * stable between the hydration render and the post-hydration render.
   */
  actualLocationEntry: LocationEntry | null;
  /** Whether an entry-change transition is pending */
  isPending: boolean;
};

/**
 * Tracks the adapter's current location entry.
 *
 * - Hydration-aware: renders without a location during SSR and hydration,
 *   then switches to the real entry.
 * - Entry changes from navigations are applied in a transition (with
 *   transition types from `getTransitionTypes`); state-only updates are
 *   applied synchronously.
 *
 * This hook only observes entry changes; it does not intercept navigations.
 */
export function useLocationEntry(
  adapter: RouterAdapter,
  getTransitionTypes?: GetTransitionTypes,
): UseLocationEntryResult {
  // Hydration-aware initial value: null during SSR/hydration, real on client-only mount
  const getSnapshot = useCallback(() => adapter.getSnapshot(), [adapter]);
  const serverSnapshotCacheRef = useRef<ServerLocationSnapshot | null>(null);
  const getServerSnapshot = useCallback(() => {
    // During SSR/hydration, return special server snapshot object
    // that captures the real snapshot at the time of first render.
    // This allows us to detect hydration and sync to real snapshot on client.
    return (serverSnapshotCacheRef.current ??= new ServerLocationSnapshot(adapter));
  }, [adapter]);
  const initialEntry = useSyncExternalStore<LocationEntry | null | ServerLocationSnapshot>(
    noopSubscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [isPending, startTransition] = useTransition();
  const [locationEntryInternal, setLocationEntry] = useState<
    LocationEntry | null | ServerLocationSnapshot
  >(initialEntry);
  const locationEntry = isServerSnapshot(locationEntryInternal) ? null : locationEntryInternal;

  if (isServerSnapshot(locationEntryInternal) && !isServerSnapshot(initialEntry)) {
    // On second hydrated render on client, sync state with real snapshot
    // Rendering flow on hydration:
    // 1. Hydrated Render 1: initialEntry = serverSnapshotSymbol, locationEntryInternal = serverSnapshotSymbol
    // 2. Render 1 is committed
    // 3. Hydrated Render 2: initialEntry = client snapshot, locationEntryInternal = serverSnapshotSymbol
    // 4. This `if` block runs, updating state to client snapshot
    // 5. Hydrated Render 2 (retry): initialEntry = client snapshot, locationEntryInternal = client snapshot
    // 6. Render 2 is committed
    setLocationEntry(initialEntry);
  }

  // Resolve transition types for the current navigation. Wrapped in
  // useEffectEvent so the subscription effect doesn't re-run when the
  // `getTransitionTypes` identity changes.
  const resolveTransitionTypes = useEffectEvent(
    (context: TransitionTypeContext): readonly string[] => {
      return getTransitionTypes ? getTransitionTypes(context) : ["navigation"];
    },
  );

  // Subscribe to navigation changes (conditionally wrapped in transition)
  useEffect(() => {
    return adapter.subscribe((change) => {
      if (change.kind === "navigation") {
        if (change.wait) {
          // Intercepted form submission: the entry has committed but the
          // action hasn't run yet. Rendering now would execute loaders
          // without the action result, so wait (inside an async transition,
          // keeping the old UI and isPending up) until the adapter has
          // dispatched loaders with the action result.
          const { wait, navigationType } = change;
          // The entry is already committed, so the snapshot has the final
          // URL. Read it now so transition types can be added synchronously
          // inside the transition — addTransitionType is not supported
          // after an await.
          const committedSnapshot = adapter.getSnapshot();
          startTransition(async () => {
            if (committedSnapshot) {
              const types = resolveTransitionTypes({
                url: committedSnapshot.url,
                navigationType,
              });
              for (const type of types) {
                addTransitionType(type);
              }
            }
            await wait;
            // Updates after the first await are not part of the transition
            // unless wrapped in a nested startTransition call.
            startTransition(() => {
              // Re-read the snapshot: a superseding navigation may have
              // resolved the wait, in which case this renders the newest entry.
              setLocationEntry(adapter.getSnapshot());
            });
          });
          return;
        }
        const newSnapshot = adapter.getSnapshot();
        startTransition(() => {
          if (newSnapshot) {
            const types = resolveTransitionTypes({
              url: newSnapshot.url,
              navigationType: change.navigationType,
            });
            for (const type of types) {
              addTransitionType(type);
            }
          }
          setLocationEntry(newSnapshot);
        });
      } else {
        // State-only update: apply synchronously, no transition
        setLocationEntry(adapter.getSnapshot());
      }
    });
  }, [adapter, startTransition]);

  const actualLocationEntry =
    locationEntry ??
    (isServerSnapshot(locationEntryInternal) ? locationEntryInternal.actualLocationEntry : null);

  return { locationEntry, actualLocationEntry, isPending };
}
