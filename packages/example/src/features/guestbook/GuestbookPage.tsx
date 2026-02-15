import { Suspense, use } from "react";
import { LoadingSpinner } from "../../shared";
import type { GuestbookEntry } from "./types";

/**
 * Example: Form Actions (Route Action Demo)
 *
 * This demonstrates the form action feature:
 * - A native <form method="post"> submits to the route's action
 * - The action processes the FormData and returns a result
 * - The loader receives the action result via `actionResult`
 * - After the action, all loaders are revalidated (fresh data)
 */

type ActionResult =
  | { success: true }
  | { success: false; error: string }
  | null;

type Props = {
  data: Promise<{ entries: GuestbookEntry[]; actionResult: ActionResult }>;
  isPending: boolean;
};

export function GuestbookPage({ data, isPending }: Props) {
  return (
    <div>
      <h1>Guestbook (Form Action Demo)</h1>
      <p style={{ color: "#666" }}>
        Submit a message using a native{" "}
        <code>&lt;form method=&quot;post&quot;&gt;</code>. The router intercepts
        the POST and runs the route&apos;s <code>action</code>.
      </p>

      <Suspense fallback={<LoadingSpinner />}>
        <GuestbookContent data={data} isPending={isPending} />
      </Suspense>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>How it works:</h3>
        <pre
          style={{
            backgroundColor: "#fff",
            padding: "0.5rem",
            overflow: "auto",
          }}
        >{`route({
  path: "guestbook",
  action: async ({ request }) => {
    const formData = await request.formData();
    return addEntry(formData.get("name"), ...);
  },
  loader: async ({ actionResult }) => {
    const entries = await fetchEntries();
    return { entries, actionResult: actionResult ?? null };
  },
  component: GuestbookPage,
});`}</pre>
        <ul style={{ lineHeight: "1.8" }}>
          <li>
            <code>action</code> runs on{" "}
            <code>&lt;form method=&quot;post&quot;&gt;</code> submissions
          </li>
          <li>
            <code>actionResult</code> in the loader contains the action&apos;s
            return value
          </li>
          <li>Loaders revalidate after every action (fresh data)</li>
          <li>
            No wrapper component needed — native <code>&lt;form&gt;</code>{" "}
            elements work
          </li>
        </ul>
      </div>
    </div>
  );
}

function GuestbookContent({
  data,
  isPending,
}: {
  data: Promise<{ entries: GuestbookEntry[]; actionResult: ActionResult }>;
  isPending: boolean;
}) {
  const { entries, actionResult } = use(data);

  return (
    <>
      {actionResult?.success === true && (
        <p
          style={{
            color: "green",
            padding: "0.5rem",
            backgroundColor: "#e8f5e9",
            borderRadius: "4px",
          }}
        >
          Message posted!
        </p>
      )}
      {actionResult?.success === false && (
        <p
          style={{
            color: "red",
            padding: "0.5rem",
            backgroundColor: "#ffebee",
            borderRadius: "4px",
          }}
        >
          Error: {actionResult.error}
        </p>
      )}

      <form
        method="post"
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          border: "1px solid #ddd",
          borderRadius: "4px",
        }}
      >
        <div style={{ marginBottom: "0.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Name:
            <input
              name="name"
              type="text"
              required
              style={{
                display: "block",
                padding: "0.25rem",
                width: "100%",
                maxWidth: "300px",
              }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Message:
            <textarea
              name="message"
              required
              style={{
                display: "block",
                padding: "0.25rem",
                width: "100%",
                maxWidth: "300px",
                height: "80px",
              }}
            />
          </label>
        </div>
        <button type="submit" disabled={isPending}>
          {isPending ? "Posting..." : "Post Message"}
        </button>
      </form>

      <h2>Messages ({entries.length})</h2>
      {entries.length === 0 ? (
        <p style={{ color: "#666" }}>No messages yet. Be the first!</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {entries.map((entry) => (
            <li
              key={entry.id}
              style={{
                padding: "0.75rem",
                marginBottom: "0.5rem",
                backgroundColor: "#fafafa",
                border: "1px solid #eee",
                borderRadius: "4px",
              }}
            >
              <strong>{entry.name}</strong>
              <span
                style={{
                  color: "#999",
                  fontSize: "0.85rem",
                  marginLeft: "0.5rem",
                }}
              >
                {new Date(entry.createdAt).toLocaleString()}
              </span>
              <p style={{ margin: "0.25rem 0 0" }}>{entry.message}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
