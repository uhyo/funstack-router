import type { Recipe } from "../features/recipes/types.js";

const recipes: Recipe[] = [
  {
    id: "1",
    title: "Classic Margherita Pizza",
    description:
      "A simple Italian pizza with fresh tomatoes, mozzarella, and basil.",
    ingredients: [
      "Pizza dough",
      "San Marzano tomatoes",
      "Fresh mozzarella",
      "Fresh basil",
      "Olive oil",
      "Salt",
    ],
    instructions:
      "Preheat oven to 475\u00b0F. Roll out dough, spread crushed tomatoes, add torn mozzarella. Bake 10\u201312 minutes. Top with fresh basil and a drizzle of olive oil.",
    favorite: false,
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    title: "Chicken Stir-Fry",
    description:
      "A quick weeknight stir-fry with vegetables and a savory sauce.",
    ingredients: [
      "Chicken breast",
      "Bell peppers",
      "Broccoli",
      "Soy sauce",
      "Sesame oil",
      "Garlic",
      "Ginger",
      "Rice",
    ],
    instructions:
      "Slice chicken and vegetables. Heat sesame oil in a wok. Cook chicken until golden, then add vegetables. Stir in soy sauce, garlic, and ginger. Serve over steamed rice.",
    favorite: true,
    createdAt: "2024-01-16",
  },
  {
    id: "3",
    title: "Banana Pancakes",
    description:
      "Fluffy pancakes made with ripe bananas for natural sweetness.",
    ingredients: [
      "Ripe bananas",
      "Eggs",
      "Flour",
      "Baking powder",
      "Milk",
      "Butter",
      "Maple syrup",
    ],
    instructions:
      "Mash bananas, mix with eggs and milk. Fold in flour and baking powder. Cook on a buttered griddle until bubbles form, then flip. Serve with maple syrup.",
    favorite: true,
    createdAt: "2024-01-17",
  },
  {
    id: "4",
    title: "Caesar Salad",
    description:
      "Crisp romaine lettuce with homemade Caesar dressing and croutons.",
    ingredients: [
      "Romaine lettuce",
      "Parmesan cheese",
      "Croutons",
      "Egg yolk",
      "Lemon juice",
      "Garlic",
      "Anchovies",
      "Olive oil",
    ],
    instructions:
      "Whisk egg yolk, lemon juice, minced garlic, and anchovies. Slowly drizzle in olive oil. Toss chopped romaine with dressing, top with shaved Parmesan and croutons.",
    favorite: false,
    createdAt: "2024-01-18",
  },
];

let nextId = 5;

export function getRecipes(): Recipe[] {
  return [...recipes];
}

export function getRecipe(id: string): Recipe | undefined {
  return recipes.find((r) => r.id === id);
}

export function createRecipe(
  title: string,
  description: string,
  ingredients: string,
  instructions: string,
): Recipe {
  const recipe: Recipe = {
    id: String(nextId++),
    title,
    description,
    ingredients: ingredients
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    instructions,
    favorite: false,
    createdAt: new Date().toISOString().split("T")[0]!,
  };
  recipes.push(recipe);
  return recipe;
}

export function getFavorites(): Recipe[] {
  return recipes.filter((r) => r.favorite);
}

export function toggleFavorite(id: string): Recipe | undefined {
  const recipe = recipes.find((r) => r.id === id);
  if (recipe) {
    recipe.favorite = !recipe.favorite;
  }
  return recipe;
}
