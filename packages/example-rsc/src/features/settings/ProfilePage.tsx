export function ProfilePage() {
  return (
    <div className="profile-page">
      <h3>Profile</h3>
      <p>This is a server component rendered at build time via RSC.</p>

      <div className="profile-card">
        <div className="profile-field">
          <span className="profile-label">Name</span>
          <span className="profile-value">Demo User</span>
        </div>
        <div className="profile-field">
          <span className="profile-label">Email</span>
          <span className="profile-value">demo@example.com</span>
        </div>
        <div className="profile-field">
          <span className="profile-label">Role</span>
          <span className="profile-value">Developer</span>
        </div>
      </div>
    </div>
  );
}
