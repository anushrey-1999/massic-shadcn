"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import { TasksTable } from "./task-table";
import { DataTableSkeleton } from "../../filter-table/data-table-skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { fetchTasks, fetchTaskCounts } from "../../../config/tasks-api-client";

export function TasksTableClient() {
  // Read query parameters from URL
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [sort] = useQueryState(
    "sort",
    parseAsJson<Array<{ id: string; desc: boolean }>>((value) => {
      if (Array.isArray(value)) {
        return value as Array<{ id: string; desc: boolean }>;
      }
      return null;
    }).withDefault([])
  );
  const [filters] = useQueryState(
    "filters",
    parseAsJson<
      Array<{
        id: string;
        value: string | string[];
        variant: string;
        operator: string;
        filterId: string;
      }>
    >((value) => {
      if (Array.isArray(value)) {
        return value as Array<{
          id: string;
          value: string | string[];
          variant: string;
          operator: string;
          filterId: string;
        }>;
      }
      return null;
    }).withDefault([])
  );
  const [joinOperator] = useQueryState(
    "joinOperator",
    parseAsString.withDefault("and")
  );

  // Optimize query key serialization for better caching
  const queryKey = React.useMemo(
    () => ["tasks", page, perPage, JSON.stringify(sort), JSON.stringify(filters), joinOperator],
    [page, perPage, sort, filters, joinOperator]
  );

  // Fetch tasks data with improved error handling
  // Using client-side fetch function (can be easily replaced with real API call)
  const { 
    data: tasksData, 
    isLoading: tasksLoading, 
    isFetching: tasksFetching,
    isError: tasksError,
    error: tasksErrorData,
    refetch: refetchTasks
  } = useQuery({
    queryKey,
    queryFn: async () => {
      return fetchTasks({
        page,
        perPage,
        sort: sort || [],
        filters: filters || [],
        joinOperator: (joinOperator || "and") as "and" | "or",
        filterFlag: "advancedFilters",
        title: undefined,
        status: [],
        priority: [],
        estimatedHours: [],
        createdAt: [],
      });
    },
    staleTime: 1000 * 60, // 1 minute
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch counts and ranges (these don't depend on filters)
  // Using client-side fetch function (can be easily replaced with real API call)
  const { 
    data: countsData,
    isError: countsError,
    error: countsErrorData,
    refetch: refetchCounts
  } = useQuery({
    queryKey: ["task-counts"],
    queryFn: async () => {
      return fetchTaskCounts();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Show skeleton on initial load (better UX than plain text)
  if (tasksLoading && !tasksData) {
    return <DataTableSkeleton columnCount={6} rowCount={10} />;
  }

  // Show error state for tasks
  if (tasksError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load tasks</p>
        <p className="text-sm text-muted-foreground">
          {tasksErrorData instanceof Error ? tasksErrorData.message : "An error occurred"}
        </p>
        <Button onClick={() => refetchTasks()}>Try Again</Button>
      </div>
    );
  }

  // Show loading state if counts haven't loaded yet (but tasks have)
  if (!countsData && !countsError) {
    return <DataTableSkeleton columnCount={6} rowCount={10} />;
  }

  // Show error for counts (but still show tasks if available)
  if (countsError && !countsData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load filter options</p>
        <p className="text-sm text-muted-foreground">
          {countsErrorData instanceof Error ? countsErrorData.message : "An error occurred"}
        </p>
        <Button onClick={() => refetchCounts()}>Try Again</Button>
      </div>
    );
  }

  // Always render the table (even with empty data) so filters, toolbar, and pagination remain visible
  // The table itself will show "No results." in the table body when there's no data
  return (
    <div className="relative">
      {/* Subtle loading indicator when refetching (data already visible) */}
      {tasksFetching && tasksData && (
        <div className="absolute top-2 right-2 z-10">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        </div>
      )}
      <TasksTable
        data={tasksData?.data || []}
        pageCount={tasksData?.pageCount || 0}
        statusCounts={
          countsData?.statusCounts || {
            todo: 0,
            "in-progress": 0,
            done: 0,
            canceled: 0,
          }
        }
        priorityCounts={
          countsData?.priorityCounts || { low: 0, medium: 0, high: 0 }
        }
        estimatedHoursRange={
          countsData?.estimatedHoursRange || { min: 0, max: 0 }
        }
      />
    </div>
  );
}

