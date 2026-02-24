import { TaskList } from "./TaskList.js";

export function TaskListPage() {
  return (
    <div className="task-list-page">
      <div className="page-header">
        <h2>Tasks</h2>
        <a href="/tasks/new" className="btn btn-primary">
          New Task
        </a>
      </div>
      <TaskList />
    </div>
  );
}
