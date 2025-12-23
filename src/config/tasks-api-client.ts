"use client";

import {
  tablePaginate,
  tableSort,
  tableApplyAdvancedFilters,
} from "@/utils/data-table-utils";
import {
  taskFilter,
  taskGetStatusCounts,
  taskGetPriorityCounts,
  taskGetEstimatedHoursRange,
} from "@/utils/task-utils";
import type { Task } from "@/types/data-table-types";

const DUMMYJSON_BASE_URL = "https://dummyjson.com";

// Transform DummyJSON post to Task
function transformPostToTask(post: any, index: number): Task {
  const statuses: Task["status"][] = ["todo", "in-progress", "done", "canceled"];
  const labels: Task["label"][] = ["bug", "feature", "enhancement", "documentation"];
  const priorities: Task["priority"][] = ["low", "medium", "high"];

  return {
    id: `task_${String(post.id).padStart(3, "0")}`,
    code: `TASK-${1000 + post.id}`,
    title: post.title || `Task ${post.id}`,
    status: statuses[post.id % statuses.length],
    label: labels[post.id % labels.length],
    priority: priorities[post.id % priorities.length],
    estimatedHours: Math.floor((post.id % 20) + 4), // 4-24 hours
    archived: false,
    createdAt: new Date(post.createdAt || new Date(Date.now() - post.id * 86400000)),
    updatedAt: new Date(post.updatedAt || new Date()),
  };
}

// Schema for task fetching parameters
// This matches what the backend API will expect
export interface GetTasksSchema {
  page: number;
  perPage: number;
  sort: Array<{ field: string; desc: boolean }>;
  filters: Array<{
    id: string;
    value: string | string[];
    variant: string;
    operator: string;
    filterId: string;
  }>;
  joinOperator: "and" | "or";
  filterFlag?: string;
  title?: string;
  status: string[];
  priority: string[];
  estimatedHours: number[];
  createdAt: string[];
}

/**
 * Client-side fetch function for tasks
 * Uses DummyJSON API (https://dummyjson.com/posts) and transforms to Task format
 * 
 * @example Future usage with real API:
 * ```ts
 * export async function fetchTasks(params: GetTasksSchema) {
 *   const response = await fetch(`https://api.example.com/tasks?${new URLSearchParams({
 *     page: params.page.toString(),
 *     perPage: params.perPage.toString(),
 *     // ... other params
 *   })}`);
 *   return response.json();
 * }
 * ```
 */
export async function fetchTasks(params: GetTasksSchema): Promise<{
  data: Task[];
  pageCount: number;
}> {
  // Fetch all posts from DummyJSON (we'll filter/paginate client-side for now)
  // In production, you'd want server-side filtering/pagination
  const response = await fetch(`${DUMMYJSON_BASE_URL}/posts?limit=1000&skip=0`);

  if (!response.ok) {
    throw new Error("Failed to fetch tasks from DummyJSON API");
  }

  const postsData = await response.json();
  const posts = postsData.posts || [];

  // Transform posts to tasks
  let filteredTasks = posts.map((post: any, index: number) => transformPostToTask(post, index));

  // Check if we're using advanced filters
  const isAdvancedFiltering =
    params.filterFlag === "advancedFilters" ||
    params.filterFlag === "commandFilters";

  if (isAdvancedFiltering && params.filters.length > 0) {
    // Apply advanced filters (generic)
    filteredTasks = tableApplyAdvancedFilters(
      filteredTasks,
      params.filters as any,
      params.joinOperator
    );
  } else {
    // Apply simple filters (task-specific)
    const filters = {
      title: params.title || undefined,
      status: params.status.length > 0 ? params.status : undefined,
      priority: params.priority.length > 0 ? params.priority : undefined,
      estimatedHours:
        params.estimatedHours.length > 0
          ? ([params.estimatedHours[0], params.estimatedHours[1]] as [
            number?,
            number?
          ])
          : undefined,
      createdAt:
        params.createdAt.length > 0
          ? ([
            params.createdAt[0] ? new Date(params.createdAt[0]) : undefined,
            params.createdAt[1] ? new Date(params.createdAt[1]) : undefined,
          ] as [Date?, Date?])
          : undefined,
    };

    filteredTasks = taskFilter(filteredTasks, filters);
  }

  // Apply sorting (generic)
  if (params.sort.length > 0) {
    const sortBy = params.sort.map((sort) => ({
      id: sort.field as keyof Task,
      desc: sort.desc,
    }));
    filteredTasks = tableSort(filteredTasks, sortBy);
  }

  // Apply pagination (generic)
  const { data, pageCount } = tablePaginate<Task>(
    filteredTasks,
    params.page,
    params.perPage
  );

  return { data, pageCount };
}

/**
 * Client-side fetch function for task counts
 * Uses DummyJSON API and transforms to Task format for counting
 */
export async function fetchTaskCounts(): Promise<{
  statusCounts: {
    todo: number;
    "in-progress": number;
    done: number;
    canceled: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
  };
  estimatedHoursRange: {
    min: number;
    max: number;
  };
}> {
  // Fetch posts from DummyJSON
  const response = await fetch(`${DUMMYJSON_BASE_URL}/posts?limit=1000&skip=0`);

  if (!response.ok) {
    throw new Error("Failed to fetch task counts from DummyJSON API");
  }

  const postsData = await response.json();
  const posts = postsData.posts || [];

  // Transform posts to tasks for counting
  const allTasks = posts.map((post: any, index: number) => transformPostToTask(post, index));

  return {
    statusCounts: taskGetStatusCounts(allTasks),
    priorityCounts: taskGetPriorityCounts(allTasks),
    estimatedHoursRange: taskGetEstimatedHoursRange(allTasks),
  };
}

