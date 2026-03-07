import type { LazyRouteChildren } from "../route.js";
import type { InternalRouteDefinition } from "../types.js";

export type LazyRouteCacheEntry =
  | {
      status: "loading";
      promise: Promise<void>;
    }
  | {
      status: "loaded";
      children: InternalRouteDefinition[] | undefined;
    };

export type LazyRouteCache = ReadonlyMap<
  LazyRouteChildren,
  LazyRouteCacheEntry
>;
