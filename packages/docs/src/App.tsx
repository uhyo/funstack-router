import { Router, route } from "@funstack/router";
import { Layout } from "./components/Layout.js";
import { HomePage } from "./pages/HomePage.js";
import { GettingStartedPage } from "./pages/GettingStartedPage.js";
import { ApiReferencePage } from "./pages/ApiReferencePage.js";
import { ApiComponentsPage } from "./pages/ApiComponentsPage.js";
import { ApiHooksPage } from "./pages/ApiHooksPage.js";
import { ApiUtilitiesPage } from "./pages/ApiUtilitiesPage.js";
import { ApiTypesPage } from "./pages/ApiTypesPage.js";
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
        children: [
          route({
            path: "/components",
            component: ApiComponentsPage,
          }),
          route({
            path: "/hooks",
            component: ApiHooksPage,
          }),
          route({
            path: "/utilities",
            component: ApiUtilitiesPage,
          }),
          route({
            path: "/types",
            component: ApiTypesPage,
          }),
        ],
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
