import { use } from "react";
import type { User } from "../types";

type Props = {
  data: Promise<User | null>;
};

export function UserDetail({ data }: Props) {
  const user = use(data);

  if (!user) {
    return (
      <div>
        <h1>User Not Found</h1>
        <p>The requested user does not exist.</p>
        <button onClick={() => navigation.navigate("/users")}>
          Back to Users
        </button>
      </div>
    );
  }

  const userId = parseInt(user.id, 10);
  const prevId = userId > 1 ? userId - 1 : null;
  const nextId = userId < 3 ? userId + 1 : null;

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
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        {prevId !== null ? (
          <a href={`/users/${prevId}`}>← Previous User</a>
        ) : (
          <span style={{ color: "#999" }}>← Previous User</span>
        )}
        {nextId !== null ? (
          <a href={`/users/${nextId}`}>Next User →</a>
        ) : (
          <span style={{ color: "#999" }}>Next User →</span>
        )}
      </div>
      <button
        onClick={() => navigation.navigate("/users")}
        style={{ marginTop: "1rem" }}
      >
        Back to Users
      </button>
    </div>
  );
}
