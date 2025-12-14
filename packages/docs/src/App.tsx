import { Router, route } from "@funstack/router";
import { Layout } from "./components/Layout.js";
import { HomePage } from "./pages/HomePage.js";
import { GettingStartedPage } from "./pages/GettingStartedPage.js";
import { ApiReferencePage } from "./pages/ApiReferencePage.js";
import { ExamplesPage } from "./pages/ExamplesPage.js";

const routes = [
  route({
    path: "/funstack-router",
    component: Layout,
    children: [
      route({
        path: "/",
        component: HomePage,
      }),
      route({
        path: "/getting-started",
        component: GettingStartedPage,
      }),
      route({
        path: "/api",
        component: ApiReferencePage,
      }),
      route({
        path: "/examples",
        component: ExamplesPage,
      }),
    ],
  }),
];

export function App() {
  return <Router routes={routes} fallback="static" />;
}
