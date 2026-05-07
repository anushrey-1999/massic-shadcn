"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/filter-table/index";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableViewOptions } from "@/components/filter-table/data-table-view-options";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Sparkles, List, Network, Filter, X } from "lucide-react";
import { useThemes } from "@/hooks/use-themes";
import { getThemesTableColumns } from "./themes-table-columns";
import { ThemesForceGraph } from "./themes-force-graph";
import type { ThemeRow } from "@/types/themes-types";
import { Typography } from "@/components/ui/typography";

interface ThemesTableClientProps {
  businessId: string;
}

export function ThemesTableClient({ businessId }: ThemesTableClientProps) {
  const [view, setView] = React.useState<"table" | "graph">("table");
  const [search, setSearch] = React.useState("");
  const [selectedOfferings, setSelectedOfferings] = React.useState<string[]>([]);
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const [isPolling, setIsPolling] = React.useState(false);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Clear offerings filter when switching to table view
  React.useEffect(() => {
    if (view === "table" && selectedOfferings.length > 0) {
      setSelectedOfferings([]);
    }
  }, [view]);

  const { fetchThemes, triggerThemes } = useThemes(businessId);

  const {
    data: themesData,
    isLoading: themesLoading,
    isError: themesError,
    error: themesErrorData,
    refetch: refetchThemes,
  } = useQuery({
    queryKey: ["themes", businessId],
    queryFn: () => fetchThemes(1, 1000),
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId,
    refetchInterval: (query) => isPolling && !query.state.data?.hasData ? 5000 : false,
  });

  const triggerMutation = useMutation({
    mutationFn: triggerThemes,
    onSuccess: () => {
      setIsPolling(true);
      queryClient.invalidateQueries({ queryKey: ["themes", businessId] });
    },
  });

  React.useEffect(() => {
    if (themesData?.hasData && isPolling) {
      setIsPolling(false);
    }
  }, [themesData?.hasData, isPolling]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!tableContainerRef.current) return;
      if (target.closest?.('[role="dialog"]')) return;
      const isOutsideContainer = !tableContainerRef.current.contains(target);
      if (isOutsideContainer) {
        setExpandedRowId(null);
        return;
      }
      const isOnTableElement = target?.closest?.(
        'table, [role="table"], [role="row"], [role="cell"], [role="columnheader"], [role="rowheader"]'
      );
      const isOnInteractiveElement = target?.closest?.(
        'button, input, select, textarea, a, [role="button"], [role="textbox"], [role="combobox"]'
      );
      if (!isOnTableElement && !isOnInteractiveElement) {
        setExpandedRowId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const columns = React.useMemo(
    () => getThemesTableColumns({ expandedRowId, onExpandedRowChange: setExpandedRowId }),
    [expandedRowId]
  );

  const allData = React.useMemo<ThemeRow[]>(
    () => themesData?.data || [],
    [themesData?.data]
  );

  const allOfferings = React.useMemo(() => {
    const offeringsSet = new Set<string>();
    allData.forEach((row) => {
      if (row.origin_offering) offeringsSet.add(row.origin_offering);
      row.offerings?.forEach((o) => offeringsSet.add(o));
    });
    return Array.from(offeringsSet).sort();
  }, [allData]);

  const filteredData = React.useMemo(() => {
    let data = allData;

    // Filter by selected offerings
    if (selectedOfferings.length > 0) {
      data = data.filter((row) =>
        selectedOfferings.some(
          (offering) =>
            row.origin_offering === offering ||
            row.offerings?.includes(offering)
        )
      );
    }

    // Filter by search text
    if (search.trim()) {
      const lower = search.toLowerCase();
      data = data.filter(
        (row) =>
          row.theme_name?.toLowerCase().includes(lower) ||
          row.origin_offering?.toLowerCase().includes(lower) ||
          row.offerings?.some((o) => o.toLowerCase().includes(lower)) ||
          row.topics?.some((t) => t.topic_name?.toLowerCase().includes(lower))
      );
    }

    return data;
  }, [allData, search, selectedOfferings]);

  const { table } = useLocalDataTable({
    data: filteredData,
    columns,
    initialState: {
      sorting: [{ id: "topic_count", desc: true }],
      pagination: { pageIndex: 0, pageSize: 50 },
    },
    getRowId: (row: ThemeRow) => row.id,
  });

  if (themesError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-medium">Failed to load themes data</p>
        <p className="text-sm text-muted-foreground">
          {themesErrorData instanceof Error
            ? themesErrorData.message
            : "An error occurred"}
        </p>
        <Button onClick={() => refetchThemes()}>Try Again</Button>
      </div>
    );
  }

  if (triggerMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <Typography variant="p" className="font-medium text-foreground">
          Submitting request…
        </Typography>
        <Typography variant="p" className="text-sm text-muted-foreground">
          Sending your request to generate themes.
        </Typography>
      </div>
    );
  }

  if (isPolling && !themesData?.hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <Typography variant="p" className="font-medium text-foreground">
          Processing themes…
        </Typography>
        <Typography variant="p" className="text-sm text-muted-foreground">
          This may take a few minutes. Checking for results every 5 seconds.
        </Typography>
      </div>
    );
  }

  const showEmptyState = !isPolling && !themesLoading && themesData && !themesData.hasData;

  if (showEmptyState) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
          <Typography variant="p" className="font-medium text-foreground">
            No themes generated yet
          </Typography>
          <Typography variant="p" className="text-sm text-muted-foreground">
            Click the button below to generate themes for this business.
          </Typography>
        </div>
        <Button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Themes
        </Button>
        {triggerMutation.isError && (
          <p className="text-sm text-destructive">
            Generation failed. Please try again.
          </p>
        )}
      </div>
    );
  }

  const totalThemes = allData.length;

  const handleOfferingToggle = (offering: string) => {
    setSelectedOfferings((prev) =>
      prev.includes(offering)
        ? prev.filter((o) => o !== offering)
        : [...prev, offering]
    );
  };

  const offeringsFilter = (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 font-normal">
          <Filter className="h-4 w-4" />
          Offerings
          {selectedOfferings.length > 0 && (
            <Badge variant="secondary" className="ml-1 rounded-sm px-1 font-normal">
              {selectedOfferings.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Filter by Offerings</p>
            {selectedOfferings.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedOfferings([])}
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {allOfferings.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">No offerings available</p>
          ) : (
            allOfferings.map((offering) => (
              <div
                key={offering}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                onClick={() => handleOfferingToggle(offering)}
              >
                <Checkbox
                  checked={selectedOfferings.includes(offering)}
                  onCheckedChange={() => handleOfferingToggle(offering)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm flex-1">{offering}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  const viewToggle = (
    <Tabs value={view} onValueChange={(v) => setView(v as "table" | "graph")} className="shrink-0">
      <TabsList>
        <TabsTrigger value="table">
          <List className="h-4 w-4" />
          List
        </TabsTrigger>
        <TabsTrigger value="graph">
          <Network className="h-4 w-4" />
          Graph
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  if (view === "graph") {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {offeringsFilter}
              {totalThemes != null && (
                <Typography variant="p" className="text-sm font-mono text-general-muted-foreground">
                  {selectedOfferings.length > 0 || search.trim()
                    ? `${filteredData.length} of ${totalThemes} Themes`
                    : `${totalThemes} Themes`}
                </Typography>
              )}
            </div>
            <div className="flex items-center gap-2">
              {viewToggle}
              <Button
                variant="outline"
                onClick={() => { setIsPolling(false); triggerMutation.mutate(); }}
                disabled={triggerMutation.isPending}
                className="h-9 font-normal"
              >
                <Sparkles className="h-4 w-4" />
                Generate Themes
              </Button>
            </div>
          </div>
          {selectedOfferings.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Filtered by:</span>
              {selectedOfferings.map((offering) => (
                <Badge
                  key={offering}
                  variant="secondary"
                  className="gap-1 pl-2 pr-1.5 py-0.5"
                >
                  {offering}
                  <button
                    onClick={() => handleOfferingToggle(offering)}
                    className="ml-0.5 rounded-sm hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <ThemesForceGraph data={filteredData} />
        </div>
      </div>
    );
  }

  return (
    <div ref={tableContainerRef} className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden gap-4">
      <div className="shrink-0 flex items-center justify-between gap-4">
        <DataTableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search themes, offerings, topics..."
        />
        <div className="flex items-center gap-2">
          <DataTableSortList table={table} align="start" />
          <DataTableViewOptions table={table} align="end" />
          {viewToggle}
          <Button
            variant="outline"
            onClick={() => { setIsPolling(false); triggerMutation.mutate(); }}
            disabled={triggerMutation.isPending}
            className="h-9 font-normal"
          >
            <Sparkles className="h-4 w-4" />
            Generate Themes
          </Button>
        </div>
      </div>
      {totalThemes != null && (
        <div className="shrink-0">
          <Typography variant="p" className="text-sm font-mono text-general-muted-foreground">
            {search.trim()
              ? `${filteredData.length} of ${totalThemes} Themes total`
              : `${totalThemes} Themes total`}
          </Typography>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          table={table}
          isLoading={themesLoading && !themesData}
          isFetching={triggerMutation.isPending}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage="No themes found."
          showPagination={true}
          disableHorizontalScroll={false}
          className="h-full"
          onRowClick={(row) => {
            const rowId = (row as ThemeRow).id;
            setExpandedRowId((prev) => (prev === rowId ? null : rowId));
          }}
          selectedRowId={expandedRowId}
          highlightSelectedRow={false}
        />
      </div>
    </div>
  );
}
