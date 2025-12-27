import { useContext, useEffect, useId, useRef } from "react";
import { BlockerContext } from "../context/BlockerContext.js";

/**
 * Hook to block navigation away from the current route.
 *
 * This is useful for scenarios like unsaved form data, ongoing file uploads,
 * or any state that would be lost on navigation.
 *
 * @param shouldBlock - Function that returns true if navigation should be blocked.
 *                      Can call `confirm()` inside to show a confirmation dialog.
 *
 * @example
 * ```tsx
 * function EditForm() {
 *   const [isDirty, setIsDirty] = useState(false);
 *
 *   useBlocker(() => {
 *     if (isDirty) {
 *       return !confirm("You have unsaved changes. Leave anyway?");
 *     }
 *     return false;
 *   });
 *
 *   return <form>...</form>;
 * }
 * ```
 *
 * Note: This hook only handles SPA navigations (links, programmatic navigation).
 * For hard navigations (tab close, refresh), handle `beforeunload` separately.
 */
export function useBlocker(shouldBlock: () => boolean): void {
  const context = useContext(BlockerContext);

  if (!context) {
    throw new Error("useBlocker must be used within a Router");
  }

  const blockerId = useId();
  const { registry } = context;

  // Use a ref to always have access to the latest shouldBlock function
  // This avoids stale closure issues when state updates happen between renders
  const shouldBlockRef = useRef(shouldBlock);
  shouldBlockRef.current = shouldBlock;

  // Register blocker on mount, unregister on unmount
  // The registered function always calls the latest shouldBlock via ref
  useEffect(() => {
    return registry.register(blockerId, () => shouldBlockRef.current());
  }, [blockerId, registry]);
}
