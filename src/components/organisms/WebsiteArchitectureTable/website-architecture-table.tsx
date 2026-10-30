"use client";

import * as React from "react";
import { DataTable } from "@/components/filter-table";
import { DataTableFilterList } from "@/components/filter-table/data-table-filter-list";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableViewOptions } from "@/components/filter-table/data-table-view-options";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTable } from "@/hooks/use-data-table";
import type { WebsiteArchitecturePage } from "@/types/website-architecture-types";
import { ARCHITECTURE_PAGE_TYPES, getWebsiteArchitectureColumns } from "./website-architecture-table-columns";

export const ARCHITECTURE_QUERY_KEYS = {
  page: "architecturePage",
  perPage: "architecturePerPage",
  search: "architectureSearch",
  sort: "architectureSort",
  filters: "architectureFilters",
  joinOperator: "architectureJoinOperator",
};

interface WebsiteArchitectureTableProps {
  data: WebsiteArchitecturePage[];
  pageCount: number;
  isLoading: boolean;
  isFetching: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  quickTypeFilter: string;
  negativeTypeFilter: boolean;
  onQuickTypeFilterChange: (value: string) => void;
}

export function WebsiteArchitectureTable({
  data, pageCount, isLoading, isFetching, search, onSearchChange,
  quickTypeFilter, negativeTypeFilter, onQuickTypeFilterChange,
}: WebsiteArchitectureTableProps) {
  const pageTypes = React.useMemo(() => Array.from(new Set([
    ...ARCHITECTURE_PAGE_TYPES, ...data.map((page) => page.page_type),
  ])), [data]);
  const columns = React.useMemo(() => getWebsiteArchitectureColumns(pageTypes, negativeTypeFilter), [pageTypes, negativeTypeFilter]);
  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    queryKeys: ARCHITECTURE_QUERY_KEYS,
    getRowId: (page) => page.page_id,
    enableAdvancedFilter: true,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 100 },
      columnVisibility: {
        name: false, keyword: false, page_subtype: false, current_url: false,
        parent_page_id: false, page_id: false, business_applicability: false,
        confidence: false, sources: false, alternate_framing: false, sections: false,
        modifier_offerings: false, modifier_customer_type: false,
        modifier_location: false, modifier_service_area: false,
      },
    },
    clearOnDefault: true,
  });

  return (
    <div className="min-h-0 min-w-0 flex-1 rounded-lg bg-background p-4 flex flex-col overflow-hidden">
      <DataTable
        table={table}
        isLoading={isLoading}
        isFetching={isFetching}
        pageSizeOptions={[10, 30, 50, 100, 200]}
        showPagination={!isLoading && pageCount > 0}
        emptyMessage="No web pages found. Try adjusting your search or filters."
      >
        <div role="toolbar" aria-label="Website architecture table controls" className="flex w-full flex-wrap items-start justify-between gap-2 p-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <DataTableSearch value={search} onChange={onSearchChange} placeholder="Search pages, titles..." />
            <Tabs value={quickTypeFilter} onValueChange={onQuickTypeFilterChange}>
              <TabsList className="h-9 rounded-md p-1">
                <TabsTrigger value="all" className="h-7 rounded px-2.5 text-xs">All</TabsTrigger>
                <TabsTrigger value="blog" className="h-7 rounded px-2.5 text-xs">Blogs</TabsTrigger>
                <TabsTrigger value="other" className="h-7 rounded px-2.5 text-xs">Other pages</TabsTrigger>
              </TabsList>
            </Tabs>
            <DataTableFilterList key={`${pageTypes.join(",")}:${negativeTypeFilter}`} table={table} shallow={shallow} debounceMs={debounceMs} throttleMs={throttleMs} align="start" />
          </div>
          <div className="flex items-center gap-2">
            <DataTableSortList table={table} align="start" />
            <div className="[&>button]:flex">
              <DataTableViewOptions table={table} align="end" />
            </div>
          </div>
        </div>
      </DataTable>
    </div>
  );
}
