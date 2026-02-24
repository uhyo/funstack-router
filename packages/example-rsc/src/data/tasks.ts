import type { Task } from "../features/tasks/types.js";

const tasks: Task[] = [
  {
    id: "1",
    title: "Set up project structure",
    description: "Initialize the monorepo and configure build tools.",
    status: "done",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    title: "Design route architecture",
    description: "Plan the route structure using two-phase definitions.",
    status: "in-progress",
    createdAt: "2024-01-16",
  },
  {
    id: "3",
    title: "Implement task list page",
    description: "Create a page that displays all tasks with filtering.",
    status: "todo",
    createdAt: "2024-01-17",
  },
  {
    id: "4",
    title: "Add styling",
    description: "Create CSS styles for the task manager UI.",
    status: "todo",
    createdAt: "2024-01-18",
  },
];

let nextId = 5;

export function getTasks(): Task[] {
  return [...tasks];
}

export function getTask(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function createTask(title: string, description: string): Task {
  const task: Task = {
    id: String(nextId++),
    title,
    description,
    status: "todo",
    createdAt: new Date().toISOString().split("T")[0]!,
  };
  tasks.push(task);
  return task;
}

export function updateTaskStatus(
  id: string,
  status: Task["status"],
): Task | undefined {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.status = status;
  }
  return task;
}

export function deleteTask(id: string): boolean {
  const index = tasks.findIndex((t) => t.id === id);
  if (index !== -1) {
    tasks.splice(index, 1);
    return true;
  }
  return false;
}
