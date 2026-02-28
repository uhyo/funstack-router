import { type ReactNode, use } from "react";

/**
 * A component that suspends while lazy children are being resolved.
 * Rendered as the outlet when a matched route has unresolved lazy children.
 *
 * This component is intentionally thin — it only calls use() to suspend.
 * Promise creation and caching happen in the Router component.
 */
export function PendingOutlet({
  promise,
}: {
  promise: Promise<void>;
}): ReactNode {
  use(promise);
  return null;
}
