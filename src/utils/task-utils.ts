import type { Task } from "../types/data-table-types";

// Task-specific helper functions for filtering and counting
// NOTE: These are currently used for client-side processing.
// In production, the backend API should handle filtering, sorting, and pagination.
// For generic table operations (paginate, sort, advanced filters), use table-* functions from @/utils/data-table-utils

export function taskFilter(
  tasks: Task[],
  filters: {
    title?: string;
    status?: string[];
    priority?: string[];
    label?: string[];
    estimatedHours?: [number?, number?];
    createdAt?: [Date?, Date?];
  }
): Task[] {
  return tasks.filter((task) => {
    // Title filter
    if (
      filters.title &&
      !task.title?.toLowerCase().includes(filters.title.toLowerCase())
    ) {
      return false;
    }

    // Status filter
    if (filters.status?.length && !filters.status.includes(task.status)) {
      return false;
    }

    // Priority filter
    if (filters.priority?.length && !filters.priority.includes(task.priority)) {
      return false;
    }

    // Label filter
    if (filters.label?.length && !filters.label.includes(task.label)) {
      return false;
    }

    // Estimated hours filter
    if (filters.estimatedHours?.length) {
      const [min, max] = filters.estimatedHours;
      if (min !== undefined && task.estimatedHours < min) return false;
      if (max !== undefined && task.estimatedHours > max) return false;
    }

    // Created at filter
    if (filters.createdAt?.length) {
      const [startDate, endDate] = filters.createdAt;
      const taskDate = new Date(task.createdAt);
      if (startDate && taskDate < startDate) return false;
      if (endDate && taskDate > endDate) return false;
    }

    return true;
  });
}

// Task-specific count functions for filters
export function taskGetStatusCounts(tasks: Task[]) {
  const counts: Record<"todo" | "in-progress" | "done" | "canceled", number> = { todo: 0, "in-progress": 0, done: 0, canceled: 0 };
  tasks.forEach((task) => {
    if (task.status in counts) {
      counts[task.status as keyof typeof counts]++;
    }
  });
  return counts;
}

export function taskGetPriorityCounts(tasks: Task[]) {
  const counts: Record<"low" | "medium" | "high", number> = { low: 0, medium: 0, high: 0 };
  tasks.forEach((task) => {
    if (task.priority in counts) {
      counts[task.priority as keyof typeof counts]++;
    }
  });
  return counts;
}

export function taskGetEstimatedHoursRange(tasks: Task[]) {
  if (tasks.length === 0) return { min: 0, max: 0 };

  const hours = tasks.map((task) => task.estimatedHours);
  return {
    min: Math.min(...hours),
    max: Math.max(...hours),
  };
}


