"use client";

import { useEffect } from "react";
import { useNavigate, useRouteData } from "@funstack/router";
import { newTaskRoute } from "./route.js";

export function NewTaskRedirect() {
  const navigate = useNavigate();
  const data = useRouteData(newTaskRoute);

  useEffect(() => {
    if (data.createdTask) {
      navigate("/tasks");
    }
  }, [data.createdTask, navigate]);

  return null;
}
