import { route } from "@funstack/router/server";
import {
  loadRecipeList,
  loadRecipeDetail,
  createRecipeAction,
  loadNewRecipeResult,
} from "./loaders.js";

export const recipeListRoute = route({
  id: "recipeList",
  path: "/recipes",
  loader: loadRecipeList,
});

export const newRecipeRoute = route({
  id: "newRecipe",
  path: "/recipes/new",
  action: createRecipeAction,
  loader: loadNewRecipeResult,
});

export const recipeDetailRoute = route({
  id: "recipeDetail",
  path: "/recipes/:recipeId",
  loader: loadRecipeDetail,
});
