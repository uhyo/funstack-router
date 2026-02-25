import { Outlet } from "@funstack/router";
import { NavLink } from "../../components/NavLink.js";

const tabs = [
  { path: "/settings/profile", label: "Profile" },
  { path: "/settings/preferences", label: "Preferences" },
];

export function SettingsLayout() {
  return (
    <div className="settings-layout">
      <h2>Settings</h2>
      <nav className="settings-tabs">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            href={tab.path}
            className="tab-link"
            activeClassName="active"
            exact
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="settings-content">
        <Outlet />
      </div>
    </div>
  );
}
