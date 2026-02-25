import { NewTaskRedirect } from "./NewTaskRedirect.js";

export function NewTaskForm() {
  return (
    <div className="new-task">
      <h2>Create New Task</h2>
      <NewTaskRedirect />
      <form method="POST" className="task-form">
        <div className="form-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Enter task title"
          />
        </div>
        <div className="form-field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Enter task description"
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Create Task
          </button>
          <a href="/tasks" className="btn">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
