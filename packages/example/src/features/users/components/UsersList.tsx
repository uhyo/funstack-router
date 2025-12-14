import { use } from "react";
import type { User } from "../types";

type Props = {
  data: Promise<User[]>;
};

export function UsersList({ data }: Props) {
  const userList = use(data);

  return (
    <div>
      <h1>Users</h1>
      <p style={{ color: "#666", fontSize: "0.9rem" }}>
        (Data loaded via async loader with Suspense)
      </p>
      <div>
        {userList.map((user) => (
          <div key={user.id} className="user-card">
            <strong>{user.name}</strong> - {user.role}
            <br />
            <a href={`/users/${user.id}`}>View Profile</a>
          </div>
        ))}
      </div>
    </div>
  );
}
