export function ProfileTab() {
  return (
    <div>
      <h2>Profile Settings</h2>
      <form>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Display Name
          </label>
          <input
            type="text"
            defaultValue="John Doe"
            style={{ padding: "0.5rem", width: "100%", maxWidth: "300px" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Bio
          </label>
          <textarea
            defaultValue="Hello, I'm using FUNSTACK Router!"
            style={{
              padding: "0.5rem",
              width: "100%",
              maxWidth: "300px",
              height: "80px",
            }}
          />
        </div>
        <button type="button">Save Profile</button>
      </form>
    </div>
  );
}
