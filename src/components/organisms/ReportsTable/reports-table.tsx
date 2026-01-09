"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarFold, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/filter-table";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { useDataTable } from "@/hooks/use-data-table";
import type { ReportRunListItem } from "@/types/report-runs-types";
import type { QueryKeys } from "@/types/data-table-types";
import { getReportsTableColumns } from "./reports-table-columns";
import { ReportsTablePagination } from "./reports-table-pagination";
import { GenerateReportDialog } from "./generate-report-dialog";

interface ReportsTableProps {
  businessId: string;
  data: ReportRunListItem[];
  pageCount: number;
  queryKeys?: Partial<QueryKeys>;
  isLoading?: boolean;
  isFetching?: boolean;
}

export function ReportsTable({
  businessId,
  data,
  pageCount,
  queryKeys,
  isLoading,
  isFetching,
}: ReportsTableProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const columns = React.useMemo(
    () => getReportsTableColumns({ businessId }),
    [businessId]
  );

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter: false,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 24,
      },
    },
    queryKeys,
    getRowId: (row) => row.id,
    shallow: false,
    clearOnDefault: true,
  });

  const handleRowClick = React.useCallback(
    (row: ReportRunListItem) => {
      router.push(`/business/${businessId}/reports/${row.id}`);
    },
    [router, businessId]
  );

  return (
    <div className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden gap-4">
      <DataTable
        table={table}
        isLoading={isLoading}
        isFetching={isFetching}
        disableHorizontalScroll={true}
        showPagination={false}
        emptyMessage="No reports found."
        onRowClick={handleRowClick}
      >
        <div
          role="toolbar"
          aria-orientation="horizontal"
          className="flex w-full items-start justify-between gap-2 p-1"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-[320px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9"
                disabled
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DataTableSortList table={table} align="start" />
            <Button variant="outline" className="h-9 gap-2" disabled>
              <CalendarFold className="h-4 w-4" />
              Auto-schedule
            </Button>
            <Button className="h-9 gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create New
            </Button>
          </div>
        </div>
      </DataTable>

      <ReportsTablePagination table={table} pageSizeOptions={[10, 24, 50, 100]} />

      <GenerateReportDialog open={dialogOpen} onOpenChange={setDialogOpen} businessId={businessId} />
    </div>
  );
}
