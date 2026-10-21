import * as React from "react";

type AddTransitionType = (type: string) => void;

function resolveAddTransitionType(): AddTransitionType {
  const reactExports = React as unknown as Record<string, unknown>;
  const candidate = reactExports.addTransitionType ?? reactExports.unstable_addTransitionType;
  return typeof candidate === "function" ? (candidate as AddTransitionType) : () => {};
}

/**
 * Wrapper around React's `addTransitionType` that degrades to a no-op when
 * the host React build doesn't expose the API (e.g. React 19.2).
 * `addTransitionType` is available in React starting with 19.3; older Canary
 * builds export it as `unstable_addTransitionType`.
 *
 * Resolved via a pure-annotated call so bundlers can drop the lookup when
 * `Router` is not used (e.g. apps that only use `RouteDisplay`).
 */
export const addTransitionType: AddTransitionType = /* @__PURE__ */ resolveAddTransitionType();
