import { createContext, type ReactNode } from "react";

export type RouteContextValue = {
  /** Route identifier (if provided in route definition) */
  id: string | undefined;
  /** Matched route parameters extracted from URL */
  params: Record<string, string>;
  /** The matched path pattern */
  matchedPath: string;
  /** Navigation state for this route */
  state: unknown;
  /** Data from loader (if route has loader) */
  data: unknown;
  /** Child route element to render via Outlet */
  outlet: ReactNode;
};

export const RouteContext = createContext<RouteContextValue | null>(null);
