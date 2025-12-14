import { Router, route } from "@funstack/router";
import { Layout } from "./shared";
import { homeRoute } from "./features/home";
import { aboutRoute } from "./features/about";
import { usersRoutes } from "./features/users";
import { searchRoute } from "./features/search";

const routes = [
  route({
    path: "/",
    component: Layout,
    children: [homeRoute, aboutRoute, ...usersRoutes, searchRoute],
  }),
];

export function App() {
  return <Router routes={routes} />;
}
