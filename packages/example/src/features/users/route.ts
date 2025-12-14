import { route } from "@funstack/router";
import { UsersPage, UserDetailPage } from "./components";
import { fetchUsers, fetchUser } from "./data";

export const usersRoutes = [
  route({
    path: "users",
    component: UsersPage,
    loader: () => fetchUsers(),
  }),
  route({
    path: "users/:id",
    component: UserDetailPage,
    loader: ({ params }) => fetchUser(params.id),
  }),
];
