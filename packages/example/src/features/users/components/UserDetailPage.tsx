import { Suspense } from "react";
import { LoadingSpinner } from "../../../shared";
import { UserDetail } from "./UserDetail";
import type { User } from "../types";

type Props = {
  data: Promise<User | null>;
};

export function UserDetailPage({ data }: Props) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <UserDetail data={data} />
    </Suspense>
  );
}
