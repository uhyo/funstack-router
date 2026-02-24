"use client";

import { useRouteParams, useRouteData, useNavigate } from "@funstack/router";
import { taskDetailRoute } from "./route.js";
import { updateTaskStatus, deleteTask } from "../../data/tasks.js";

const statusOptions: {
  value: "todo" | "in-progress" | "done";
  label: string;
}[] = [
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export function TaskActions() {
  const { taskId } = useRouteParams(taskDetailRoute);
  const task = useRouteData(taskDetailRoute);
  const navigate = useNavigate();

  if (!task) {
    return (
      <div className="not-found">
        <h2>Task not found</h2>
        <p>No task with ID &ldquo;{taskId}&rdquo; exists.</p>
        <a href="/tasks">Back to tasks</a>
      </div>
    );
  }

  const handleStatusChange = (newStatus: "todo" | "in-progress" | "done") => {
    updateTaskStatus(task.id, newStatus);
    navigate(`/tasks/${task.id}`);
  };

  const handleDelete = () => {
    deleteTask(task.id);
    navigate("/tasks");
  };

  return (
    <div className="task-detail">
      <div className="task-detail-header">
        <h2>{task.title}</h2>
        <span className={`task-status badge-${task.status}`}>
          {statusOptions.find((s) => s.value === task.status)?.label}
        </span>
      </div>
      <p className="task-description">{task.description}</p>
      <p className="task-meta">Created: {task.createdAt}</p>

      <div className="task-actions">
        <div className="status-actions">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={`btn ${task.status === option.value ? "btn-active" : ""}`}
              onClick={() => handleStatusChange(option.value)}
              disabled={task.status === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button className="btn btn-danger" onClick={handleDelete}>
          Delete Task
        </button>
      </div>

      <a href="/tasks" className="back-link">
        &larr; Back to tasks
      </a>
    </div>
  );
}
