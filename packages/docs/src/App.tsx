import { route } from "@funstack/router/server";
import { defer } from "@funstack/static/server";
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
    component: Layout,
    children: [
      route({
        path: "/funstack-router",
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
                path: "/server-side-rendering",
                component: defer(<LearnSsrPage />, { name: "LearnSsrPage" }),
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
                component: defer(<ApiHooksPage />, { name: "ApiHooksPage" }),
              }),
              route({
                path: "/utilities",
                component: defer(<ApiUtilitiesPage />, {
                  name: "ApiUtilitiesPage",
                }),
              }),
              route({
                path: "/types",
                component: defer(<ApiTypesPage />, { name: "ApiTypesPage" }),
              }),
            ],
          }),
          route({
            path: "/examples",
            component: defer(<ExamplesPage />, { name: "ExamplesPage" }),
          }),
          route({
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
