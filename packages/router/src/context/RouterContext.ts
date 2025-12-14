import { createContext } from "react";
import type { NavigateOptions } from "../types.js";
import type { LocationEntry } from "../core/RouterAdapter.js";

export type RouterContextValue = {
  /** Current location entry */
  locationEntry: LocationEntry;
  /** Current URL */
  url: URL;
  /** Navigate to a new URL */
  navigate: (to: string, options?: NavigateOptions) => void;
};

export const RouterContext = createContext<RouterContextValue | null>(null);
