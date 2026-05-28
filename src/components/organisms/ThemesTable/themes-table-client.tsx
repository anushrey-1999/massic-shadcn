"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/filter-table/index";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableFilterList } from "@/components/filter-table/data-table-filter-list";
import { DataTableViewOptions } from "@/components/filter-table/data-table-view-options";
import { DataTableSortList } from "@/components/filter-table/data-table-sort-list";
import { getFiltersStateParser } from "@/components/filter-table/parsers";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Sparkles, List, Network } from "lucide-react";
import { useThemes } from "@/hooks/use-themes";
import { getThemesTableColumns } from "./themes-table-columns";
import { ThemesForceGraph } from "./themes-force-graph";
import { ThemesSplitView } from "./themes-split-view";
import type { ThemeRow } from "@/types/themes-types";
import { Typography } from "@/components/ui/typography";
import type { ExtendedColumnFilter, JoinOperator } from "@/types/data-table-types";
import { parseAsStringEnum, useQueryState } from "nuqs";

interface ThemesTableClientProps {
  businessId: string;
  onSplitViewChange?: (isSplitView: boolean) => void;
}

type ThemesView = "table" | "graph" | "umap";

function getFilterValues(row: ThemeRow, field: string): string[] {
  if (field === "theme_name") return [row.theme_name || ""];
  if (field === "offerings") return row.offerings || [];
  if (field === "topics") return (row.topics || []).map((topic) => topic.topic_name);
  return [];
}

function matchesAdvancedFilters(
  row: ThemeRow,
  filters: ExtendedColumnFilter<ThemeRow>[],
  joinOperator: JoinOperator
) {
  const results = filters.map((filter) => {
    const values = getFilterValues(row, filter.field);
    const normalizedValues = values.map((value) => value.toLowerCase());

    if (filter.operator === "isEmpty") {
      return values.length === 0 || values.every((value) => value.trim().length === 0);
    }

    if (filter.operator === "isNotEmpty") {
      return values.some((value) => value.trim().length > 0);
    }

    if (filter.operator === "inArray") {
      const selected = Array.isArray(filter.value)
        ? filter.value.map((v) => String(v).toLowerCase())
        : [String(filter.value ?? "").toLowerCase()];
      return selected.some((s) => normalizedValues.includes(s));
    }

    const filterValue = Array.isArray(filter.value)
      ? filter.value.join(" ")
      : String(filter.value ?? "");
    const normalizedFilterValue = filterValue.toLowerCase();

    if (filter.operator === "notILike") {
      return normalizedValues.every((value) => !value.includes(normalizedFilterValue));
    }

    if (filter.operator === "eq") {
      return normalizedValues.some((value) => value === normalizedFilterValue);
    }

    return normalizedValues.some((value) => value.includes(normalizedFilterValue));
  });

  return joinOperator === "or"
    ? results.some(Boolean)
    : results.every(Boolean);
}

export function ThemesTableClient({ businessId, onSplitViewChange }: ThemesTableClientProps) {
  const [view, setView] = React.useState<ThemesView>("table");
  const [search, setSearch] = React.useState("");
  const [selectedOffering, setSelectedOffering] = React.useState("all");
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const [isSplitView, setIsSplitView] = React.useState(false);
  const [selectedThemeId, setSelectedThemeId] = React.useState<string | null>(null);
  const [splitViewSearch, setSplitViewSearch] = React.useState("");
  const [isPolling, setIsPolling] = React.useState(false);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const themeFilterFields = React.useMemo(
    () => ["theme_name", "offerings", "topics"],
    []
  );
  const [advancedFilters] = useQueryState(
    "themesFilters",
    getFiltersStateParser<ThemeRow>(themeFilterFields).withDefault([])
  );
  const [joinOperator] = useQueryState(
    "themesJoinOperator",
    parseAsStringEnum(["and", "or"]).withDefault("and")
  );

  // Clear offerings filter when switching to table view
  React.useEffect(() => {
    if (view === "table" && selectedOffering !== "all") {
      setSelectedOffering("all");
    }
  }, [view, selectedOffering]);

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

  const allData = React.useMemo<ThemeRow[]>(
    () => themesData?.data || [],
    [themesData?.data]
  );

  const allOfferings = React.useMemo(() => {
    const offeringsSet = new Set<string>();
    allData.forEach((row) => {
      const originOffering = row.origin_offering?.trim();
      if (originOffering) offeringsSet.add(originOffering);
      row.offerings?.forEach((offering) => {
        const trimmed = offering.trim();
        if (trimmed) offeringsSet.add(trimmed);
      });
    });
    return Array.from(offeringsSet).sort();
  }, [allData]);

  const columns = React.useMemo(
    () => getThemesTableColumns({ expandedRowId, onExpandedRowChange: setExpandedRowId, offeringOptions: allOfferings }),
    [expandedRowId, allOfferings]
  );

  React.useEffect(() => {
    if (selectedOffering === "all") return;
    if (allOfferings.includes(selectedOffering)) return;
    setSelectedOffering("all");
  }, [allOfferings, selectedOffering]);

  const formatOfferingLabel = React.useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return value;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }, []);

  const filteredData = React.useMemo(() => {
    let data = allData;

    // Filter by selected offering
    if (selectedOffering !== "all") {
      data = data.filter((row) => {
        const originOffering = row.origin_offering?.trim();
        const offerings = row.offerings?.map((offering) => offering.trim()) ?? [];
        return originOffering === selectedOffering || offerings.includes(selectedOffering);
      });
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

    if (advancedFilters.length > 0) {
      data = data.filter((row) =>
        matchesAdvancedFilters(row, advancedFilters, joinOperator)
      );
    }

    return data;
  }, [allData, search, selectedOffering, advancedFilters, joinOperator]);

  const { table } = useLocalDataTable({
    data: filteredData,
    columns,
    initialState: {
      sorting: [{ id: "theme_name", desc: false }],
      pagination: { pageIndex: 0, pageSize: 50 },
    },
    getRowId: (row: ThemeRow) => row.id,
    meta: {
      queryKeys: {
        filters: "themesFilters",
        joinOperator: "themesJoinOperator",
        page: "themesPage",
        perPage: "themesPerPage",
        sort: "themesSort",
      },
    },
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
  const showGenerateAction = Boolean(themesData?.isNotFound);

  if (showEmptyState) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
          <Typography variant="p" className="font-medium text-foreground">
            {showGenerateAction ? "No themes generated yet" : "No themes found"}
          </Typography>
          <Typography variant="p" className="text-sm text-muted-foreground">
            {showGenerateAction
              ? "Click the button below to generate themes for this business."
              : "Themes have already been generated, but no results were found."}
          </Typography>
        </div>
        {showGenerateAction && (
          <Button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Themes
          </Button>
        )}
        {showGenerateAction && triggerMutation.isError && (
          <p className="text-sm text-destructive">
            Generation failed. Please try again.
          </p>
        )}
      </div>
    );
  }

  const totalThemes = allData.length;
  const graphStats = (() => {
    const offerings = new Set<string>();
    let sharedThemes = 0;

    filteredData.forEach((row) => {
      const names = [
        ...(Array.isArray(row.offerings) ? row.offerings : []),
        row.origin_offering,
      ]
        .map((name) => String(name ?? "").trim())
        .filter(Boolean);

      names.forEach((name) => offerings.add(name));
      if (new Set(names).size > 1) sharedThemes += 1;
    });

    return {
      offerings: offerings.size,
      themes: filteredData.length,
      sharedThemes,
    };
  })();

  const handleThemeRowClick = (row: ThemeRow) => {
    setSelectedThemeId(row.id);
    setSplitViewSearch("");
    setIsSplitView(true);
    onSplitViewChange?.(true);
  };

  const handleBackToMain = () => {
    setIsSplitView(false);
    setSelectedThemeId(null);
    setSplitViewSearch("");
    onSplitViewChange?.(false);
  };

  const offeringsFilter = (
    allOfferings.length > 0 ? (
      <Select value={selectedOffering} onValueChange={setSelectedOffering}>
        <SelectTrigger className="w-[240px] max-w-[45vw]">
          <SelectValue placeholder="All offerings" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All offerings</SelectItem>
          {allOfferings.map((offering) => (
            <SelectItem key={offering} value={offering}>
              {formatOfferingLabel(offering)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null
  );

  const viewToggle = (
    <Tabs value={view} onValueChange={(v) => setView(v as ThemesView)} className="shrink-0">
      <TabsList>
        <TabsTrigger value="table">
          <List className="h-4 w-4" />
          List
        </TabsTrigger>
        <TabsTrigger value="graph">
          <Network className="h-4 w-4" />
          Graph
        </TabsTrigger>
        <TabsTrigger value="umap">
          <Network className="h-4 w-4" />
          UMAP
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  if (view === "graph" || view === "umap") {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {offeringsFilter}
              <div className="flex items-center gap-4">
                <div className="text-sm font-mono text-general-muted-foreground">
                  <span className="text-general-primary">{graphStats.offerings}</span> Offerings
                </div>
                <div className="text-sm font-mono text-general-muted-foreground">
                  <span className="text-general-primary">{graphStats.themes}</span> Themes
                </div>
                <div className="text-sm font-mono text-general-muted-foreground">
                  <span className="text-general-primary">{graphStats.sharedThemes}</span> Shared
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {viewToggle}
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ThemesForceGraph data={filteredData} layout={view === "umap" ? "umap" : "force"} />
        </div>
      </div>
    );
  }

  if (isSplitView) {
    return (
      <div className="relative h-full flex flex-col">
        <ThemesSplitView
          themesData={allData}
          selectedThemeId={selectedThemeId}
          onThemeSelect={setSelectedThemeId}
          search={splitViewSearch}
          onSearchChange={setSplitViewSearch}
          onBack={handleBackToMain}
        />
      </div>
    );
  }

  return (
    <div ref={tableContainerRef} className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden gap-4">
      <div className="shrink-0 flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <DataTableSearch
            value={search}
            onChange={setSearch}
            placeholder="Search themes, offerings, topics..."
          />
          <DataTableFilterList table={table} align="start" />
        </div>
        <div className="flex items-center gap-2">
          <DataTableSortList table={table} align="start" />
          <DataTableViewOptions table={table} align="end" />
          {viewToggle}
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
          onRowClick={handleThemeRowClick}
          selectedRowId={expandedRowId}
          highlightSelectedRow={false}
        />
      </div>
    </div>
  );
}
