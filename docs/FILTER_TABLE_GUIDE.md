# Filter Table Component - Complete Flow Guide

This guide explains the complete flow of the filter-table component system from initialization to rendering, so you can use it generically across all your pages.

## 📋 Table of Contents
1. [File Structure](#file-structure)
2. [Architecture Overview](#architecture-overview)
3. [Complete Flow Diagram](#complete-flow-diagram)
4. [Step-by-Step Flow](#step-by-step-flow)
5. [Generic Implementation Guide](#generic-implementation-guide)
6. [Key Components Explained](#key-components-explained)
7. [Configuration Options](#configuration-options)

---

## 📁 File Structure

The filter-table system follows a clear separation between **generic** (reusable) and **table-specific** components:

```
src/
├── components/
│   ├── filter-table/              # ✅ Generic components (reusable)
│   │   ├── data-table.tsx
│   │   ├── data-table-pagination.tsx
│   │   ├── data-table-filter-list.tsx
│   │   ├── data-table-sort-list.tsx
│   │   ├── data-table-advanced-toolbar.tsx
│   │   └── ... (all generic table components)
│   │
│   └── organisms/                 # ✅ Table-specific components
│       └── TaskTable/
│           ├── task-table.tsx              # Table component
│           ├── tasks-table-client.tsx      # Client component (data fetching)
│           └── tasks-table-columns.tsx     # Column definitions
│
├── hooks/
│   └── use-data-table.ts          # ✅ Generic hook (reusable)
│
├── utils/
│   ├── data-table-utils.ts        # ✅ Generic utilities (table-* functions)
│   └── task-utils.ts              # ✅ Task-specific utilities (task-* functions)
│
├── config/
│   └── tasks-api-client.ts        # ✅ Task-specific API client
│
└── types/
    └── data-table-types.ts        # ✅ Generic types
```

### **Naming Convention:**

- **Generic functions:** `table-*` prefix (e.g., `tablePaginate`, `tableSort`)
- **Table-specific functions:** `{table}-*` prefix (e.g., `taskFilter`, `taskGetStatusCounts`)

### **Import Paths:**

```typescript
// Generic components (reusable)
import { DataTable } from "@/components/filter-table";
import { useDataTable } from "@/hooks/use-data-table";
import { tablePaginate, tableSort } from "@/utils/data-table-utils";

// Table-specific components
import { TasksTable } from "@/components/organisms/TaskTable/task-table";
import { TasksTableClient } from "@/components/organisms/TaskTable/tasks-table-client";
import { taskFilter } from "@/utils/task-utils";
import { fetchTasks } from "@/config/tasks-api-client";
```

---

## 🏗️ Architecture Overview

The filter-table system consists of three main layers:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Page Component (Server/Client)               │
│  - Reads URL query params                              │
│  - Fetches data from API                               │
│  - Passes data to table component                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Table Component (Client)                      │
│  - Defines columns with metadata                        │
│  - Uses useDataTable hook                              │
│  - Renders DataTable with toolbar                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Core Hooks & Components                       │
│  - useDataTable: Manages state & URL sync              │
│  - DataTable: Renders table UI                         │
│  - Filter/Sort components: User interactions           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Flow Diagram

```
1. User visits page
   ↓
2. Page component (TasksTableClient) reads URL query params
   ↓
3. React Query fetches data from API with query params
   ↓
4. API route processes filters/sort/pagination
   ↓
5. Data returned to page component
   ↓
6. Page component passes data to Table component (TasksTable)
   ↓
7. Table component:
   - Defines columns with metadata
   - Calls useDataTable hook
   ↓
8. useDataTable hook:
   - Syncs state with URL query params (nuqs)
   - Creates TanStack Table instance
   - Returns table object
   ↓
9. Table component renders:
   - DataTableAdvancedToolbar (contains filters & sorts)
   - DataTable (renders actual table)
   - DataTablePagination
   ↓
10. User interacts (filter/sort/paginate)
    ↓
11. useDataTable updates URL query params
    ↓
12. URL change triggers React Query refetch
    ↓
13. Cycle repeats from step 3
```

---

## 📝 Step-by-Step Flow

### **Step 1: Page Component Setup (Client Component)**

The page component is responsible for:
- Reading URL query parameters
- Fetching data from your API
- Passing data to the table component

**Example: `src/components/organisms/TaskTable/tasks-table-client.tsx`**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsJson } from "nuqs";
import { TasksTable } from "./task-table";
import { fetchTasks, fetchTaskCounts } from "@/config/tasks-api-client";

export function TasksTableClient() {
  // 1. Read query parameters from URL
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [sort] = useQueryState("sort", parseAsJson<Array<{ id: string; desc: boolean }>>().withDefault([]));
  const [filters] = useQueryState("filters", parseAsJson<Array<{...}>>().withDefault([]));
  const [joinOperator] = useQueryState("joinOperator", parseAsString.withDefault("and"));

  // 2. Fetch data using React Query
  const { data: tasksData } = useQuery({
    queryKey: ["tasks", page, perPage, sort, filters, joinOperator],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
        sort: JSON.stringify(sort || []),
        filters: JSON.stringify(filters || []),
        joinOperator: joinOperator || "and",
      });
      const response = await fetch(`/api/tasks?${params}`);
      return response.json();
    },
  });

  // 3. Fetch metadata (counts, ranges) separately
  const { data: countsData } = useQuery({
    queryKey: ["task-counts"],
    queryFn: async () => {
      const response = await fetch("/api/tasks/counts");
      return response.json();
    },
  });

  // 4. Pass data to table component
  return (
    <TasksTable
      data={tasksData?.data || []}
      pageCount={tasksData?.pageCount || 0}
      statusCounts={countsData?.statusCounts}
      priorityCounts={countsData?.priorityCounts}
      estimatedHoursRange={countsData?.estimatedHoursRange}
    />
  );
}
```

**Key Points:**
- Uses `nuqs` to read URL query params
- Uses React Query to fetch data
- Separates data fetching from table logic
- Passes all required props to table component

---

### **Step 2: Table Component Setup**

The table component:
- Defines column structure with metadata
- Uses `useDataTable` hook
- Renders the table UI

**Example: `src/components/organisms/TaskTable/task-table.tsx`**

```typescript
"use client";

import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/filter-table/data-table";
import { DataTableAdvancedToolbar } from "@/components/filter-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "@/components/filter-table/data-table-filter-list";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { getTasksTableColumns } from "./tasks-table-columns";

export function TasksTable({ data, pageCount, statusCounts, ... }) {
  // 1. Define columns with metadata
  const columns = React.useMemo(
    () => getTasksTableColumns({ statusCounts, priorityCounts, estimatedHoursRange }),
    [statusCounts, priorityCounts, estimatedHoursRange]
  );

  // 2. Use the useDataTable hook
  const { table } = useDataTable({
    data,                    // Your data array
    columns,                 // Column definitions
    pageCount,               // Total pages (for pagination)
    enableAdvancedFilter: true,  // Use advanced filtering
    getRowId: (row) => row.id,   // Unique row identifier
  });

  // 3. Render the table
  return (
    <DataTable table={table}>
      <DataTableAdvancedToolbar table={table}>
        <DataTableSortList table={table} />
        <DataTableFilterList table={table} />
      </DataTableAdvancedToolbar>
    </DataTable>
  );
}
```

---

### **Step 3: Column Definitions**

Columns define:
- How data is displayed
- Filter metadata (variant, operators, options)
- Sort capabilities

**Example: `src/components/organisms/TaskTable/tasks-table-columns.tsx`**

```typescript
export function getTasksTableColumns({ statusCounts, ... }): ColumnDef<Task>[] {
  return [
    {
      id: "title",
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Title" />
      ),
      cell: ({ row }) => row.getValue("title"),
      // Filter metadata
      meta: {
        label: "Title",
        placeholder: "Search titles...",
        variant: "text",        // Filter type: text, number, date, select, etc.
        icon: Text,
      },
      enableColumnFilter: true,  // Enable filtering for this column
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ cell }) => <Badge>{cell.getValue()}</Badge>,
      meta: {
        label: "Status",
        variant: "multiSelect",  // Multi-select filter
        options: [
          { label: "Todo", value: "todo", count: statusCounts.todo },
          { label: "In Progress", value: "in-progress", count: statusCounts["in-progress"] },
          // ...
        ],
        icon: CircleDashed,
      },
      enableColumnFilter: true,
    },
    {
      id: "estimatedHours",
      accessorKey: "estimatedHours",
      meta: {
        label: "Est. Hours",
        variant: "range",       // Range slider filter
        range: [min, max],       // Min/max values
        unit: "hr",
      },
      enableColumnFilter: true,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      meta: {
        label: "Created At",
        variant: "dateRange",   // Date range picker
        icon: CalendarIcon,
      },
      enableColumnFilter: true,
    },
  ];
}
```

**Filter Variants:**
- `text` - Text input
- `number` - Number input
- `range` - Range slider
- `date` - Single date picker
- `dateRange` - Date range picker
- `select` - Single select dropdown
- `multiSelect` - Multi-select with badges
- `boolean` - True/False select

---

### **Step 4: useDataTable Hook (Core Logic)**

The `useDataTable` hook is the heart of the system. It:

1. **Syncs state with URL query params** using `nuqs`
2. **Creates TanStack Table instance** with all configurations
3. **Manages pagination, sorting, filtering state**
4. **Returns table object** for rendering

**Key responsibilities:**

```typescript
export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  // 1. Sync pagination with URL
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));

  // 2. Sync sorting with URL
  const [sorting, setSorting] = useQueryState(
    "sort",
    getSortingStateParser<TData>(columnIds).withDefault([])
  );

  // 3. Sync filters with URL (if advanced filtering enabled)
  const [filters, setFilters] = useQueryState(
    "filters",
    getFiltersStateParser<TData>(columnIds).withDefault([])
  );

  // 4. Create TanStack Table instance
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize: perPage },
      sorting,
      columnFilters,
      // ...
    },
    manualPagination: true,  // Server-side pagination
    manualSorting: true,      // Server-side sorting
    manualFiltering: true,    // Server-side filtering
    // ...
  });

  return { table };
}
```

**Important:**
- All state is synced with URL query params
- Uses `manualPagination/Sorting/Filtering: true` for server-side operations
- Debounces filter changes (300ms default)
- Automatically resets to page 1 when filters change

---

### **Step 5: User Interactions**

When a user interacts with the table:

**Filtering:**
1. User clicks "Filter" button → Opens `DataTableFilterList`
2. User adds/edits filter → Updates filter state
3. `useDataTable` debounces and updates URL query param
4. URL change triggers React Query refetch
5. New data is fetched and displayed

**Sorting:**
1. User clicks column header → Updates sort state
2. `useDataTable` updates URL query param
3. React Query refetches with new sort
4. Data is re-sorted and displayed

**Pagination:**
1. User changes page/size → Updates pagination state
2. `useDataTable` updates URL query params
3. React Query refetches with new page
4. New page of data is displayed

---

### **Step 6: API Route Processing**

Your API route receives query params and processes them:

**Example: `app/api/tasks/route.ts`**

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("perPage") || "10", 10);
  const sort = JSON.parse(searchParams.get("sort") || "[]");
  const filters = JSON.parse(searchParams.get("filters") || "[]");
  const joinOperator = searchParams.get("joinOperator") || "and";

  // Process filters, sort, paginate
  const result = await getTasks({
    page,
    perPage,
    sort,
    filters,
    joinOperator,
  });

  return NextResponse.json(result);
}
```

---

## 🚀 Generic Implementation Guide

To use this filter-table system in any page, follow these steps:

### **1. Create Your Data Type**

```typescript
// types/my-data.ts
export interface MyData {
  id: string;
  name: string;
  status: "active" | "inactive";
  createdAt: Date;
  // ... other fields
}
```

### **2. Create Column Definitions**

```typescript
// src/components/organisms/MyTable/my-table-columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";

export function getMyTableColumns(): ColumnDef<MyData>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Name" />
      ),
      meta: {
        label: "Name",
        variant: "text",
        placeholder: "Search names...",
      },
      enableColumnFilter: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      meta: {
        label: "Status",
        variant: "select",
        options: [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ],
      },
      enableColumnFilter: true,
    },
  ];
}
```

### **3. Create Table Component**

```typescript
// src/components/organisms/MyTable/my-table.tsx
"use client";

import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/filter-table/data-table";
import { DataTableAdvancedToolbar } from "@/components/filter-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "@/components/filter-table/data-table-filter-list";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { getMyTableColumns } from "./my-table-columns";

interface MyTableProps {
  data: MyData[];
  pageCount: number;
}

export function MyTable({ data, pageCount }: MyTableProps) {
  const columns = React.useMemo(() => getMyTableColumns(), []);

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter: true,
    getRowId: (row) => row.id,
  });

  return (
    <DataTable table={table}>
      <DataTableAdvancedToolbar table={table}>
        <DataTableSortList table={table} />
        <DataTableFilterList table={table} />
      </DataTableAdvancedToolbar>
    </DataTable>
  );
}
```

### **4. Create Client Component (Data Fetcher)**

```typescript
// src/components/organisms/MyTable/my-table-client.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsJson, parseAsString } from "nuqs";
import { MyTable } from "./my-table";
import { fetchMyData, fetchMyDataCounts } from "@/config/my-data-api-client";

export function MyTableClient() {
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [sort] = useQueryState("sort", parseAsJson<Array<{ id: string; desc: boolean }>>().withDefault([]));
  const [filters] = useQueryState("filters", parseAsJson<Array<any>>().withDefault([]));
  const [joinOperator] = useQueryState("joinOperator", parseAsString.withDefault("and"));

  const { data } = useQuery({
    queryKey: ["my-data", page, perPage, sort, filters, joinOperator],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
        sort: JSON.stringify(sort || []),
        filters: JSON.stringify(filters || []),
        joinOperator: joinOperator || "and",
      });
      const response = await fetch(`/api/my-data?${params}`);
      return response.json();
    },
  });

  if (!data) return <div>Loading...</div>;

  return (
    <MyTable
      data={data.data || []}
      pageCount={data.pageCount || 0}
    />
  );
}
```

### **5. Create API Route**

```typescript
// app/api/my-data/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("perPage") || "10", 10);
  const sort = JSON.parse(searchParams.get("sort") || "[]");
  const filters = JSON.parse(searchParams.get("filters") || "[]");
  const joinOperator = searchParams.get("joinOperator") || "and";

  // Your data fetching logic here
  const result = await fetchMyData({
    page,
    perPage,
    sort,
    filters,
    joinOperator,
  });

  return NextResponse.json(result);
}
```

### **6. Create API Client**

```typescript
// src/config/my-data-api-client.ts
"use client";

import {
  tablePaginate,
  tableSort,
  tableApplyAdvancedFilters,
} from "@/utils/data-table-utils";
import {
  myDataFilter,
  myDataGetCategoryCounts,
} from "@/utils/my-data-utils";
import type { MyData } from "@/types/my-data-types";

export async function fetchMyData(params: GetMyDataSchema): Promise<{
  data: MyData[];
  pageCount: number;
}> {
  // Call your backend API
  const response = await fetch(
    `/api/my-data?${new URLSearchParams({
      page: params.page.toString(),
      perPage: params.perPage.toString(),
      sort: JSON.stringify(params.sort),
      filters: JSON.stringify(params.filters),
      joinOperator: params.joinOperator,
    })}`
  );
  
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  
  return response.json();
}

export async function fetchMyDataCounts() {
  // Fetch counts for filters
  const response = await fetch("/api/my-data/counts");
  return response.json();
}
```

### **7. Create Table-Specific Utilities (if needed)**

```typescript
// src/utils/my-data-utils.ts
import type { MyData } from "@/types/my-data-types";

// Table-specific filter function
export function myDataFilter(
  data: MyData[],
  filters: { name?: string; status?: string[] }
): MyData[] {
  return data.filter((item) => {
    if (filters.name && !item.name.includes(filters.name)) return false;
    if (filters.status?.length && !filters.status.includes(item.status)) return false;
    return true;
  });
}

// Table-specific count functions
export function myDataGetCategoryCounts(data: MyData[]) {
  // Calculate counts for filter options
  return { active: 0, inactive: 0 };
}
```

### **8. Use in Page**

```typescript
// src/app/my-page/page.tsx
import { MyTableClient } from "@/components/organisms/MyTable/my-table-client";

export default function MyPage() {
  return (
    <div className="container mx-auto py-8">
      <h1>My Data</h1>
      <MyTableClient />
    </div>
  );
}
```

### **Summary: Files to Create for a New Table**

For a new table (e.g., "Products"), create these files:

1. ✅ **Type definition**: `src/types/product-types.ts`
2. ✅ **Column definitions**: `src/components/organisms/ProductTable/products-table-columns.tsx`
3. ✅ **Table component**: `src/components/organisms/ProductTable/product-table.tsx`
4. ✅ **Client component**: `src/components/organisms/ProductTable/products-table-client.tsx`
5. ✅ **API client**: `src/config/products-api-client.ts`
6. ✅ **Table utilities** (if needed): `src/utils/product-utils.ts`

**Reuse these generic files:**
- ✅ `src/components/filter-table/*` - All generic components
- ✅ `src/hooks/use-data-table.ts` - Generic hook
- ✅ `src/utils/data-table-utils.ts` - Generic utilities (table-* functions)

---

## 🔧 Key Components Explained

### **useDataTable Hook**

The core hook that manages all table state and syncs with URL.

**Props:**
- `data` - Array of data to display
- `columns` - Column definitions
- `pageCount` - Total number of pages (required for server-side pagination)
- `enableAdvancedFilter` - Use advanced filtering (default: false)
- `queryKeys` - Custom query param names (optional)
- `debounceMs` - Filter debounce time (default: 300ms)
- `getRowId` - Function to get unique row ID

**Returns:**
- `table` - TanStack Table instance
- `shallow` - Shallow routing flag
- `debounceMs` - Debounce time
- `throttleMs` - Throttle time

### **DataTable Component**

Renders the actual table UI.

**Props:**
- `table` - TanStack Table instance (from useDataTable)
- `actionBar` - Optional action bar for selected rows
- `children` - Toolbar components (filters, sorts, etc.)

### **DataTableAdvancedToolbar**

Container for filter and sort controls.

**Props:**
- `table` - TanStack Table instance
- `children` - Filter and sort components

### **DataTableFilterList**

Advanced filter UI component.

**Props:**
- `table` - TanStack Table instance
- `debounceMs` - Debounce time
- `throttleMs` - Throttle time
- `shallow` - Shallow routing

### **DataTableSortList**

Sort control component.

**Props:**
- `table` - TanStack Table instance
- `align` - Alignment ("start" | "end")

---

## ⚙️ Configuration Options

### **Query Keys Customization**

If you need different query param names:

```typescript
const { table } = useDataTable({
  // ...
  queryKeys: {
    page: "p",
    perPage: "pp",
    sort: "s",
    filters: "f",
    joinOperator: "jo",
  },
});
```

### **Filter Debouncing**

Customize debounce time:

```typescript
const { table } = useDataTable({
  // ...
  debounceMs: 500,  // 500ms debounce
});
```

### **Initial State**

Set initial table state:

```typescript
const { table } = useDataTable({
  // ...
  initialState: {
    pagination: { pageIndex: 0, pageSize: 20 },
    sorting: [{ id: "name", desc: false }],
  },
});
```

### **History Mode**

Control URL history behavior:

```typescript
const { table } = useDataTable({
  // ...
  history: "push",  // "push" or "replace" (default: "replace")
});
```

---

## 🎯 Best Practices

1. **Separate Concerns:**
   - **Generic components** → `src/components/filter-table/` (reusable)
   - **Table-specific components** → `src/components/organisms/{TableName}/` (one per table)
   - **Generic utilities** → `src/utils/data-table-utils.ts` (table-* functions)
   - **Table-specific utilities** → `src/utils/{table}-utils.ts` ({table}-* functions)
   - **API clients** → `src/config/{table}-api-client.ts` (one per table)
   - Keep data fetching in client components
   - Keep table logic in table components
   - Keep column definitions separate

2. **Memoization:**
   - Memoize column definitions
   - Memoize data transformations

3. **Error Handling:**
   - Handle loading states
   - Handle error states
   - Provide fallback data

4. **Performance:**
   - Use React Query for caching
   - Debounce filter inputs
   - Use shallow routing when possible

5. **Type Safety:**
   - Define proper TypeScript types
   - Use generic types in components
   - Validate API responses

---

## 📚 Summary

The filter-table system follows this pattern:

1. **Page Component** → Reads URL params, fetches data
2. **Table Component** → Defines columns, uses `useDataTable`
3. **useDataTable Hook** → Syncs state with URL, creates table instance
4. **DataTable Components** → Render UI, handle interactions
5. **User Interactions** → Update URL → Trigger refetch → Update UI

This creates a seamless, URL-synced, server-side filtered/sorted/paginated table that works generically across all your pages!

