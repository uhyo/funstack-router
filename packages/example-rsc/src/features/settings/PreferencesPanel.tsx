"use client";

import type { RouteComponentPropsOf } from "@funstack/router";
import type { preferencesRoute } from "./route.js";
import type { PreferencesState } from "./route.js";

type Props = RouteComponentPropsOf<typeof preferencesRoute>;

const defaultPreferences: PreferencesState = {
  theme: "light",
  notifications: true,
};

export function PreferencesPanel({ state, setStateSync }: Props) {
  const prefs = state ?? defaultPreferences;

  return (
    <div className="preferences-panel">
      <h3>Preferences</h3>
      <p className="preferences-description">
        These preferences are stored in the navigation state. They persist
        across back/forward navigation but reset on page reload.
      </p>

      <div className="preference-item">
        <label htmlFor="theme">Theme</label>
        <select
          id="theme"
          value={prefs.theme}
          onChange={(e) =>
            setStateSync((prev) => ({
              ...defaultPreferences,
              ...prev,
              theme: e.target.value as "light" | "dark",
            }))
          }
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div className="preference-item">
        <label htmlFor="notifications">
          <input
            id="notifications"
            type="checkbox"
            checked={prefs.notifications}
            onChange={(e) =>
              setStateSync((prev) => ({
                ...defaultPreferences,
                ...prev,
                notifications: e.target.checked,
              }))
            }
          />
          Enable notifications
        </label>
      </div>

      <div className="preferences-preview">
        <h4>Current State</h4>
        <pre>{JSON.stringify(prefs, null, 2)}</pre>
      </div>
    </div>
  );
}
