import { useState } from "react";

export function NotificationsTab() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  return (
    <div>
      <h2>Notification Settings</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={emailNotifs}
            onChange={(e) => setEmailNotifs(e.target.checked)}
          />
          Email Notifications
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={pushNotifs}
            onChange={(e) => setPushNotifs(e.target.checked)}
          />
          Push Notifications
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={weeklyDigest}
            onChange={(e) => setWeeklyDigest(e.target.checked)}
          />
          Weekly Digest
        </label>
      </div>
      <button type="button" style={{ marginTop: "1rem" }}>
        Save Preferences
      </button>
    </div>
  );
}
