import * as React from "react";

type AddTransitionType = (type: string) => void;

const reactExports = React as unknown as Record<string, unknown>;
const candidate = reactExports.addTransitionType ?? reactExports.unstable_addTransitionType;

/**
 * Wrapper around React's `addTransitionType` that degrades to a no-op when
 * the host React build doesn't expose the API (e.g. stable React 19.2).
 * `addTransitionType` is currently available only in React Canary.
 */
export const addTransitionType: AddTransitionType =
  typeof candidate === "function" ? (candidate as AddTransitionType) : () => {};
