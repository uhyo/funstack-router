import type { GuestbookEntry } from "./types";

// In-memory guestbook entries (simulating a database)
const entries: GuestbookEntry[] = [
  {
    id: "1",
    name: "Alice",
    message: "Hello from Alice! This is a great site.",
    createdAt: "2026-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "Bob",
    message: "Nice router! Love the Navigation API support.",
    createdAt: "2026-02-01T14:00:00Z",
  },
];

let nextId = 3;

// Simulated async data fetching
export async function fetchEntries(): Promise<GuestbookEntry[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [...entries].reverse();
}

// Simulated async entry creation
export async function addEntry(
  name: string,
  message: string,
): Promise<{ success: true } | { success: false; error: string }> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (!name.trim()) {
    return { success: false, error: "Name is required." };
  }
  if (!message.trim()) {
    return { success: false, error: "Message is required." };
  }

  entries.push({
    id: String(nextId++),
    name: name.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString(),
  });

  return { success: true };
}
