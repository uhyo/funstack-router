"use client";

import type { RouteComponentPropsOf } from "@funstack/router";
import { useRouteData } from "@funstack/router";
import { favoritesRoute } from "./route.js";
import type { FavoritesState } from "./route.js";

type Props = RouteComponentPropsOf<typeof favoritesRoute>;

const defaultState: FavoritesState = {
  sortBy: "name",
};

export function FavoritesList({ state, setStateSync }: Props) {
  const recipes = useRouteData(favoritesRoute);
  const { sortBy } = state ?? defaultState;

  const sorted = [...recipes].sort((a, b) => {
    if (sortBy === "date") {
      return b.createdAt.localeCompare(a.createdAt);
    }
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="favorites-page">
      <h2>Favorites</h2>
      <div className="favorites-controls">
        <label htmlFor="sortBy">Sort by: </label>
        <select
          id="sortBy"
          value={sortBy}
          onChange={(e) =>
            setStateSync((prev) => ({
              ...defaultState,
              ...prev,
              sortBy: e.target.value as "name" | "date",
            }))
          }
        >
          <option value="name">Name</option>
          <option value="date">Date Added</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="empty-state">
          No favorites yet. Browse <a href="/recipes">recipes</a> and mark some
          as favorites!
        </p>
      ) : (
        <ul className="recipe-list">
          {sorted.map((recipe) => (
            <li key={recipe.id} className="recipe-item">
              <a href={`/recipes/${recipe.id}`} className="recipe-link">
                <div className="recipe-info">
                  <span className="recipe-title">{recipe.title}</span>
                  <span className="recipe-description">
                    {recipe.description}
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="favorites-state-preview">
        <h4>Route State</h4>
        <pre>{JSON.stringify(state ?? defaultState, null, 2)}</pre>
      </div>
    </div>
  );
}
