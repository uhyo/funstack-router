"use client";

import type { ActionArgs, LoaderArgs } from "@funstack/router";
import { getRecipes, getRecipe, createRecipe } from "../../data/recipes.js";
import type { Recipe } from "./types.js";

export function loadRecipeList(): Recipe[] {
  return getRecipes();
}

export function loadRecipeDetail({
  params,
}: LoaderArgs<{ recipeId: string }>): Recipe | undefined {
  return getRecipe(params.recipeId);
}

export async function createRecipeAction({
  request,
}: ActionArgs<Record<string, never>>): Promise<Recipe> {
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const ingredients = formData.get("ingredients") as string;
  const instructions = formData.get("instructions") as string;
  return createRecipe(title, description, ingredients, instructions);
}

export function loadNewRecipeResult({
  actionResult,
}: LoaderArgs<Record<string, never>, Recipe>): {
  createdRecipe: Recipe | null;
} {
  return { createdRecipe: actionResult ?? null };
}
