import { use } from "react";
import { useNavigate } from "@funstack/router";
import type { User } from "../types";

type Props = {
  data: Promise<User | null>;
};

export function UserDetail({ data }: Props) {
  const user = use(data);
  const navigate = useNavigate();

  if (!user) {
    return (
      <div>
        <h1>User Not Found</h1>
        <p>The requested user does not exist.</p>
        <button onClick={() => navigate("/users")}>Back to Users</button>
      </div>
    );
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p style={{ color: "#666", fontSize: "0.9rem" }}>
        (Data loaded via async loader with Suspense)
      </p>
      <p>
        <strong>ID:</strong> {user.id}
      </p>
      <p>
        <strong>Role:</strong> {user.role}
      </p>
      <button onClick={() => navigate("/users")}>Back to Users</button>
    </div>
  );
}
