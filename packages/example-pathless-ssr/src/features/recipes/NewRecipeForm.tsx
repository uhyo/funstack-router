import { NewRecipeRedirect } from "./NewRecipeRedirect.js";

export function NewRecipeForm() {
  return (
    <div className="new-recipe">
      <h2>Create New Recipe</h2>
      <NewRecipeRedirect />
      <form method="POST" className="recipe-form">
        <div className="form-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Enter recipe title"
          />
        </div>
        <div className="form-field">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            name="description"
            type="text"
            required
            placeholder="Brief description of the recipe"
          />
        </div>
        <div className="form-field">
          <label htmlFor="ingredients">Ingredients (one per line)</label>
          <textarea
            id="ingredients"
            name="ingredients"
            rows={6}
            required
            placeholder={"Flour\nSugar\nButter\nEggs"}
          />
        </div>
        <div className="form-field">
          <label htmlFor="instructions">Instructions</label>
          <textarea
            id="instructions"
            name="instructions"
            rows={4}
            required
            placeholder="Describe the cooking steps"
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Create Recipe
          </button>
          <a href="/recipes" className="btn">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
