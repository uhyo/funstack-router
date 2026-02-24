"use client";

import { useRouteData } from "@funstack/router";
import { taskListRoute } from "./route.js";

const statusLabels: Record<string, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

export function TaskList() {
  const tasks = useRouteData(taskListRoute);

  if (tasks.length === 0) {
    return <p className="empty-state">No tasks yet. Create one!</p>;
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li key={task.id} className={`task-item status-${task.status}`}>
          <a href={`/tasks/${task.id}`} className="task-link">
            <span className="task-title">{task.title}</span>
            <span className={`task-status badge-${task.status}`}>
              {statusLabels[task.status] ?? task.status}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
