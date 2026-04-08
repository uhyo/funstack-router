"use client";

import { useRouteParams, useRouteData } from "@funstack/router";
import { recipeDetailRoute } from "./route.js";
import { toggleFavorite } from "../../data/recipes.js";

export function RecipeActions() {
  const { recipeId } = useRouteParams(recipeDetailRoute);
  const recipe = useRouteData(recipeDetailRoute);

  if (!recipe) {
    return (
      <div className="not-found">
        <h2>Recipe not found</h2>
        <p>No recipe with ID &ldquo;{recipeId}&rdquo; exists.</p>
        <a href="/recipes">Back to recipes</a>
      </div>
    );
  }

  const handleToggleFavorite = () => {
    toggleFavorite(recipe.id);
    navigation.navigate(`/recipes/${recipe.id}`);
  };

  return (
    <div className="recipe-detail">
      <div className="recipe-detail-header">
        <h2>{recipe.title}</h2>
        <button
          className={`btn ${recipe.favorite ? "btn-active" : ""}`}
          onClick={handleToggleFavorite}
        >
          {recipe.favorite ? "Unfavorite" : "Favorite"}
        </button>
      </div>
      <p className="recipe-description-text">{recipe.description}</p>
      <p className="recipe-meta">Added: {recipe.createdAt}</p>

      <section className="recipe-section">
        <h3>Ingredients</h3>
        <ul className="ingredient-list">
          {recipe.ingredients.map((ingredient, i) => (
            <li key={i}>{ingredient}</li>
          ))}
        </ul>
      </section>

      <section className="recipe-section">
        <h3>Instructions</h3>
        <p className="recipe-instructions">{recipe.instructions}</p>
      </section>

      <a href="/recipes" className="back-link">
        &larr; Back to recipes
      </a>
    </div>
  );
}
