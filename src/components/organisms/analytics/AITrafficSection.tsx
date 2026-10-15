"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Bot,
  ChartSpline,
  FileText,
  Info,
  Search,
  Loader2,
  Target,
} from "lucide-react";
import {
  useAITraffic,
  type AILandingPageSort,
  type AILandingPageSortKey,
  type AITrafficMeta,
} from "@/hooks/use-ai-traffic";
import type { TimePeriodValue } from "@/utils/analytics-period";
import {
  groupAnalyticsChartData,
  calculateTrailingMovingAverage,
  getAvailableAnalyticsGroupings,
  type AnalyticsGroupBy,
} from "@/utils/analytics-chart-grouping";
import { AreaChartCard } from "@/components/molecules/analytics/AreaChartCard";
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
  type DataTableMetricCell,
  type SortConfig,
} from "@/components/molecules/analytics/DataTable";
import { DataTableModal } from "@/components/molecules/analytics/DataTableModal";
import { SourceFavicon } from "@/components/molecules/analytics/SourceFavicon";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/molecules/analytics/MetricCard";
import { ChartLegend } from "@/components/molecules/analytics/ChartLegend";
import { ChartOverlayToggle } from "@/components/molecules/analytics/ChartOverlayToggle";
import { CHART_SERIES_COLORS } from "@/utils/analytics-metrics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const percent = (value: number | null) =>
  value === null
    ? "—"
    : `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
const count = (value: number) => value.toLocaleString();
const METRIC_COLUMNS: DataTableColumn[] = [
  { key: "key", label: "Channel" },
  { key: "sessions", label: "Sessions", width: "w-[20%]" },
  { key: "engagement", label: "Engagement rate", width: "w-[20%]" },
  { key: "goals", label: "Goals", width: "w-[20%]" },
  {
    key: "goalRate",
    label: "Session goal rate",
    width: "w-[20%]",
    tooltipLabel: "Percentage of sessions with at least one GA4 key event",
  },
];
const SOURCE_COLUMNS: DataTableColumn[] = [
  { key: "key", label: "Assistant", width: "w-[40%]" },
  { key: "sessions", label: "Sessions", width: "w-[20%]", sortable: true },
  { key: "share", label: "AI share", width: "w-[20%]" },
  { key: "goals", label: "Goals", width: "w-[20%]", sortable: true },
];
const PAGE_COLUMNS: DataTableColumn[] = [
  { key: "key", label: "Landing page", width: "w-[40%]" },
  { key: "sessions", label: "Sessions", width: "w-[20%]", sortable: true },
  { key: "goals", label: "Goals", width: "w-[20%]", sortable: true },
  {
    key: "goalRate",
    label: "Session goal rate",
    width: "w-[20%]",
    sortable: true,
    tooltipLabel: "Percentage of sessions with at least one GA4 key event",
  },
];
const PAGE_SORT_KEYS = new Set<string>(["sessions", "goals", "goalRate"]);
const GOAL_COLUMNS: DataTableColumn[] = [
  { key: "key", label: "Goal event" },
  { key: "goals", label: "Events" },
];

const SESSION_COLORS = {
  aiSessions: CHART_SERIES_COLORS.clicks,
  organicSessions: CHART_SERIES_COLORS.sessions,
};

function metricChange(
  current: number | null,
  previous: number | null,
  rate = false,
) {
  if (current === null || previous === null) return { change: undefined };
  const change = rate
    ? (current - previous) * 100
    : previous > 0
      ? ((current - previous) / previous) * 100
      : current > 0
        ? 1
        : 0;
  return {
    change: Number(change.toFixed(1)),
    changeUnit: rate ? ("pp" as const) : ("%" as const),
    changeLabel: !rate && previous === 0 && current > 0 ? "New" : undefined,
  };
}

function metricCell(
  current: number | null,
  previous?: number | null,
  rate = false,
): DataTableMetricCell {
  return {
    value: rate ? percent(current) : count(current ?? 0),
    rawValue: current === null ? undefined : rate ? current * 100 : current,
    previousValue:
      previous == null ? undefined : rate ? previous * 100 : previous,
    ...(previous === undefined ? {} : metricChange(current, previous, rate)),
  };
}

function ReportError({
  retry,
  fetching,
}: {
  retry: () => void;
  fetching: boolean;
}) {
  return (
    <Alert variant="destructive" className="my-3" role="alert">
      <AlertCircle className="size-4" />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>Unable to load this AI Traffic report. Try again.</span>
        <Button variant="outline" size="sm" onClick={retry} disabled={fetching}>
          {fetching && <Loader2 className="size-4 animate-spin" />}{" "}
          {fetching ? "Retrying…" : "Try again"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function QualityNotice({ meta }: { meta?: AITrafficMeta }) {
  if (!meta || !Object.values(meta.quality).some(Boolean)) return null;
  return (
    <p
      className="flex items-start gap-2 text-xs text-general-muted-foreground py-2"
      role="status"
    >
      <Info className="size-4 shrink-0" />
      <span>
        Google Analytics reports{" "}
        {[
          meta.quality.thresholded && "privacy thresholds",
          meta.quality.sampled && "sampled data",
          meta.quality.dataLossFromOtherRow && "some rows grouped as Other",
        ]
          .filter(Boolean)
          .join(", ")}
        . Displayed figures may be incomplete.
      </span>
    </p>
  );
}

function ReportTable({
  title,
  icon,
  columns,
  rows,
  query,
  onExpand,
  renderSource = false,
  sortConfig,
  onSort,
  fixedLayout = false,
}: {
  title: string;
  icon: ReactNode;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  query: {
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    refetch: () => unknown;
    data?: { meta: AITrafficMeta };
  };
  onExpand?: () => void;
  renderSource?: boolean;
  sortConfig?: SortConfig;
  onSort?: (column: string) => void;
  /** Fixed column widths so long first-column values truncate instead of pushing metrics off-screen. */
  fixedLayout?: boolean;
}) {
  return (
    <div className="min-w-0">
      {query.isError && (
        <ReportError
          retry={() => {
            void query.refetch();
          }}
          fetching={query.isFetching}
        />
      )}
      {(!query.isError || query.data) && (
        <DataTable
          className={
            columns.length >= 4
              ? "[&_table]:min-w-[540px] sm:[&_table]:min-w-0"
              : undefined
          }
          title={title}
          icon={icon}
          columns={columns}
          data={rows}
          inlineHeader
          isLoading={query.isLoading}
          hasData={rows.length > 0}
          maxRows={10}
          onArrowClick={rows.length > 0 ? onExpand : undefined}
          emptyState={<span>No AI Assistant data for this period.</span>}
          renderFirstColumn={
            renderSource
              ? (_row, value) => (
                  <>
                    <SourceFavicon sourceName={value} />
                    <span className="truncate">{value}</span>
                  </>
                )
              : undefined
          }
          sortConfig={sortConfig}
          onSort={onSort}
          dynamicFirstColumn={fixedLayout}
        />
      )}
      <QualityNotice meta={query.data?.meta} />
    </div>
  );
}

interface AITrafficSectionProps {
  businessId: string | null;
  period: TimePeriodValue;
  groupBy: AnalyticsGroupBy;
  scopeRevision: number;
  onAvailableGroupingsChange: (options: AnalyticsGroupBy[]) => void;
  visibleLines: Record<string, boolean>;
}

export function AITrafficSection({
  businessId,
  period,
  groupBy,
  scopeRevision,
  onAvailableGroupingsChange,
  visibleLines,
}: AITrafficSectionProps) {
  const [expanded, setExpanded] = useState<
    "sources" | "pages" | "goals" | null
  >(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [movingAverageOn, setMovingAverageOn] = useState(true);
  const showMovingAverage = movingAverageOn && groupBy === "day";
  const [sourceSort, setSourceSort] = useState<SortConfig>({ column: "sessions", direction: "desc" });
  const sortSources = (column: string) => setSourceSort((current) => ({
    column,
    direction: current.column === column && current.direction === "desc" ? "asc" : "desc",
  }));
  const [pageSort, setPageSort] = useState<AILandingPageSort>({
    sortBy: "sessions",
    sortDirection: "desc",
  });
  const sortPages = (column: string) => {
    if (!PAGE_SORT_KEYS.has(column)) return;
    setPage(0);
    setPageSort((current) => ({
      sortBy: column as AILandingPageSortKey,
      sortDirection:
        current.sortBy === column && current.sortDirection === "desc" ? "asc" : "desc",
    }));
  };
  const pageSortConfig: SortConfig = {
    column: pageSort.sortBy,
    direction: pageSort.sortDirection,
  };
  const lines = {
    aiSessions: visibleLines.clicks,
    organicSessions: visibleLines.sessions,
  };
  const id = useId().replace(/:/g, "");
  const reports = useAITraffic(
    businessId,
    period,
    scopeRevision,
    page,
    pageSize,
    expanded === "pages",
    pageSort,
  );
  const { overview, sources, landingPages, expandedPages, goals, gate } =
    reports;
  const data = overview.data?.data;

  useEffect(() => {
    setPage(0);
    setExpanded(null);
  }, [businessId, period, scopeRevision]);
  useEffect(() => {
    if (!data) return;
    onAvailableGroupingsChange(
      getAvailableAnalyticsGroupings(
        data.ranges.currentStart,
        data.ranges.currentEnd,
      ),
    );
  }, [data, onAvailableGroupingsChange]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const daily = data.daily.map((point) => ({
      date: point.date,
      dateKey: point.date,
      impressions: 0,
      clicks: point.aiSessions,
      sessions: point.organicSessions,
    }));
    const points = showMovingAverage
      ? calculateTrailingMovingAverage(daily, 7)
      : daily;
    return groupAnalyticsChartData(
      points,
      groupBy,
      data.ranges.currentStart,
      data.ranges.currentEnd,
    ).map((point) => ({
      date: point.date,
      rangeLabel: point.rangeLabel,
      rangeContextLabel: point.rangeContextLabel,
      aiSessions: point.clicks,
      organicSessions: point.sessions,
    }));
  }, [data, groupBy, showMovingAverage]);

  const sourceRows = [...(sources.data?.data.rows || [])].sort((a, b) => {
    const key = sourceSort.column === "goals" ? "goals" : "sessions";
    return (a.current[key] - b.current[key]) * (sourceSort.direction === "desc" ? -1 : 1);
  }).map((row) => ({
    key: row.name,
    sessions: metricCell(row.current.sessions, row.previous.sessions),
    share: percent(row.share),
    goals: metricCell(row.current.goals, row.previous.goals),
  }));
  const pageRows = (landingPages.data?.data.rows || []).map((row) => ({
    key: row.page,
    sessions: count(row.sessions),
    goals: count(row.goals),
    goalRate: percent(row.sessionGoalRate),
  }));
  const expandedPageRows = (expandedPages.data?.data.rows || []).map((row) => ({
    key: row.page,
    sessions: count(row.sessions),
    goals: count(row.goals),
    goalRate: percent(row.sessionGoalRate),
  }));
  const goalRows = (goals.data?.data.rows || []).map((row) => ({
    key: row.event,
    goals: count(row.goals),
  }));
  const comparisonRows = data
    ? (["ai", "organic"] as const).map((channel) => ({
        key: channel === "ai" ? "AI Assistant" : "Organic Search",
        sessions: metricCell(
          data.current[channel].sessions,
          data.previous[channel].sessions,
        ),
        engagement: metricCell(
          data.current[channel].engagementRate,
          data.previous[channel].engagementRate,
          true,
        ),
        goals: metricCell(
          data.current[channel].goals,
          data.previous[channel].goals,
        ),
        goalRate: metricCell(
          data.current[channel].sessionGoalRate,
          data.previous[channel].sessionGoalRate,
          true,
        ),
      }))
    : [];

  if (gate.isResolving)
    return (
      <div className="p-7" role="status">
        <Skeleton className="h-60 w-full" />
        <span className="sr-only">Checking Google Analytics connection</span>
      </div>
    );
  if (gate.isBlocked)
    return (
      <div className="p-7">
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            Connect Google Analytics in Settings to view AI Traffic.
          </AlertDescription>
        </Alert>
      </div>
    );

  const kpis = data
    ? [
        {
          label: "AI sessions",
          value: count(data.current.ai.sessions),
          ...metricChange(data.current.ai.sessions, data.previous.ai.sessions),
          help: "Sessions classified by Google Analytics as AI Assistant.",
        },
        {
          label: "Share of total traffic",
          value: percent(data.current.aiShare),
          ...metricChange(data.current.aiShare, data.previous.aiShare, true),
          help: "AI sessions divided by all sessions in the same dates and GA4 page scope.",
        },
        {
          label: "AI goals",
          value: count(data.current.ai.goals),
          ...metricChange(data.current.ai.goals, data.previous.ai.goals),
          help: "GA4 key events. Repeated events can occur in one session; these are not unique leads.",
        },
        {
          label: "Session goal rate",
          value: percent(data.current.ai.sessionGoalRate),
          ...metricChange(
            data.current.ai.sessionGoalRate,
            data.previous.ai.sessionGoalRate,
            true,
          ),
          help: "Percentage of AI Assistant sessions with at least one GA4 key event.",
        },
      ]
    : [];
  const modalTitle =
    expanded === "sources"
      ? "Assistant sources"
      : expanded === "pages"
        ? "AI landing pages"
        : "AI goal events";
  const modalQuery =
    expanded === "pages"
      ? expandedPages
      : expanded === "goals"
        ? goals
        : sources;

  return (
    <section
      className="flex min-w-0 flex-col gap-3 p-7 pb-10"
      aria-label="AI Traffic"
    >
      {overview.isError && (
        <ReportError
          retry={() => {
            void overview.refetch();
          }}
          fetching={overview.isFetching}
        />
      )}
      {overview.isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white p-2 rounded-lg border border-general-border"
          role="status"
          aria-label="Loading AI metrics"
        >
          {[0, 1, 2, 3].map((key) => (
            <MetricCard key={key} isLoading />
          ))}
        </div>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white p-2 rounded-lg border border-general-border">
              {kpis.map((metric) => (
                <Tooltip key={metric.label}>
                  <TooltipTrigger asChild>
                    <div
                      tabIndex={0}
                      className="min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <MetricCard
                        label={metric.label}
                        value={metric.value}
                        change={metric.change}
                        changeUnit={metric.changeUnit}
                        changeLabel={metric.changeLabel}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-72">
                    {metric.help} Compared with the previous period.
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            {data.current.ai.sessions === 0 && (
              <Alert>
                <Info className="size-4" />
                <AlertDescription>
                  No AI Assistant sessions reported for this period.
                </AlertDescription>
              </Alert>
            )}
            <div className="relative rounded-lg overflow-hidden bg-white border border-general-border min-h-[320px] p-3 pr-8 flex flex-col min-w-0">
              <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-2">
                <ChartLegend
                  variant="box"
                  showToggle={false}
                  items={(["aiSessions", "organicSessions"] as const)
                    .map((key) => {
                      const channel = key === "aiSessions" ? "ai" : "organic";
                      const label =
                        key === "aiSessions"
                          ? "AI Assistant sessions"
                          : "Organic Search sessions";
                      const change = metricChange(
                        data.current[channel].sessions,
                        data.previous[channel].sessions,
                      );
                      return {
                        key,
                        label,
                        icon: (
                          <>
                            {key === "aiSessions" ? <Bot /> : <Search />}
                            <span className="text-xs">{label}</span>
                          </>
                        ),
                        color: SESSION_COLORS[key],
                        value: count(data.current[channel].sessions),
                        change: change.change ?? 0,
                        changeLabel: change.changeLabel,
                        checked: lines[key],
                      };
                    })
                    .filter((item) => item.checked)}
                />
                <ChartOverlayToggle
                  icon={ChartSpline}
                  label="7-day moving average"
                  active={showMovingAverage}
                  disabled={groupBy !== "day"}
                  disabledReason="The 7-day moving average is available in Day view"
                  onToggle={setMovingAverageOn}
                  activeIconClassName="text-primary"
                />
              </div>
              <AreaChartCard
                key={`${period}:${groupBy}:${showMovingAverage}`}
                data={chartData}
                height={242}
                variant="analytics"
                tooltipBadges={showMovingAverage && (
                  <span className="shrink-0 rounded-sm bg-general-secondary px-2 py-0.5 text-[10px] font-medium leading-4 text-general-muted-foreground">
                    7-day average
                  </span>
                )}
                config={{
                  aiSessions: {
                    label: showMovingAverage
                      ? "AI Assistant sessions (7-day average)"
                      : "AI Assistant sessions",
                    color: SESSION_COLORS.aiSessions,
                  },
                  organicSessions: {
                    label: showMovingAverage
                      ? "Organic Search sessions (7-day average)"
                      : "Organic Search sessions",
                    color: SESSION_COLORS.organicSessions,
                  },
                }}
                areas={(["aiSessions", "organicSessions"] as const)
                  .filter((key) => lines[key])
                  .map((key) => ({
                    dataKey: key,
                    stroke: SESSION_COLORS[key],
                    fillColor: SESSION_COLORS[key],
                    fillId: `${id}-${key}`,
                    dot: showMovingAverage && chartData.length === 1,
                  }))}
              />
              <QualityNotice meta={overview.data?.meta} />
            </div>
          </>
        )
      )}
      <div className="grid grid-cols-1 gap-3">
        <DataTable
          className="[&_table]:min-w-[540px] sm:[&_table]:min-w-0"
          title="Channel comparison"
          titleTooltip="GA4 session attribution for AI Assistant and Organic Search"
          columns={METRIC_COLUMNS}
          data={comparisonRows}
          inlineHeader
          isLoading={overview.isLoading}
          hasData={comparisonRows.length > 0}
          emptyState={
            overview.isError ? (
              <span>Channel comparison is unavailable.</span>
            ) : undefined
          }
        />
        <ReportTable
          title="Assistant sources"
          icon={<Bot className="size-5" />}
          columns={SOURCE_COLUMNS}
          rows={sourceRows}
          query={sources}
          onExpand={() => setExpanded("sources")}
          renderSource
          sortConfig={sourceSort}
          onSort={sortSources}
          fixedLayout
        />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <ReportTable
          title="AI landing pages"
          icon={<FileText className="size-5" />}
          columns={PAGE_COLUMNS}
          rows={pageRows}
          query={landingPages}
          onExpand={() => {
            setPage(0);
            setExpanded("pages");
          }}
          sortConfig={pageSortConfig}
          onSort={sortPages}
          fixedLayout
        />
        <ReportTable
          title="AI goal events"
          icon={<Target className="size-5" />}
          columns={GOAL_COLUMNS}
          rows={goalRows}
          query={goals}
          onExpand={() => setExpanded("goals")}
          fixedLayout
        />
      </div>
      <DataTableModal
        open={expanded !== null}
        onOpenChange={(open) => {
          if (!open) setExpanded(null);
        }}
        title={modalTitle}
        sortConfig={
          expanded === "sources"
            ? sourceSort
            : expanded === "pages"
              ? pageSortConfig
              : undefined
        }
        onSort={
          expanded === "sources"
            ? sortSources
            : expanded === "pages"
              ? sortPages
              : undefined
        }
        dynamicFirstColumn
        columns={
          expanded === "sources"
            ? SOURCE_COLUMNS
            : expanded === "pages"
              ? PAGE_COLUMNS
              : GOAL_COLUMNS
        }
        data={
          expanded === "sources"
            ? sourceRows
            : expanded === "pages"
              ? expandedPageRows
              : goalRows
        }
        isLoading={modalQuery.isFetching}
        errorState={
          modalQuery.isError ? (
            <div className="p-4">
              <ReportError
                retry={() => {
                  void modalQuery.refetch();
                }}
                fetching={modalQuery.isFetching}
              />
            </div>
          ) : undefined
        }
        pagination={
          expanded === "pages"
            ? {
                rowCount:
                  expandedPages.data?.data.rowCount ??
                  landingPages.data?.data.rowCount ??
                  0,
                page,
                pageSize,
                onPageChange: setPage,
                onPageSizeChange: (size) => {
                  setPage(0);
                  setPageSize(size);
                },
              }
            : undefined
        }
      />
    </section>
  );
}
