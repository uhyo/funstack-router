import { routeState } from "@funstack/router";
import { NavigationOptionsPage } from "./NavigationOptionsPage";

type PageState = {
  navigatedWith: "push" | "replace";
  timestamp: number;
};

export const navigationOptionsRoute = routeState<PageState>()({
  path: "nav-options",
  component: NavigationOptionsPage,
});
