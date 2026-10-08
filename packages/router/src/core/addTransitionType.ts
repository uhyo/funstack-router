import * as React from "react";

type AddTransitionType = (type: string) => void;

const reactExports = React as unknown as Record<string, unknown>;
const candidate = reactExports.addTransitionType ?? reactExports.unstable_addTransitionType;

/**
 * Wrapper around React's `addTransitionType` that degrades to a no-op when
 * the host React build doesn't expose the API (e.g. React 19.2).
 * `addTransitionType` is available in React starting with 19.3; older Canary
 * builds export it as `unstable_addTransitionType`.
 */
export const addTransitionType: AddTransitionType =
  typeof candidate === "function" ? (candidate as AddTransitionType) : () => {};
