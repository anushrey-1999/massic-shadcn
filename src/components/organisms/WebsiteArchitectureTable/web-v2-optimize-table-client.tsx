"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { AlertCircle } from "lucide-react";
import { DataTable } from "@/components/filter-table";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { DataTableViewOptions } from "@/components/filter-table/data-table-view-options";
import { getSortingStateParser } from "@/components/filter-table/parsers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { useDataTable } from "@/hooks/use-data-table";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useSmartSitemapKeywordCounts,
  useSmartSitemapList,
  type SmartSitemapListPage,
  type SmartSitemapSort,
  type SortOrder,
} from "@/hooks/use-smart-sitemap";
import { useWebsiteArchitectureTags } from "@/hooks/use-website-architecture-content";
import { formatVolume } from "@/lib/format";
import { decodePath, pageUrl } from "@/lib/smart-sitemap";
import { OPTIMIZE_QUERY_KEYS } from "@/lib/website-architecture-navigation";
import { normalizeWebsiteUrl } from "@/utils/utils";
import type { ArchitectureContentTag } from "@/types/website-architecture-content-types";
import type { TimePeriodValue } from "@/utils/analytics-period";
import { WebV2OptimizeActionCell, WebV2OptimizeActions } from "./web-v2-optimize-actions";

const SITE_PAGES_PERIOD: TimePeriodValue = "60 days";
const DEFAULT_PER_PAGE = 50;
const PAGE_SIZE_OPTIONS = [10, 30, 50, 100];

const SORT_FIELD_MAP: Record<string, SmartSitemapSort> = {
  path: "path",
  clicks: "gsc.clicks",
  impressions: "gsc.impressions",
};

const stateParsers = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(DEFAULT_PER_PAGE),
  search: parseAsString.withDefault(""),
  sort: getSortingStateParser<SmartSitemapListPage>(["path", "clicks", "impressions"]).withDefault([]),
};

function TextCell({ value }: { value: unknown }) {
  const text = value == null || value === "" ? "—" : String(value);
  return <Typography variant="p" className="break-words whitespace-normal" title={text}>{text}</Typography>;
}

function resolveExternalUrl(website: string | null | undefined, row: SmartSitemapListPage): string | null {
  const rawWebsite = website?.trim().replace(/^(?:sc-domain|sc)\s*:\s*/i, "").trim();
  const baseOrigin = normalizeWebsiteUrl(rawWebsite);
  const rawPath = row.path?.trim() ?? "";

  if (baseOrigin) {
    // Collapse leading slashes so protocol-relative paths like "//foo" cannot hijack the host.
    const safePath = `/${rawPath.replace(/^\/+/, "")}`;
    const built = pageUrl(baseOrigin, safePath);
    if (built && /^https?:\/\//i.test(built)) return built;
  }

  const fallback = row.indexing?.primaryPageUrl?.trim() ?? null;
  if (fallback && /^https?:\/\//i.test(fallback)) return fallback;
  return null;
}

interface WebV2OptimizeTableClientProps {
  businessId: string;
  website?: string | null;
  onTotalCountChange?: (totalCount: number | null) => void;
}

export function WebV2OptimizeTableClient({
  businessId,
  website,
  onTotalCountChange,
}: WebV2OptimizeTableClientProps) {
  const [state, setState] = useQueryStates(stateParsers, {
    urlKeys: OPTIMIZE_QUERY_KEYS,
    clearOnDefault: true,
    shallow: true,
  });

  const page = Math.max(1, state.page);
  const perPage = PAGE_SIZE_OPTIONS.includes(state.perPage) ? state.perPage : DEFAULT_PER_PAGE;
  const debouncedSearch = useDebounce(state.search.trim(), 300);

  const activeSort = state.sort[0];
  const sortBy: SmartSitemapSort = (activeSort && SORT_FIELD_MAP[activeSort.field]) || "gsc.clicks";
  const sortOrder: SortOrder = activeSort ? (activeSort.desc ? "desc" : "asc") : "desc";

  const signature = JSON.stringify([businessId, perPage, debouncedSearch, sortBy, sortOrder]);
  const previousSignature = React.useRef(signature);
  const needsPageReset = previousSignature.current !== signature && page !== 1;

  React.useEffect(() => {
    if (previousSignature.current === signature) return;
    previousSignature.current = signature;
    void setState({ page: 1 });
  }, [signature, setState]);

  const listQuery = useSmartSitemapList(
    businessId,
    {
      period: SITE_PAGES_PERIOD,
      sortBy,
      sortOrder,
      search: debouncedSearch || undefined,
      page,
      limit: perPage,
    },
    { enabled: Boolean(businessId) && !needsPageReset },
  );

  const listData = listQuery.data;
  const pages = listData?.pages ?? [];
  const pageCount = listData?.pagination.totalPages ?? 0;
  const loadingRows = listQuery.isLoading || listQuery.isPlaceholderData || needsPageReset;
  const listSettled = Boolean(listData) && !loadingRows;

  React.useEffect(() => {
    if (listSettled && pageCount > 0 && page > pageCount) {
      void setState({ page: 1 });
    }
  }, [listSettled, page, pageCount, setState]);

  React.useEffect(() => {
    onTotalCountChange?.(loadingRows ? null : listData?.total ?? null);
  }, [listData?.total, loadingRows, onTotalCountChange]);

  const listPageIds = React.useMemo(() => pages.map((row) => row.id), [pages]);
  const listPagePaths = React.useMemo(() => pages.map((row) => row.path), [pages]);

  const keywordCountsQuery = useSmartSitemapKeywordCounts(
    businessId,
    SITE_PAGES_PERIOD,
    listPageIds,
    { enabled: listSettled && listPageIds.length > 0 },
  );

  const tagsQuery = useWebsiteArchitectureTags(businessId, listPagePaths, {
    enabled: listSettled && listPagePaths.length > 0,
  });

  const tagsByUrl = React.useMemo(() => {
    const map = new Map<string, ArchitectureContentTag>();
    for (const tag of tagsQuery.data ?? []) {
      map.set(tag.url, tag);
    }
    return map;
  }, [tagsQuery.data]);

  const tagsLoading = listSettled && listPagePaths.length > 0 && tagsQuery.isLoading;
  const keywordCounts = keywordCountsQuery.data?.counts;
  const keywordCountsLoading = listSettled && listPageIds.length > 0 && keywordCountsQuery.isLoading;

  const columns = React.useMemo<ColumnDef<SmartSitemapListPage>[]>(() => [
    {
      id: "path",
      accessorKey: "path",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Page" />,
      cell: ({ row }) => {
        const displayPath = decodePath(row.original.path);
        const href = resolveExternalUrl(website, row.original);
        if (!href) return <TextCell value={displayPath} />;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={href}
            className="inline-block max-w-full rounded-[2px] break-words whitespace-normal text-sm text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {displayPath}
          </a>
        );
      },
      meta: { label: "Page" },
      enableSorting: true,
      enableColumnFilter: false,
      enableHiding: false,
      size: 360,
      minSize: 260,
    },
    {
      id: "clicks",
      accessorFn: (row) => row.gsc?.clicks ?? null,
      header: ({ column }) => <DataTableColumnHeader column={column} label="Clicks" />,
      cell: ({ row }) => (
        <TextCell value={row.original.gsc?.clicks == null ? null : formatVolume(row.original.gsc.clicks)} />
      ),
      meta: { label: "Clicks" },
      enableSorting: true,
      enableColumnFilter: false,
      size: 110,
      minSize: 90,
    },
    {
      id: "keywords",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Keywords" />,
      cell: ({ row }) => {
        if (keywordCountsLoading) {
          return <Skeleton className="h-4 w-8" aria-label="Loading keyword count" />;
        }
        const count = keywordCounts?.[row.original.id];
        return <TextCell value={count == null ? null : formatVolume(count)} />;
      },
      meta: { label: "Keywords" },
      enableSorting: false,
      enableColumnFilter: false,
      size: 110,
      minSize: 90,
    },
    {
      id: "impressions",
      accessorFn: (row) => row.gsc?.impressions ?? null,
      header: ({ column }) => <DataTableColumnHeader column={column} label="Impressions" />,
      cell: ({ row }) => (
        <TextCell value={row.original.gsc?.impressions == null ? null : formatVolume(row.original.gsc.impressions)} />
      ),
      meta: { label: "Impressions" },
      enableSorting: true,
      enableColumnFilter: false,
      size: 120,
      minSize: 100,
    },
    {
      id: "actions",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Actions" />,
      cell: ({ row }) => <WebV2OptimizeActionCell page={row.original} />,
      enableHiding: false,
      enableSorting: false,
      enableColumnFilter: false,
      size: 148,
      minSize: 148,
    },
  ], [keywordCounts, keywordCountsLoading, website]);

  const { table } = useDataTable({
    data: pages,
    columns,
    pageCount,
    queryKeys: OPTIMIZE_QUERY_KEYS,
    getRowId: (row) => row.id,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PER_PAGE },
      columnPinning: { right: ["actions"] },
    },
    clearOnDefault: true,
  });

  if (listQuery.isError && !listData) {
    return (
      <div className="flex flex-1 flex-col items-start gap-3 rounded-lg bg-background p-5">
        <div role="alert" className="flex items-center gap-2 text-sm font-medium">
          <AlertCircle aria-hidden className="size-4 text-destructive" />
          Could not load published pages
        </div>
        <Button size="sm" variant="outline" onClick={() => void listQuery.refetch()} disabled={listQuery.isFetching}>
          {listQuery.isFetching ? "Checking…" : "Retry"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <WebV2OptimizeActions
        businessId={businessId}
        pages={pages}
        tagsByUrl={tagsByUrl}
        tagsLoading={tagsLoading}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-background p-4">
          <DataTable
            table={table}
            fitToWidth
            isLoading={loadingRows}
            loadingRowCount={6}
            aria-busy={loadingRows}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            showPagination={!loadingRows && pageCount > 0}
            emptyMessage="No published pages found. Try adjusting your search."
          >
            <div
              role="toolbar"
              aria-label="Optimize pages table controls"
              className="flex w-full flex-wrap items-start justify-between gap-2 p-1"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <DataTableSearch
                  value={state.search}
                  onChange={(search) => void setState({ search, page: 1 })}
                  placeholder="Search pages by path..."
                />
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
      </WebV2OptimizeActions>
    </div>
  );
}
