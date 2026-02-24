export function DashboardPage() {
  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <p>
        Welcome to the Task Manager! This app demonstrates{" "}
        <strong>two-phase route definitions</strong> with FUNSTACK Router and
        React Server Components.
      </p>

      <div className="dashboard-cards">
        <a href="/tasks" className="dashboard-card">
          <h3>Tasks</h3>
          <p>View and manage your tasks. Demonstrates loaders and params.</p>
        </a>
        <a href="/tasks/new" className="dashboard-card">
          <h3>New Task</h3>
          <p>Create a new task. Demonstrates route actions with forms.</p>
        </a>
        <a href="/settings/profile" className="dashboard-card">
          <h3>Settings</h3>
          <p>
            Configure your profile and preferences. Demonstrates nested routes
            and route state.
          </p>
        </a>
      </div>

      <section className="dashboard-info">
        <h3>Route Features Demonstrated</h3>
        <ul>
          <li>
            <strong>Loaders</strong> &mdash; Task list and detail pages fetch
            data via typed loaders
          </li>
          <li>
            <strong>Params</strong> &mdash; Task detail page uses typed{" "}
            <code>useRouteParams</code>
          </li>
          <li>
            <strong>Actions</strong> &mdash; New task form uses a route action
            for form submission
          </li>
          <li>
            <strong>Route State</strong> &mdash; Preferences page uses{" "}
            <code>routeState</code> for navigation-persisted state
          </li>
          <li>
            <strong>Nested Routes</strong> &mdash; Settings section uses nested
            layouts with <code>bindRoute</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
