import { Router, route } from "@funstack/router";
import { Layout } from "./components/Layout.js";
import { HomePage } from "./pages/HomePage.js";
import { GettingStartedPage } from "./pages/GettingStartedPage.js";
import { ApiReferencePage } from "./pages/ApiReferencePage.js";
import { ApiComponentsPage } from "./pages/ApiComponentsPage.js";
import { ApiHooksPage } from "./pages/ApiHooksPage.js";
import { ApiUtilitiesPage } from "./pages/ApiUtilitiesPage.js";
import { ApiTypesPage } from "./pages/ApiTypesPage.js";
import { LearnPage } from "./pages/LearnPage.js";
import { LearnNavigationApiPage } from "./pages/LearnNavigationApiPage.js";
import { LearnNestedRoutesPage } from "./pages/LearnNestedRoutesPage.js";
import { LearnTypeSafetyPage } from "./pages/LearnTypeSafetyPage.js";
import { ExamplesPage } from "./pages/ExamplesPage.js";
import { useEffect } from "react";

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
        ],
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
  // Auto scroll to top - this should be handled by the browser per spec,
  // but currently Chrome and Safari do not follow the spec.
  useEffect(() => {
    // @ts-expect-error -- TypeScript does not yet know about the Navigation API
    const navigation = window.navigation;
    if (!navigation) {
      return;
    }
    const controller = new AbortController();
    navigation.addEventListener(
      "navigatesuccess",
      () => {
        const transition = navigation.transition;
        if (
          transition.navigationType === "push" ||
          transition.navigationType === "replace"
        ) {
          window.scrollTo(0, 0);
        }
      },
      { signal: controller.signal },
    );
    return () => {
      controller.abort();
    };
  }, []);

  return <Router routes={routes} fallback="static" />;
}
