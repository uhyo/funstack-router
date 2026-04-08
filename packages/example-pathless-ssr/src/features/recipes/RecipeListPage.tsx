import { RecipeList } from "./RecipeList.js";

export function RecipeListPage() {
  return (
    <div className="recipe-list-page">
      <div className="page-header">
        <h2>Recipes</h2>
        <a href="/recipes/new" className="btn btn-primary">
          New Recipe
        </a>
      </div>
      <RecipeList />
    </div>
  );
}
