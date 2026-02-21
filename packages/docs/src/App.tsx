import { lazy } from "react";
import { route } from "@funstack/router/server";
import { defer } from "@funstack/static/server";
import { Layout } from "./components/Layout.js";
import { ApiReferencePage } from "./pages/ApiReferencePage.js";
import { LearnPage } from "./pages/LearnPage.js";
import { ClientApp } from "./ClientApp.js";
import { Outlet } from "@funstack/router";

const HomePage = lazy(() =>
  import("./pages/HomePage.js").then((m) => ({ default: m.HomePage })),
);
const GettingStartedPage = lazy(() =>
  import("./pages/GettingStartedPage.js").then((m) => ({
    default: m.GettingStartedPage,
  })),
);
const LearnIndexPage = lazy(() =>
  import("./pages/LearnIndexPage.js").then((m) => ({
    default: m.LearnIndexPage,
  })),
);
const LearnNavigationApiPage = lazy(() =>
  import("./pages/LearnNavigationApiPage.js").then((m) => ({
    default: m.LearnNavigationApiPage,
  })),
);
const LearnNestedRoutesPage = lazy(() =>
  import("./pages/LearnNestedRoutesPage.js").then((m) => ({
    default: m.LearnNestedRoutesPage,
  })),
);
const LearnTypeSafetyPage = lazy(() =>
  import("./pages/LearnTypeSafetyPage.js").then((m) => ({
    default: m.LearnTypeSafetyPage,
  })),
);
const LearnSsrBasicPage = lazy(() =>
  import("./pages/LearnSsrBasicPage.js").then((m) => ({
    default: m.LearnSsrBasicPage,
  })),
);
const LearnSsgPage = lazy(() =>
  import("./pages/LearnSsgPage.js").then((m) => ({ default: m.LearnSsgPage })),
);
const LearnSsrWithLoadersPage = lazy(() =>
  import("./pages/LearnSsrWithLoadersPage.js").then((m) => ({
    default: m.LearnSsrWithLoadersPage,
  })),
);
const LearnRscPage = lazy(() =>
  import("./pages/LearnRscPage.js").then((m) => ({ default: m.LearnRscPage })),
);
const LearnTransitionsPage = lazy(() =>
  import("./pages/LearnTransitionsPage.js").then((m) => ({
    default: m.LearnTransitionsPage,
  })),
);
const ApiReferenceIndexPage = lazy(() =>
  import("./pages/ApiReferenceIndexPage.js").then((m) => ({
    default: m.ApiReferenceIndexPage,
  })),
);
const ApiComponentsPage = lazy(() =>
  import("./pages/ApiComponentsPage.js").then((m) => ({
    default: m.ApiComponentsPage,
  })),
);
const ApiHooksPage = lazy(() =>
  import("./pages/ApiHooksPage.js").then((m) => ({
    default: m.ApiHooksPage,
  })),
);
const ApiUtilitiesPage = lazy(() =>
  import("./pages/ApiUtilitiesPage.js").then((m) => ({
    default: m.ApiUtilitiesPage,
  })),
);
const ApiTypesPage = lazy(() =>
  import("./pages/ApiTypesPage.js").then((m) => ({
    default: m.ApiTypesPage,
  })),
);
const ExamplesPage = lazy(() =>
  import("./pages/ExamplesPage.js").then((m) => ({
    default: m.ExamplesPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage.js").then((m) => ({
    default: m.NotFoundPage,
  })),
);

const routes = [
  route({
    component: (
      // Note: somehow the Suspense here causes issues with hydration.
      // <Suspense fallback={null}>
      <Outlet />
      // </Suspense>
    ),
    children: [
      route({
        component: <Layout />,
        children: [
          route({
            path: "/",
            component: defer(<HomePage />, { name: "HomePage" }),
          }),
          route({
            path: "/getting-started",
            component: defer(<GettingStartedPage />, {
              name: "GettingStartedPage",
            }),
          }),
          route({
            path: "/learn",
            component: LearnPage,
            children: [
              route({
                path: "/",
                component: defer(<LearnIndexPage />, {
                  name: "LearnIndexPage",
                }),
              }),
              route({
                path: "/navigation-api",
                component: defer(<LearnNavigationApiPage />, {
                  name: "LearnNavigationApiPage",
                }),
              }),
              route({
                path: "/nested-routes",
                component: defer(<LearnNestedRoutesPage />, {
                  name: "LearnNestedRoutesPage",
                }),
              }),
              route({
                path: "/type-safety",
                component: defer(<LearnTypeSafetyPage />, {
                  name: "LearnTypeSafetyPage",
                }),
              }),
              route({
                path: "/ssr",
                component: <Outlet />,
                children: [
                  route({
                    path: "/",
                    component: defer(<LearnSsrBasicPage />, {
                      name: "LearnSsrBasicPage",
                    }),
                  }),
                  route({
                    path: "/static-site-generation",
                    component: defer(<LearnSsgPage />, {
                      name: "LearnSsgPage",
                    }),
                  }),
                  route({
                    path: "/with-loaders",
                    component: defer(<LearnSsrWithLoadersPage />, {
                      name: "LearnSsrWithLoadersPage",
                    }),
                  }),
                ],
              }),
              route({
                path: "/react-server-components",
                component: defer(<LearnRscPage />, {
                  name: "LearnRscPage",
                }),
              }),
              route({
                path: "/transitions",
                component: defer(<LearnTransitionsPage />, {
                  name: "LearnTransitionsPage",
                }),
              }),
            ],
          }),
          route({
            path: "/api",
            component: ApiReferencePage,
            children: [
              route({
                path: "/",
                component: defer(<ApiReferenceIndexPage />, {
                  name: "ApiReferenceIndexPage",
                }),
              }),
              route({
                path: "/components",
                component: defer(<ApiComponentsPage />, {
                  name: "ApiComponentsPage",
                }),
              }),
              route({
                path: "/hooks",
                component: defer(<ApiHooksPage />, {
                  name: "ApiHooksPage",
                }),
              }),
              route({
                path: "/utilities",
                component: defer(<ApiUtilitiesPage />, {
                  name: "ApiUtilitiesPage",
                }),
              }),
              route({
                path: "/types",
                component: defer(<ApiTypesPage />, {
                  name: "ApiTypesPage",
                }),
              }),
            ],
          }),
          route({
            path: "/examples",
            component: defer(<ExamplesPage />, { name: "ExamplesPage" }),
          }),
          route({
            path: "/*",
            component: defer(<NotFoundPage />, { name: "NotFoundPage" }),
          }),
        ],
      }),
    ],
  }),
];

export default function App() {
  return <ClientApp routes={routes} />;
}
