import { createContext } from "react";
import type { NavigateOptions } from "../types.js";

export type RouterContextValue = {
  /** Current navigation entry */
  currentEntry: NavigationHistoryEntry;
  /** Current URL */
  url: URL;
  /** Navigate to a new URL */
  navigate: (to: string, options?: NavigateOptions) => void;
};

export const RouterContext = createContext<RouterContextValue | null>(null);
