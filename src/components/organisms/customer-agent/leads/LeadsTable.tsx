"use client";

import * as React from "react";
import { useQueryState } from "nuqs";
import { AlertCircle } from "lucide-react";
import { DataTable } from "@/components/filter-table/index";
import { DataTableFilterList } from "@/components/filter-table/data-table-filter-list";
import { DataTableViewOptions } from "@/components/filter-table/data-table-view-options";
import { getFiltersStateParser } from "@/components/filter-table/parsers";
import { Button } from "@/components/ui/button";
import { useVisitorLeads } from "@/hooks/use-customer-agent";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import { LEAD_STATUSES, type LeadStatus, type VisitorLead } from "@/types/customer-agent";
import { getValidFilters } from "@/utils/data-table-utils";
import { requestError } from "../request-error";
import { getLeadsTableColumns } from "./leads-table-columns";

const LEADS_QUERY_KEYS = {
  filters: "leadsFilters",
  joinOperator: "leadsJoin",
} as const;

function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

/** Read-only list of captured leads in Infer's order, newest first. Status is the only filter Infer supports. */
export function LeadsTable({
  businessId,
  toolbarActions,
}: {
  businessId: string;
  toolbarActions?: React.ReactNode;
}) {
  const columns = React.useMemo(() => getLeadsTableColumns(), []);

  const [urlFilters] = useQueryState(
    LEADS_QUERY_KEYS.filters,
    getFiltersStateParser<VisitorLead>(["status"]).withDefault([]).withOptions({ shallow: true })
  );
  const statusFilter = getValidFilters(urlFilters ?? []).find(
    (filter) => filter.field === "status" && filter.operator === "eq"
  );
  const status = isLeadStatus(statusFilter?.value) ? statusFilter.value : null;
  const query = useVisitorLeads(businessId, status);

  const { table } = useLocalDataTable({
    data: query.leads,
    columns,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 50 },
      columnVisibility: { preferred_time: false },
    },
    getRowId: (row: VisitorLead) => String(row.id),
    meta: {
      queryKeys: {
        filters: LEADS_QUERY_KEYS.filters,
        joinOperator: LEADS_QUERY_KEYS.joinOperator,
        page: "page",
        perPage: "perPage",
        sort: "sort",
      },
    },
  });

  if (query.isError && query.leads.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-destructive">Failed to load leads</p>
        <p className="text-sm text-muted-foreground">{requestError(query.error)}</p>
        <Button onClick={() => void query.refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white p-4">
      <div className="mb-4 shrink-0">
        <div role="toolbar" aria-orientation="horizontal" className="flex w-full items-start justify-between gap-2 p-1">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <DataTableFilterList table={table} shallow={true} align="start" />
          </div>
          <div className="flex items-center gap-2">
            {toolbarActions}
            <DataTableViewOptions table={table} align="end" />
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          table={table}
          isLoading={query.isLoading}
          pageSizeOptions={[10, 30, 50, 100]}
          emptyMessage="No leads found. Leads your agent captures show up here."
          disableHorizontalScroll={false}
          className="h-full"
        />
      </div>
      {query.truncated && (
        <p className="mt-2 shrink-0 text-xs text-muted-foreground">
          Showing the most recent {query.leads.length} leads.
        </p>
      )}
    </div>
  );
}
