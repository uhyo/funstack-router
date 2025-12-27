import { useContext, useEffect, useId } from "react";
import { BlockerContext } from "../context/BlockerContext.js";

export type UseBlockerOptions = {
  /**
   * Function that returns true if navigation should be blocked.
   * Can call `confirm()` inside to show a confirmation dialog.
   */
  shouldBlock: () => boolean;
};

/**
 * Hook to block navigation away from the current route.
 *
 * This is useful for scenarios like unsaved form data, ongoing file uploads,
 * or any state that would be lost on navigation.
 *
 * @example
 * ```tsx
 * function EditForm() {
 *   const [isDirty, setIsDirty] = useState(false);
 *
 *   useBlocker({
 *     shouldBlock: () => {
 *       if (isDirty) {
 *         return !confirm("You have unsaved changes. Leave anyway?");
 *       }
 *       return false;
 *     },
 *   });
 *
 *   return <form>...</form>;
 * }
 * ```
 *
 * Note: This hook only handles SPA navigations (links, programmatic navigation).
 * For hard navigations (tab close, refresh), handle `beforeunload` separately.
 */
export function useBlocker(options: UseBlockerOptions): void {
  const context = useContext(BlockerContext);

  if (!context) {
    throw new Error("useBlocker must be used within a Router");
  }

  const { shouldBlock } = options;
  const blockerId = useId();
  const { registry } = context;

  // Register blocker on mount, unregister on unmount
  // Re-registers when shouldBlock function changes
  useEffect(() => {
    return registry.register(blockerId, shouldBlock);
  }, [blockerId, shouldBlock, registry]);
}
