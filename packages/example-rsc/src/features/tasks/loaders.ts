"use client";

import type { ActionArgs, LoaderArgs } from "@funstack/router";
import { getTasks, getTask, createTask } from "../../data/tasks.js";
import type { Task } from "./types.js";

export function loadTaskList(): Task[] {
  return getTasks();
}

export function loadTaskDetail({
  params,
}: LoaderArgs<{ taskId: string }>): Task | undefined {
  return getTask(params.taskId);
}

export async function createTaskAction({
  request,
}: ActionArgs<Record<string, never>>): Promise<Task> {
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  return createTask(title, description);
}

export function loadNewTaskResult({
  actionResult,
}: LoaderArgs<Record<string, never>, Task>): {
  createdTask: Task | null;
} {
  return { createdTask: actionResult ?? null };
}
