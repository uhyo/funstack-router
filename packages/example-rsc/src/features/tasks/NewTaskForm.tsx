"use client";

import { useEffect } from "react";
import { useNavigate, useRouteData } from "@funstack/router";
import { newTaskRoute } from "./route.js";

export function NewTaskForm() {
  const navigate = useNavigate();
  const data = useRouteData(newTaskRoute);

  useEffect(() => {
    if (data.createdTask) {
      navigate("/tasks");
    }
  }, [data.createdTask, navigate]);

  return (
    <div className="new-task">
      <h2>Create New Task</h2>
      <form method="POST" className="task-form">
        <div className="form-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Enter task title"
          />
        </div>
        <div className="form-field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Enter task description"
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Create Task
          </button>
          <a href="/tasks" className="btn">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
