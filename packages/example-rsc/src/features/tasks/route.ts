import { route } from "@funstack/router/server";
import {
  loadTaskList,
  loadTaskDetail,
  createTaskAction,
  loadNewTaskResult,
} from "./loaders.js";

export const taskListRoute = route({
  id: "taskList",
  path: "/",
  loader: loadTaskList,
});

export const newTaskRoute = route({
  id: "newTask",
  path: "/new",
  action: createTaskAction,
  loader: loadNewTaskResult,
});

export const taskDetailRoute = route({
  id: "taskDetail",
  path: "/:taskId",
  loader: loadTaskDetail,
});
