import { lazy, type ReactElement, type ReactNode } from "react";
import { PageMeta } from "./pageMeta.js";
import { route } from "@funstack/router/server";
import { defer } from "@funstack/static/server";
import { Layout } from "./components/Layout.js";
import { ApiReferencePage } from "./pages/ApiReferencePage.js";
import { LearnPage } from "./pages/LearnPage.js";
import { ClientApp } from "./ClientApp.js";
import { Outlet } from "@funstack/router";

const HomePage = lazy(() => import("./pages/HomePage.js").then((m) => ({ default: m.HomePage })));
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
const LearnRouteDefinitionsPage = lazy(() =>
  import("./pages/LearnRouteDefinitionsPage.js").then((m) => ({
    default: m.LearnRouteDefinitionsPage,
  })),
);
const LearnActionsPage = lazy(() =>
  import("./pages/LearnActionsPage.js").then((m) => ({
    default: m.LearnActionsPage,
  })),
);
const LearnErrorHandlingPage = lazy(() =>
  import("./pages/LearnErrorHandlingPage.js").then((m) => ({
    default: m.LearnErrorHandlingPage,
  })),
);
const LearnTransitionsPage = lazy(() =>
  import("./pages/LearnTransitionsPage.js").then((m) => ({
    default: m.LearnTransitionsPage,
  })),
);
const LearnLoadersPage = lazy(() =>
  import("./pages/LearnLoadersPage.js").then((m) => ({
    default: m.LearnLoadersPage,
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
const FaqPage = lazy(() =>
  import("./pages/FaqPage.js").then((m) => ({
    default: m.FaqPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage.js").then((m) => ({
    default: m.NotFoundPage,
  })),
);

function withMeta(path: string, node: ReactNode): ReactElement {
  return (
    <>
      <PageMeta path={path} />
      {node}
    </>
  );
}

export const routes = [
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
            component: defer(withMeta("/", <HomePage />), { name: "HomePage" }),
          }),
          route({
            path: "/getting-started",
            component: defer(withMeta("/getting-started", <GettingStartedPage />), {
              name: "GettingStartedPage",
            }),
          }),
          route({
            path: "/learn",
            component: LearnPage,
            children: [
              route({
                path: "/",
                component: defer(withMeta("/learn", <LearnIndexPage />), {
                  name: "LearnIndexPage",
                }),
              }),
              route({
                path: "/navigation-api",
                component: defer(withMeta("/learn/navigation-api", <LearnNavigationApiPage />), {
                  name: "LearnNavigationApiPage",
                }),
              }),
              route({
                path: "/nested-routes",
                component: defer(withMeta("/learn/nested-routes", <LearnNestedRoutesPage />), {
                  name: "LearnNestedRoutesPage",
                }),
              }),
              route({
                path: "/type-safety",
                component: defer(withMeta("/learn/type-safety", <LearnTypeSafetyPage />), {
                  name: "LearnTypeSafetyPage",
                }),
              }),
              route({
                path: "/ssr",
                component: <Outlet />,
                children: [
                  route({
                    path: "/",
                    component: defer(withMeta("/learn/ssr", <LearnSsrBasicPage />), {
                      name: "LearnSsrBasicPage",
                    }),
                  }),
                  route({
                    path: "/static-site-generation",
                    component: defer(
                      withMeta("/learn/ssr/static-site-generation", <LearnSsgPage />),
                      {
                        name: "LearnSsgPage",
                      },
                    ),
                  }),
                  route({
                    path: "/with-loaders",
                    component: defer(
                      withMeta("/learn/ssr/with-loaders", <LearnSsrWithLoadersPage />),
                      {
                        name: "LearnSsrWithLoadersPage",
                      },
                    ),
                  }),
                ],
              }),
              route({
                path: "/rsc",
                component: <Outlet />,
                children: [
                  route({
                    path: "/",
                    component: defer(withMeta("/learn/rsc", <LearnRscPage />), {
                      name: "LearnRscPage",
                    }),
                  }),
                  route({
                    path: "/route-features",
                    component: defer(
                      withMeta("/learn/rsc/route-features", <LearnRouteDefinitionsPage />),
                      {
                        name: "LearnRouteDefinitionsPage",
                      },
                    ),
                  }),
                ],
              }),
              route({
                path: "/actions",
                component: defer(withMeta("/learn/actions", <LearnActionsPage />), {
                  name: "LearnActionsPage",
                }),
              }),
              route({
                path: "/error-handling",
                component: defer(withMeta("/learn/error-handling", <LearnErrorHandlingPage />), {
                  name: "LearnErrorHandlingPage",
                }),
              }),
              route({
                path: "/transitions",
                component: defer(withMeta("/learn/transitions", <LearnTransitionsPage />), {
                  name: "LearnTransitionsPage",
                }),
              }),
              route({
                path: "/loaders",
                component: defer(withMeta("/learn/loaders", <LearnLoadersPage />), {
                  name: "LearnLoadersPage",
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
                component: defer(withMeta("/api", <ApiReferenceIndexPage />), {
                  name: "ApiReferenceIndexPage",
                }),
              }),
              route({
                path: "/components",
                component: defer(withMeta("/api/components", <ApiComponentsPage />), {
                  name: "ApiComponentsPage",
                }),
              }),
              route({
                path: "/hooks",
                component: defer(withMeta("/api/hooks", <ApiHooksPage />), {
                  name: "ApiHooksPage",
                }),
              }),
              route({
                path: "/utilities",
                component: defer(withMeta("/api/utilities", <ApiUtilitiesPage />), {
                  name: "ApiUtilitiesPage",
                }),
              }),
              route({
                path: "/types",
                component: defer(withMeta("/api/types", <ApiTypesPage />), {
                  name: "ApiTypesPage",
                }),
              }),
            ],
          }),
          route({
            path: "/examples",
            component: defer(withMeta("/examples", <ExamplesPage />), { name: "ExamplesPage" }),
          }),
          route({
            path: "/faq",
            component: defer(withMeta("/faq", <FaqPage />), { name: "FaqPage" }),
          }),
          route({
            path: "/*",
            component: defer(withMeta("/*", <NotFoundPage />), { name: "NotFoundPage" }),
          }),
        ],
      }),
    ],
  }),
];

export default function App({ ssrPath }: { ssrPath?: string }) {
  return <ClientApp routes={routes} ssrPath={ssrPath} />;
}
