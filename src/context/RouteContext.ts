import { createContext, type ReactNode } from "react";

export type RouteContextValue = {
  /** Matched route parameters */
  params: Record<string, string>;
  /** The matched path pattern */
  matchedPath: string;
  /** Child route element to render via Outlet */
  outlet: ReactNode;
  /** Data returned by the route's loader */
  loaderData: unknown;
};

export const RouteContext = createContext<RouteContextValue | null>(null);
