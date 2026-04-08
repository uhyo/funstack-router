"use client";

import { getFavorites } from "../../data/recipes.js";
import type { Recipe } from "../recipes/types.js";

export function loadFavorites(): Recipe[] {
  return getFavorites();
}
