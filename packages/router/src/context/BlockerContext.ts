import { createContext } from "react";

export type BlockerId = string;

export type BlockerRegistry = {
  /** Register a blocker, returns unregister function */
  register: (id: BlockerId, shouldBlock: () => boolean) => () => void;
  /** Check all blockers - returns true if any blocks */
  checkAll: () => boolean;
};

export type BlockerContextValue = {
  registry: BlockerRegistry;
};

/**
 * Create a new blocker registry.
 * The registry manages registered blockers and provides a way to check if any blocker is active.
 */
export function createBlockerRegistry(): BlockerRegistry {
  const blockers = new Map<BlockerId, () => boolean>();

  return {
    register(id: BlockerId, shouldBlock: () => boolean): () => void {
      blockers.set(id, shouldBlock);
      return () => {
        blockers.delete(id);
      };
    },

    checkAll(): boolean {
      for (const shouldBlock of blockers.values()) {
        if (shouldBlock()) {
          return true;
        }
      }
      return false;
    },
  };
}

export const BlockerContext = createContext<BlockerContextValue | null>(null);
