"use client";

import { useLocation, Outlet } from "@funstack/router";

const tabs = [
  { path: "/settings/profile", label: "Profile" },
  { path: "/settings/preferences", label: "Preferences" },
];

export function SettingsLayout() {
  const location = useLocation();
  const pathname = location?.pathname ?? "";

  return (
    <div className="settings-layout">
      <h2>Settings</h2>
      <nav className="settings-tabs">
        {tabs.map((tab) => (
          <a
            key={tab.path}
            href={tab.path}
            className={"tab-link" + (pathname === tab.path ? " active" : "")}
          >
            {tab.label}
          </a>
        ))}
      </nav>
      <div className="settings-content">
        <Outlet />
      </div>
    </div>
  );
}
