"use client";

import { useEffect } from "react";
import { useRouteData } from "@funstack/router";
import { newTaskRoute } from "./route.js";

export function NewTaskRedirect() {
  const data = useRouteData(newTaskRoute);

  useEffect(() => {
    if (data.createdTask) {
      navigation.navigate("/tasks");
    }
  }, [data.createdTask]);

  return null;
}
