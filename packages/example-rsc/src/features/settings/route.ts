import { route, routeState } from "@funstack/router/server";

export const settingsRoute = route({
  id: "settings",
  path: "/settings",
});

export const profileRoute = route({
  id: "profile",
  path: "/profile",
});

export type PreferencesState = {
  theme: "light" | "dark";
  notifications: boolean;
};

export const preferencesRoute = routeState<PreferencesState>()({
  id: "preferences",
  path: "/preferences",
});
