import { TasksTableClient } from "@/components/organisms/TaskTable/tasks-table-client";

export default function TasksPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-muted-foreground mt-2">
          Manage and filter your tasks with advanced filtering capabilities
        </p>
      </div>
      <TasksTableClient />
    </div>
  );
}
