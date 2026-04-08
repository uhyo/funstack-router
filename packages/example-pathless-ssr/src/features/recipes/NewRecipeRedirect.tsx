"use client";

import { useEffect } from "react";
import { useRouteData } from "@funstack/router";
import { newRecipeRoute } from "./route.js";

export function NewRecipeRedirect() {
  const data = useRouteData(newRecipeRoute);

  useEffect(() => {
    if (data.createdRecipe) {
      navigation.navigate("/recipes");
    }
  }, [data.createdRecipe]);

  return null;
}
