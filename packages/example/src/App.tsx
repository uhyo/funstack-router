import { Router, route } from "@funstack/router";
import type { OnNavigateCallback } from "@funstack/router";
import { Layout } from "./shared";
import { homeRoute } from "./features/home";
import { aboutRoute } from "./features/about";
import { usersRoutes } from "./features/users";
import { searchRoute } from "./features/search";
import { editFormRoute } from "./features/edit-form";
import { counterRoute } from "./features/counter";
import { navigationOptionsRoute } from "./features/navigation-options";
import { settingsRoute } from "./features/settings";

const routes = [
  route({
    path: "/",
    component: Layout,
    children: [
      homeRoute,
      aboutRoute,
      ...usersRoutes,
      searchRoute,
      editFormRoute,
      counterRoute,
      navigationOptionsRoute,
      settingsRoute,
    ],
  }),
];

/**
 * Example: onNavigate callback for analytics/logging
 *
 * This callback fires before every navigation is handled.
 * Use it for analytics, logging, or even preventing navigation.
 */
const handleNavigate: OnNavigateCallback = (event, matched) => {
  // Log navigation for analytics
  console.log("[Analytics] Navigation:", {
    url: event.destination.url,
    navigationType: event.navigationType,
    matchedRoutes: matched?.map((m) => m.route.path) ?? null,
  });

  // Example: You can prevent navigation by calling event.preventDefault()
  // if (someCondition) {
  //   event.preventDefault();
  // }
};

export function App() {
  return <Router routes={routes} onNavigate={handleNavigate} />;
}
