export function AccountTab() {
  return (
    <div>
      <h2>Account Settings</h2>
      <div style={{ marginBottom: "1.5rem" }}>
        <h3>Email</h3>
        <p>john.doe@example.com</p>
        <button type="button">Change Email</button>
      </div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h3>Password</h3>
        <p>••••••••</p>
        <button type="button">Change Password</button>
      </div>
      <div>
        <h3 style={{ color: "#dc3545" }}>Danger Zone</h3>
        <button
          type="button"
          style={{
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
