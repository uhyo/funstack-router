import { route } from "@funstack/router/server";
import { Layout } from "./components/Layout.js";
import { HomePage } from "./pages/HomePage.js";
import { GettingStartedPage } from "./pages/GettingStartedPage.js";
import { ApiReferencePage } from "./pages/ApiReferencePage.js";
import { ApiReferenceIndexPage } from "./pages/ApiReferenceIndexPage.js";
import { ApiComponentsPage } from "./pages/ApiComponentsPage.js";
import { ApiHooksPage } from "./pages/ApiHooksPage.js";
import { ApiUtilitiesPage } from "./pages/ApiUtilitiesPage.js";
import { ApiTypesPage } from "./pages/ApiTypesPage.js";
import { LearnPage } from "./pages/LearnPage.js";
import { LearnIndexPage } from "./pages/LearnIndexPage.js";
import { LearnNavigationApiPage } from "./pages/LearnNavigationApiPage.js";
import { LearnNestedRoutesPage } from "./pages/LearnNestedRoutesPage.js";
import { LearnTypeSafetyPage } from "./pages/LearnTypeSafetyPage.js";
import { LearnSsrPage } from "./pages/LearnSsrPage.js";
import { ExamplesPage } from "./pages/ExamplesPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";
import { ClientApp } from "./ClientApp.js";

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
        path: "/learn",
        component: LearnPage,
        children: [
          route({
            path: "/",
            component: LearnIndexPage,
          }),
          route({
            path: "/navigation-api",
            component: LearnNavigationApiPage,
          }),
          route({
            path: "/nested-routes",
            component: LearnNestedRoutesPage,
          }),
          route({
            path: "/type-safety",
            component: LearnTypeSafetyPage,
          }),
          route({
            path: "/server-side-rendering",
            component: LearnSsrPage,
          }),
        ],
      }),
      route({
        path: "/api",
        component: ApiReferencePage,
        children: [
          route({
            path: "/",
            component: ApiReferenceIndexPage,
          }),
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
      route({
        component: NotFoundPage,
      }),
    ],
  }),
];

export default function App() {
  return <ClientApp routes={routes} />;
}
