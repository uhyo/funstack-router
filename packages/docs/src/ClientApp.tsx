"use client";

import { useEffect } from "react";
import { Router, type RouteDefinition } from "@funstack/router";
import "./styles.css";

export function ClientApp({ routes, ssrPath }: { routes: RouteDefinition[]; ssrPath?: string }) {
  // Auto scroll to top - this should be handled by the browser per spec,
  // but Safari and older versions of Chrome do not follow the spec (Chrome 153+ does).
  useEffect(() => {
    const navigation = window.navigation;
    if (!navigation) {
      return;
    }
    const controller = new AbortController();
    navigation.addEventListener(
      "navigatesuccess",
      () => {
        const transition = navigation.transition;
        if (transition?.navigationType === "push" || transition?.navigationType === "replace") {
          // Safari is known to ignore scrolling immediately after a push/replace navigation, so we wait a bit
          // Also, Safari doesn't handle scrolling to 0, so we use the -1 trick
          setTimeout(() => {
            window.scrollTo(0, -1);
          }, 10);
        }
      },
      { signal: controller.signal },
    );
    return () => {
      controller.abort();
    };
  }, []);

  return <Router routes={routes} fallback="static" ssr={ssrPath ? { path: ssrPath } : undefined} />;
}
