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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ChartScatter, CircleDot, List, ListFilter, Loader2, Sparkles } from "lucide-react";
import { useThemes } from "@/hooks/use-themes";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { BUSINESS_RELEVANCE_PALETTE } from "@/components/organisms/StrategyBubbleChart/strategy-bubble-chart";
import { getThemesTableColumns } from "./themes-table-columns";
import {
  ThemesBubbleChart,
  type ThemesBubbleColorMetric,
} from "./themes-bubble-chart";
import { ThemesScatterPlot } from "./themes-scatter-plot";
import { ThemesSplitView } from "./themes-split-view";
import type { ThemeRow } from "@/types/themes-types";
import { Typography } from "@/components/ui/typography";
import type { ExtendedColumnFilter, JoinOperator } from "@/types/data-table-types";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { DownloadCsvButton } from "@/components/ui/download-csv-button";
import { downloadRowsAsCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";

interface ThemesTableClientProps {
  businessId: string;
  onSplitViewChange?: (isSplitView: boolean) => void;
  onMetricsTextChange?: (text: string) => void;
  toolbarRightPrefix?: React.ReactNode;
  view?: ThemesView;
  onViewChange?: (view: ThemesView) => void;
}

type ThemesView = "table" | "bubble" | "scatter";
type RelevanceFilter = "high" | "medium" | "low";

const RELEVANCE_FILTER_OPTIONS: Array<{
  value: RelevanceFilter;
  label: string;
  description: string;
}> = [
  { value: "high", label: "High", description: "More than 70%" },
  { value: "medium", label: "Medium", description: "40% to 70%" },
  { value: "low", label: "Low", description: "Less than 40%" },
];

function getRelevancePercent(score?: number) {
  if (score === undefined || score === null || !Number.isFinite(score)) return null;
  return score <= 1 ? score * 100 : score;
}

function matchesRelevanceFilter(score: number | undefined, filters: RelevanceFilter[]) {
  if (filters.length === 0) return true;

  const percent = getRelevancePercent(score);
  if (percent === null) return false;

  return filters.some((filter) => {
    if (filter === "high") return percent > 70;
    if (filter === "medium") return percent >= 40 && percent <= 70;
    return percent < 40;
  });
}

function ThemesMapRelevanceFilter({
  selectedFilters,
  onToggle,
  onReset,
  offeringOptions,
  selectedOffering,
  onOfferingChange,
  formatOfferingLabel,
}: {
  selectedFilters: RelevanceFilter[];
  onToggle: (value: RelevanceFilter) => void;
  onReset: () => void;
  offeringOptions: string[];
  selectedOffering: string;
  onOfferingChange: (value: string) => void;
  formatOfferingLabel: (value: string) => string;
}) {
  const selectedSet = React.useMemo(
    () => new Set(selectedFilters),
    [selectedFilters]
  );
  const activeFilterCount =
    selectedFilters.length + (selectedOffering === "all" ? 0 : 1);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label="Filter relevance"
          className={`h-10 font-normal ${activeFilterCount > 0
            ? "min-w-10 px-2 gap-1.5"
            : "w-10 p-0"
            }`}
        >
          <ListFilter className="text-muted-foreground h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="h-[18.24px] rounded-[3.2px] px-[5.12px] font-mono font-normal text-[10.4px]"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-full max-w-(--radix-popover-content-available-width) flex-col gap-3.5 p-4 sm:min-w-[320px]"
      >
        <div className="flex flex-col gap-1">
          <h4 className="font-medium leading-none">
            {activeFilterCount > 0 ? "Filters" : "No filters applied"}
          </h4>
          <p className="text-muted-foreground text-sm">
            Filter themes by offering and business relevance.
          </p>
        </div>

        {offeringOptions.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Typography
              variant="p"
              className="text-sm font-medium text-general-muted-foreground"
            >
              Offerings
            </Typography>
            <Select value={selectedOffering} onValueChange={onOfferingChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All offerings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offerings</SelectItem>
                {offeringOptions.map((offering) => (
                  <SelectItem key={offering} value={offering}>
                    {formatOfferingLabel(offering)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Typography
            variant="p"
            className="text-sm font-medium text-general-muted-foreground"
          >
            Relevance
          </Typography>
          {RELEVANCE_FILTER_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 hover:bg-accent"
            >
              <Checkbox
                checked={selectedSet.has(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>

        {activeFilterCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="w-fit rounded"
            onClick={onReset}
          >
            Reset filters
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

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

export function ThemesTableClient({
  businessId,
  onSplitViewChange,
  onMetricsTextChange,
  toolbarRightPrefix,
  view: controlledView,
  onViewChange,
}: ThemesTableClientProps) {
  const [internalView, setInternalView] = React.useState<ThemesView>("table");
  const view = controlledView ?? internalView;
  const setView = onViewChange ?? setInternalView;
  const [search, setSearch] = React.useState("");
  const [selectedOffering, setSelectedOffering] = React.useState("all");
  const [bubbleColorMetric, setBubbleColorMetric] =
    React.useState<ThemesBubbleColorMetric>("topicCoverage");
  const [selectedRelevanceFilters, setSelectedRelevanceFilters] =
    React.useState<RelevanceFilter[]>([]);
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


  const { fetchThemes, fetchScatterPlot, triggerThemes } = useThemes(businessId);
  const { data: jobDetails } = useJobByBusinessId(businessId || null);

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

  const {
    data: scatterData,
    isLoading: scatterLoading,
    isError: scatterError,
    error: scatterErrorData,
    refetch: refetchScatter,
  } = useQuery({
    queryKey: ["themes-scatter-plot", businessId],
    queryFn: fetchScatterPlot,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!businessId && view === "scatter",
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

    // Primary: job-level offerings (covers all business offerings)
    if (jobDetails?.offerings) {
      (jobDetails.offerings as Array<{ name?: string; offering?: string }>).forEach((o) => {
        const name = (o.name || o.offering || "").trim();
        if (name) offeringsSet.add(name);
      });
    }

    // Supplement with offerings found directly on theme rows
    allData.forEach((row) => {
      const originOffering = row.origin_offering?.trim();
      if (originOffering) offeringsSet.add(originOffering);
      row.offerings?.forEach((offering) => {
        const trimmed = offering.trim();
        if (trimmed) offeringsSet.add(trimmed);
      });
    });

    return Array.from(offeringsSet).sort();
  }, [jobDetails?.offerings, allData]);

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

  const toggleRelevanceFilter = React.useCallback((value: RelevanceFilter) => {
    setSelectedRelevanceFilters((current) =>
      current.includes(value)
        ? current.filter((filter) => filter !== value)
        : [...current, value]
    );
  }, []);

  const resetRelevanceFilters = React.useCallback(() => {
    setSelectedRelevanceFilters([]);
    setSelectedOffering("all");
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

    if (view === "bubble" && selectedRelevanceFilters.length > 0) {
      data = data.filter((row) =>
        matchesRelevanceFilter(
          row.business_relevance_score,
          selectedRelevanceFilters
        )
      );
    }

    return data;
  }, [allData, search, selectedOffering, advancedFilters, joinOperator, selectedRelevanceFilters, view]);

  const totalThemes = allData.length;
  const filteredScatterPoints = React.useMemo(() => {
    const points = scatterData?.points ?? [];
    if (selectedOffering === "all") return points;

    const topicNames = new Set(
      filteredData.flatMap((row) =>
        (row.topics ?? [])
          .map((topic) => topic.topic_name?.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    return points.filter((point) =>
      topicNames.has(point.topic_name.trim().toLowerCase())
    );
  }, [filteredData, scatterData?.points, selectedOffering]);

  const graphStats = React.useMemo(() => {
    const offerings = new Set<string>();
    const themeTotalScore = filteredScatterPoints.reduce(
      (total, point) => total + (point.business_relevance_score || 0),
      0
    );

    filteredData.forEach((row) => {
      const names = [
        ...(Array.isArray(row.offerings) ? row.offerings : []),
        row.origin_offering,
      ]
        .map((name) => String(name ?? "").trim())
        .filter(Boolean);

      names.forEach((name) => offerings.add(name));
    });

    return {
      offerings: offerings.size,
      themes: filteredData.length,
      topics: filteredScatterPoints.length,
      themeTotalScore,
    };
  }, [filteredData, filteredScatterPoints]);
  const formattedThemeTotalScore = Number.isInteger(graphStats.themeTotalScore)
    ? String(graphStats.themeTotalScore)
    : graphStats.themeTotalScore.toFixed(1);
  const themeMetricsText = React.useMemo(() => {
    if (view === "bubble") {
      return `${graphStats.offerings} Offerings, ${graphStats.themes} Themes`;
    }

    if (view === "scatter") {
      if (scatterLoading && !scatterData) return "Loading metrics...";
      return `${graphStats.topics} Topics, ${formattedThemeTotalScore} Theme Total Score`;
    }

    if (themesLoading && !themesData) return "Loading metrics...";
    if (!themesData?.hasData) return "";

    return search.trim()
      ? `${filteredData.length} of ${totalThemes} Themes total`
      : `${totalThemes} Themes total`;
  }, [
    filteredData.length,
    formattedThemeTotalScore,
    graphStats.offerings,
    graphStats.themes,
    graphStats.topics,
    scatterData,
    scatterLoading,
    search,
    themesData,
    themesLoading,
    totalThemes,
    view,
  ]);

  React.useEffect(() => {
    onMetricsTextChange?.(themeMetricsText);
  }, [onMetricsTextChange, themeMetricsText]);

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
    <div
      role="group"
      aria-label="Overview view controls"
      className="inline-flex h-[40px] shrink-0 items-center overflow-hidden rounded-lg border bg-background p-1 shadow-xs"
    >
      <button
        type="button"
        aria-label="Show overview list"
        onClick={() => setView("table")}
        className={cn(
          "flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors",
          view === "table"
            ? "bg-general-primary text-general-primary-foreground"
            : "text-general-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Show overview map"
        onClick={() => setView("bubble")}
        className={cn(
          "flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors",
          view === "bubble"
            ? "bg-general-primary text-general-primary-foreground"
            : "text-general-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <CircleDot className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Show overview scatter"
        onClick={() => setView("scatter")}
        className={cn(
          "flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors",
          view === "scatter"
            ? "bg-general-primary text-general-primary-foreground"
            : "text-general-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <ChartScatter className="h-4 w-4" />
      </button>
    </div>
  );

  const handleDownloadCsv = React.useCallback(() => {
    downloadRowsAsCsv(filteredData, "themes.csv");
  }, [filteredData]);

  if (view === "bubble") {
    return (
      <div className="flex-1 min-h-0 overflow-hidden h-full">
        <div className="bg-white rounded-lg p-4 h-full flex flex-col gap-2.5 overflow-hidden">
          <div
            role="toolbar"
            aria-orientation="horizontal"
            className="flex w-full items-start justify-between gap-2 p-1"
          >
            <div>
              <Select
                value={bubbleColorMetric}
                onValueChange={(value) =>
                  setBubbleColorMetric(value as ThemesBubbleColorMetric)
                }
              >
                <SelectTrigger className="mb-2 w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="topicCoverage">
                    Topic Coverage
                  </SelectItem>
                  <SelectItem value="businessRelevance">
                    Business Relevance
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="relative h-5 w-[320px] max-w-full rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  {BUSINESS_RELEVANCE_PALETTE.map((color) => (
                    <div
                      key={color}
                      className="h-full flex-1 shadow-inner"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-between px-3">
                  <span className="text-[10px] font-medium text-general-muted-foreground">
                    Low
                  </span>
                  <span className="text-[10px] font-medium text-general-muted-foreground">
                    High
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemesMapRelevanceFilter
                selectedFilters={selectedRelevanceFilters}
                onToggle={toggleRelevanceFilter}
                onReset={resetRelevanceFilters}
                offeringOptions={allOfferings}
                selectedOffering={selectedOffering}
                onOfferingChange={setSelectedOffering}
                formatOfferingLabel={formatOfferingLabel}
              />
              {toolbarRightPrefix}
              {!toolbarRightPrefix && viewToggle}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ThemesBubbleChart
              data={filteredData}
              colorMetric={bubbleColorMetric}
            />
          </div>
        </div>
      </div>
    );
  }

  if (view === "scatter") {
    return (
      <div className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden gap-2.5">
        <div
          role="toolbar"
          aria-orientation="horizontal"
          className="flex w-full items-start justify-between gap-2 p-1"
        >
          <div className="flex flex-1 flex-wrap items-center gap-4">
            <div>
              <Typography
                variant="p"
                className="font-mono mb-2 text-base text-general-muted-foreground"
              >
                Topic Relevance
              </Typography>
              <div className="relative h-5 w-[320px] max-w-full rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  {BUSINESS_RELEVANCE_PALETTE.map((color) => (
                    <div
                      key={color}
                      className="h-full flex-1 shadow-inner"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-between px-3">
                  <span className="text-[10px] font-medium text-general-muted-foreground">
                    Low
                  </span>
                  <span className="text-[10px] font-medium text-general-muted-foreground">
                    High
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {offeringsFilter}
            {toolbarRightPrefix}
            {!toolbarRightPrefix && viewToggle}
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {scatterLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border bg-white">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <Typography variant="p" className="font-medium text-foreground">
                Loading scatter plot…
              </Typography>
            </div>
          ) : scatterError ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border bg-white">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-destructive font-medium">Failed to load scatter plot</p>
              <p className="text-sm text-muted-foreground">
                {scatterErrorData instanceof Error
                  ? scatterErrorData.message
                  : "An error occurred"}
              </p>
              <Button onClick={() => refetchScatter()}>Try Again</Button>
            </div>
          ) : (
            <ThemesScatterPlot points={filteredScatterPoints} />
          )}
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
    <div className="bg-white rounded-lg p-4 h-full flex flex-col overflow-hidden">
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
        highlightSelectedRow={false}
      >
        <div
          role="toolbar"
          aria-orientation="horizontal"
          className="flex w-full items-start justify-between gap-2 p-1"
        >
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
            <DownloadCsvButton onDownload={handleDownloadCsv} disabled={filteredData.length === 0} />
            {toolbarRightPrefix}
            {!toolbarRightPrefix && viewToggle}
          </div>
        </div>
      </DataTable>
    </div>
  );
}
