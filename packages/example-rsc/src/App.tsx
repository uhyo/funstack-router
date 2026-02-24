import { bindRoute, route } from "@funstack/router/server";
import { Outlet } from "@funstack/router";
import { ClientApp } from "./ClientApp.js";
import { Layout } from "./components/Layout.js";

// Phase 1 route imports (shared modules — loaders/actions are client references)
import { dashboardRoute } from "./features/dashboard/route.js";
import {
  taskListRoute,
  taskDetailRoute,
  newTaskRoute,
} from "./features/tasks/route.js";
import {
  settingsRoute,
  profileRoute,
  preferencesRoute,
} from "./features/settings/route.js";

// Server component imports
import { DashboardPage } from "./features/dashboard/DashboardPage.js";
import { TaskListPage } from "./features/tasks/TaskListPage.js";
import { TaskDetailPage } from "./features/tasks/TaskDetailPage.js";
import { ProfilePage } from "./features/settings/ProfilePage.js";

// Client component imports
import { NewTaskForm } from "./features/tasks/NewTaskForm.js";
import { SettingsLayout } from "./features/settings/SettingsLayout.js";
import { PreferencesPanel } from "./features/settings/PreferencesPanel.js";

// Phase 2: Bind components to routes and assemble the route tree.
// Loader/action functions are client references from "use client" modules,
// so the resulting route tree is fully serializable across the RSC boundary.
export const routes = [
  route({
    component: <Layout />,
    children: [
      bindRoute(dashboardRoute, {
        component: <DashboardPage />,
      }),
      route({
        path: "/tasks",
        component: <Outlet />,
        children: [
          bindRoute(taskListRoute, {
            component: <TaskListPage />,
          }),
          bindRoute(newTaskRoute, {
            component: <NewTaskForm />,
          }),
          bindRoute(taskDetailRoute, {
            component: <TaskDetailPage />,
          }),
        ],
      }),
      bindRoute(settingsRoute, {
        component: <SettingsLayout />,
        children: [
          bindRoute(profileRoute, {
            component: <ProfilePage />,
          }),
          bindRoute(preferencesRoute, {
            component: PreferencesPanel,
          }),
        ],
      }),
    ],
  }),
];

export default function App({ ssrPath }: { ssrPath?: string }) {
  return <ClientApp routes={routes} ssrPath={ssrPath} />;
}
