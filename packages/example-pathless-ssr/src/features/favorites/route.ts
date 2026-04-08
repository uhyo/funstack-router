import { routeState } from "@funstack/router/server";
import { loadFavorites } from "./loaders.js";

export type FavoritesState = {
  sortBy: "name" | "date";
};

export const favoritesRoute = routeState<FavoritesState>()({
  id: "favorites",
  path: "/favorites",
  loader: loadFavorites,
});
