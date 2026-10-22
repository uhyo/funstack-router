import { type ReactNode, useState } from "react";
import { createBlockerRegistry } from "../context/BlockerContext.js";
import { createDisplayAdapter } from "../core/createAdapter.js";
import type { RouteTreeSharedProps } from "../Router/props.js";
import { RouteTree } from "../Router/RouteTree.js";
import { useLocationEntry } from "../Router/useLocationEntry.js";

export interface RouteDisplayProps extends RouteTreeSharedProps {}

/**
 * Renders the routes matching the current URL, without client-side routing.
 *
 * Unlike `Router`, it does not intercept navigations: links and form
 * submissions cause regular full page loads, and navigations requested by
 * hooks (e.g. the setter of `useSearchParams`) are performed as full page
 * navigations. This makes it suitable for multi-page applications (MPAs),
 * where each page is a separate document but still uses route definitions
 * to decide what to render.
 *
 * It follows the current location the same way as `Router`: when the
 * Navigation API is available, it reacts to current entry changes (e.g.
 * entry state updates and fragment navigations) and exposes the entry's id,
 * key and state; otherwise, it reads `window.location` and works in all
 * browsers.
 */
export function RouteDisplay(props: RouteDisplayProps): ReactNode {
  // Same adapters as Router, but interception is never set up
  const [adapter] = useState(createDisplayAdapter);

  // useBlocker requires a registry. Blockers never fire because no
  // navigation is intercepted.
  const [blockerRegistry] = useState(() => createBlockerRegistry());

  const location = useLocationEntry(adapter);

  return <RouteTree {...props} {...location} adapter={adapter} blockerRegistry={blockerRegistry} />;
}
