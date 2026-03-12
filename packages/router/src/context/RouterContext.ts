import { createContext } from "react";
import type { NavigateOptions } from "../types.js";

export type RouterContextValue = {
  /**
   * Current location state associated with the current location entry.
   * Initially undefined. Also, it is undefined during SSR.
   */
  locationState: unknown;
  /**
   * Current location info associated with the current location entry.
   * This is undefined during SSR.
   */
  locationInfo: unknown;
  /** Current URL (null during SSR) */
  url: URL | null;
  /** NavigationHistoryEntry.id — unique identifier for this entry. A new id is assigned when the entry is replaced. Null during SSR or when Navigation API is unavailable. */
  entryId: string | null;
  /** NavigationHistoryEntry.key — represents the slot in the entry list. Stable across replacements. Null during SSR or when Navigation API is unavailable. */
  entryKey: string | null;
  /** Whether a navigation transition is pending */
  isPending: boolean;
  /** Navigate to a new URL and wait for completion */
  navigateAsync: (to: string, options?: NavigateOptions) => Promise<void>;
  /** Update current entry's state without navigation */
  updateCurrentEntryState: (state: unknown) => void;
};

export const RouterContext = createContext<RouterContextValue | null>(null);
