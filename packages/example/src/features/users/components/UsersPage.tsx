import { Suspense } from "react";
import { LoadingSpinner } from "../../../shared";
import { UsersList } from "./UsersList";
import type { User } from "../types";

type Props = {
  data: Promise<User[]>;
};

export function UsersPage({ data }: Props) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <UsersList data={data} />
    </Suspense>
  );
}
