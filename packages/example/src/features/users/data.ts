import type { User } from "./types";

// Sample user data (simulating a database)
const users: User[] = [
  { id: "1", name: "Alice", role: "Admin" },
  { id: "2", name: "Bob", role: "User" },
  { id: "3", name: "Charlie", role: "User" },
];

// Simulated async data fetching (would be API calls in real app)
export async function fetchUsers(): Promise<User[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return users;
}

export async function fetchUser(id: string): Promise<User | null> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return users.find((u) => u.id === id) || null;
}
