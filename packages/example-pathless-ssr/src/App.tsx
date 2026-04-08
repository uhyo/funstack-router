import { bindRoute, route } from "@funstack/router/server";
import { ClientApp } from "./ClientApp.js";
import { Layout } from "./components/Layout.js";

// Phase 1 route imports (shared modules — loaders/actions are client references)
import { homeRoute } from "./features/home/route.js";
import {
  recipeListRoute,
  recipeDetailRoute,
  newRecipeRoute,
} from "./features/recipes/route.js";
import { favoritesRoute } from "./features/favorites/route.js";

// Server component imports
import { HomePage } from "./features/home/HomePage.js";
import { RecipeListPage } from "./features/recipes/RecipeListPage.js";
import { RecipeDetailPage } from "./features/recipes/RecipeDetailPage.js";
import { NewRecipeForm } from "./features/recipes/NewRecipeForm.js";

// Client component imports (passed as function reference to receive route props)
import { FavoritesList } from "./features/favorites/FavoritesList.js";

// Phase 2: Bind components to routes and assemble the route tree.
// The root Layout is a pathless route — it has no `path` property, so it
// always matches. During SSR (without the `ssr` prop), only this pathless
// layout renders, producing an app shell. Path-based children render on
// the client after hydration.
export const routes = [
  route({
    component: <Layout />,
    children: [
      bindRoute(homeRoute, {
        component: <HomePage />,
      }),
      bindRoute(recipeListRoute, {
        component: <RecipeListPage />,
      }),
      bindRoute(newRecipeRoute, {
        component: <NewRecipeForm />,
      }),
      bindRoute(recipeDetailRoute, {
        component: <RecipeDetailPage />,
      }),
      bindRoute(favoritesRoute, {
        component: FavoritesList,
      }),
    ],
  }),
];

export default function App() {
  return <ClientApp routes={routes} />;
}
