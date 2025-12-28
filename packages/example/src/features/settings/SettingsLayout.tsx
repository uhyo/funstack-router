import { Outlet, useLocation } from "@funstack/router";

/**
 * Example: Nested Routing with Layout
 *
 * This demonstrates multi-level nested routing with a sidebar layout.
 * The settings area has its own sub-navigation with profile, account, and notifications tabs.
 */

const tabs = [
  { path: "/settings/profile", label: "Profile" },
  { path: "/settings/account", label: "Account" },
  { path: "/settings/notifications", label: "Notifications" },
];

export function SettingsLayout() {
  const location = useLocation();

  return (
    <div>
      <h1>Settings (Nested Routing Demo)</h1>
      <p style={{ color: "#666" }}>
        This demonstrates deep nesting: App Layout &gt; Settings Layout &gt; Tab
        Content
      </p>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        {/* Sidebar navigation */}
        <nav
          style={{
            minWidth: "150px",
            borderRight: "1px solid #ddd",
            paddingRight: "1rem",
          }}
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <li key={tab.path} style={{ marginBottom: "0.5rem" }}>
                  <a
                    href={tab.path}
                    style={{
                      display: "block",
                      padding: "0.5rem",
                      borderRadius: "4px",
                      textDecoration: "none",
                      backgroundColor: isActive ? "#007bff" : "transparent",
                      color: isActive ? "white" : "#007bff",
                    }}
                  >
                    {tab.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Tab content rendered via Outlet */}
        <div style={{ flex: 1, padding: "0 1rem" }}>
          <Outlet />
        </div>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>Route Structure:</h3>
        <pre
          style={{
            backgroundColor: "#fff",
            padding: "0.5rem",
            overflow: "auto",
          }}
        >{`route({
  path: "settings",
  component: SettingsLayout,  // Has <Outlet />
  children: [
    route({ path: "profile", component: ProfileTab }),
    route({ path: "account", component: AccountTab }),
    route({ path: "notifications", component: NotificationsTab }),
  ],
})`}</pre>
      </div>
    </div>
  );
}
