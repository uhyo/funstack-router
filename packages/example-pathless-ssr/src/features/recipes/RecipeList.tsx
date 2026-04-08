"use client";

import { useRouteData } from "@funstack/router";
import { recipeListRoute } from "./route.js";

export function RecipeList() {
  const recipes = useRouteData(recipeListRoute);

  if (recipes.length === 0) {
    return <p className="empty-state">No recipes yet. Create one!</p>;
  }

  return (
    <ul className="recipe-list">
      {recipes.map((recipe) => (
        <li key={recipe.id} className="recipe-item">
          <a href={`/recipes/${recipe.id}`} className="recipe-link">
            <div className="recipe-info">
              <span className="recipe-title">{recipe.title}</span>
              <span className="recipe-description">{recipe.description}</span>
            </div>
            {recipe.favorite && <span className="recipe-favorite">*</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
