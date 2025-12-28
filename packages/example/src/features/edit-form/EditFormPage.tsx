import { useState } from "react";
import { useBlocker, useNavigate } from "@funstack/router";

/**
 * Example: useBlocker hook for preventing navigation with unsaved changes
 *
 * The useBlocker hook prevents navigation away from the current route
 * when there are unsaved changes. This is useful for forms, editors,
 * or any state that would be lost on navigation.
 */
export function EditFormPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);

  const isDirty = title !== "" || content !== "";

  // Block navigation if form has unsaved changes
  useBlocker({
    shouldBlock: () => {
      if (isDirty && !saved) {
        return !confirm(
          "You have unsaved changes. Are you sure you want to leave?",
        );
      }
      return false;
    },
  });

  const handleSave = () => {
    // Simulate saving
    setSaved(true);
    alert("Saved successfully!");
    navigate("/");
  };

  const handleReset = () => {
    setTitle("");
    setContent("");
    setSaved(false);
  };

  return (
    <div>
      <h1>Edit Form (useBlocker Demo)</h1>
      <p style={{ color: "#666" }}>
        Try navigating away with unsaved changes - you&apos;ll see a
        confirmation dialog.
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Title:
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaved(false);
            }}
            style={{ marginLeft: "0.5rem", padding: "0.25rem" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Content:
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setSaved(false);
            }}
            style={{
              display: "block",
              width: "100%",
              maxWidth: "400px",
              height: "100px",
              marginTop: "0.25rem",
              padding: "0.25rem",
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Status:</strong>{" "}
        {isDirty ? (
          saved ? (
            <span style={{ color: "green" }}>Saved</span>
          ) : (
            <span style={{ color: "orange" }}>Unsaved changes</span>
          )
        ) : (
          <span style={{ color: "#666" }}>No changes</span>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={handleSave} disabled={!isDirty || saved}>
          Save
        </button>
        <button onClick={handleReset} disabled={!isDirty}>
          Reset
        </button>
        <a href="/">Go Home</a>
      </div>

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
        >{`useBlocker({
  shouldBlock: () => {
    if (isDirty && !saved) {
      return !confirm("You have unsaved changes...");
    }
    return false;
  },
});`}</pre>
      </div>
    </div>
  );
}
