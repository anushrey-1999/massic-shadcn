"use client";

import { Typography } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { TimePeriodValue } from "@/hooks/use-gsc-analytics";
import {
  Search,
  Eye,
  TrendingUp,
  TrendingDown,
  ListOrdered,
} from "lucide-react";
import Image from "next/image";
import React, { useMemo, useState, useCallback } from "react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from "@/components/molecules/analytics/DataTable";
import { DataTableModal } from "@/components/molecules/analytics/DataTableModal";
import { NoGSCMetricsSelected } from "@/components/molecules/analytics/NoGSCMetricsSelected";
import { PositionDistributionCard } from "@/components/molecules/analytics/PositionDistributionCard";
import { AITrafficChartCard } from "@/components/molecules/analytics/AITrafficChartCard";
import { LLMComparisonChart } from "@/components/molecules/analytics/LLMComparisonChart";
import { ContentGroupsIcon } from "@/components/molecules/analytics/ContentGroupsIcon";
import {
  useGSCAnalytics,
  type TableFilterType,
  type GA4TrafficScope,
} from "@/hooks/use-gsc-analytics";
import { useTotalQueries } from "@/hooks/use-total-queries";
import { useAISearchAnalytics } from "@/hooks/use-ai-search-analytics";
import { useBusinessStore } from "@/store/business-store";
import { usePathname } from "next/navigation";
import type {
  DeepdiveApiFilter,
  DeepdiveFilter,
} from "@/hooks/use-organic-deepdive-filters";

interface DiscoveryPerformanceSectionProps {
  period?: TimePeriodValue;
  visibleMetrics?: Record<string, boolean>;
  filters?: DeepdiveApiFilter[];
  onSelectFilter?: (filter: DeepdiveFilter) => void;
  onOpenCustomContentGroups?: () => void;
  hideTopQueries?: boolean;
  hideHowYouRank?: boolean;
  ga4TrafficScope?: GA4TrafficScope;
}

function normalizePageForDisplay(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "/";
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("?") || raw.startsWith("#")) return `/${raw}`;

  const noScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const noLeadingSlashes = noScheme.replace(/^\/\//, "");
  const firstSlashIndex = noLeadingSlashes.indexOf("/");
  if (firstSlashIndex < 0) return "/";

  const maybeHost = noLeadingSlashes.slice(0, firstSlashIndex);
  if (maybeHost.includes(".") || maybeHost.includes(":") || maybeHost === "localhost") {
    return noLeadingSlashes.slice(firstSlashIndex) || "/";
  }

  return raw;
}

function withZeroFallback<T extends { value: string | number; change?: number }>(
  cell: T | undefined
): { value: string | number; change?: number } {
  if (!cell) return { value: 0 };
  const rawValue = cell.value;

  if (
    rawValue === "—" ||
    rawValue === "-" ||
    rawValue === "–" ||
    rawValue === "" ||
    rawValue === null ||
    rawValue === undefined
  ) {
    return { value: 0 };
  }

  return cell;
}

const DiscoveryPerformanceSection = ({
  period = "3 months",
  visibleMetrics,
  filters = [],
  onSelectFilter,
  onOpenCustomContentGroups,
  hideTopQueries = false,
  hideHowYouRank = false,
  ga4TrafficScope = "organic",
}: DiscoveryPerformanceSectionProps) => {
  const pathname = usePathname();
  const profiles = useBusinessStore((state) => state.profiles);

  const { businessUniqueId, website } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/);
    if (!match) return { businessUniqueId: null, website: null };

    const id = match[1];
    const profile = profiles.find((p) => p.UniqueId === id);
    return {
      businessUniqueId: id,
      website: profile?.Website || null,
    };
  }, [pathname, profiles]);

  const {
    loadingState,
    contentGroupsData,
    topPagesData,
    topQueriesData,
    contentGroupsFilter,
    topPagesFilter,
    topQueriesFilter,
    contentGroupsSort,
    topPagesSort,
    topQueriesSort,
    handleContentGroupsFilterChange,
    handleTopPagesFilterChange,
    handleTopQueriesFilterChange,
    handleContentGroupsSort,
    handleTopPagesSort,
    handleTopQueriesSort,
    hasContentGroupsData,
    hasTopPagesData,
    hasTopQueriesData,
  } = useGSCAnalytics(businessUniqueId, website, period, filters, ga4TrafficScope);

  const {
    positionLegendItems,
    normalizedChartData: positionChartData,
    visibleLines: positionVisibleLines,
    isLoading: isLoadingPositions,
    hasData: hasPositionData,
    handleLegendToggle: handlePositionLegendToggle,
  } = useTotalQueries(businessUniqueId, website, period);

  const {
    chartData,
    normalizedSourcesData,
    metricsForCard,
    isLoading: isLoadingAI,
    hasChartData,
    hasSourcesData,
  } = useAISearchAnalytics(businessUniqueId, website, period);

  const llmIcons: Record<string, React.ReactNode> = {
    chatgpt: (
      <Image
        src="/icons/llms/chatgpt.svg"
        alt="ChatGPT"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
    claude: (
      <Image
        src="/icons/llms/calude.svg"
        alt="Claude"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
    perplexity: (
      <Image
        src="/icons/llms/perplexity.svg"
        alt="Perplexity"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
    gemini: (
      <Image
        src="/icons/llms/gemini.svg"
        alt="Gemini"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
    bing: (
      <Image
        src="/icons/llms/bing.svg"
        alt="Bing Chat"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
    "bing.com/chat": (
      <Image
        src="/icons/llms/bing.svg"
        alt="Bing Chat"
        width={38}
        height={38}
        className="h-[38px] w-[38px]"
        unoptimized
      />
    ),
  };

  function getIconForSource(sourceName: string): React.ReactNode {
    const normalizedName = sourceName.toLowerCase().trim();

    // Handle bing variations (Bing, bing.com/chat, etc.)
    if (normalizedName.includes("bing")) {
      return llmIcons.bing;
    }

    // Direct lookup - the hook returns names like "ChatGPT", "Claude", etc.
    // which when lowercased match our icon keys
    if (llmIcons[normalizedName]) {
      return llmIcons[normalizedName];
    }

    // Fallback to default icon if no match found
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 8v4M12 16h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const llmDataWithIcons = useMemo(() => {
    // Define the desired order: ChatGPT, Claude, Perplexity, Gemini, Bing
    const orderMap: Record<string, number> = {
      chatgpt: 1,
      claude: 2,
      perplexity: 3,
      gemini: 4,
      bing: 5,
    };

    // Define custom colors for each LLM
    const colorMap: Record<string, string> = {
      chatgpt: "#0A0A0A",
      claude: "#D97757",
      perplexity: "#22B8CD",
      gemini: "#4E86FC",
      bing: "#03ABCD",
    };

    const getOrder = (name: string): number => {
      const normalized = name.toLowerCase().trim();
      // Handle bing variations
      if (normalized.includes("bing")) {
        return orderMap.bing;
      }
      return orderMap[normalized] || 999;
    };

    const getColor = (name: string, fallbackColor: string): string => {
      const normalized = name.toLowerCase().trim();
      // Handle bing variations
      if (normalized.includes("bing")) {
        return colorMap.bing;
      }
      return colorMap[normalized] || fallbackColor;
    };

    const mappedData = normalizedSourcesData
      .map((source) => {
        const icon = getIconForSource(source.name);
        const customColor = getColor(source.name, source.color);
        return {
          name: source.name,
          icon: icon,
          value: source.normalizedValue,
          rawValue: source.value,
          change: source.change,
          color: customColor,
        };
      })
      .sort((a, b) => {
        const aOrder = getOrder(a.name);
        const bOrder = getOrder(b.name);
        return aOrder - bOrder;
      });

    return mappedData;
  }, [normalizedSourcesData]);

  const [contentGroupsModalOpen, setContentGroupsModalOpen] = useState(false);
  const [topPagesModalOpen, setTopPagesModalOpen] = useState(false);
  const [topQueriesModalOpen, setTopQueriesModalOpen] = useState(false);

  const handleContentGroupRowClick = useCallback((row: DataTableRow) => {
    if (!onSelectFilter) return;
    const expression = String(row._rawKey ?? row.key ?? "").trim();
    if (!expression) return;
    onSelectFilter({
      dimension: "content_group",
      operator: "equals",
      expression,
      source: row._source === "custom" ? "custom" : "default",
    });
  }, [onSelectFilter]);

  const handleTopPageRowClick = useCallback((row: DataTableRow) => {
    if (!onSelectFilter) return;
    const expression = String(row._rawKey ?? row.key ?? "").trim();
    if (!expression) return;
    onSelectFilter({
      dimension: "page",
      operator: "equals",
      expression,
    });
  }, [onSelectFilter]);

  const handleTopQueryRowClick = useCallback((row: DataTableRow) => {
    if (!onSelectFilter) return;
    const expression = String(row._rawKey ?? row.key ?? "").trim();
    if (!expression) return;
    onSelectFilter({
      dimension: "query",
      operator: "equals",
      expression,
    });
  }, [onSelectFilter]);

  const metricVisibility = useMemo(
    () => ({
      impressions: visibleMetrics?.impressions ?? true,
      clicks: visibleMetrics?.clicks ?? true,
      sessions: visibleMetrics?.sessions ?? true,
      goals: visibleMetrics?.goals ?? true,
    }),
    [visibleMetrics]
  );
  const hasGscMetricSelected = metricVisibility.impressions || metricVisibility.clicks;
  const hasActiveQueryFilter = filters.some((filter) => filter.dimension === "query");
  const shouldShowNoGscMetricsState = hasActiveQueryFilter && !hasGscMetricSelected;
  const showContentGroupsLoader = loadingState.contentGroups && !hasContentGroupsData;
  const showTopPagesLoader = loadingState.topPages && !hasTopPagesData;
  const showTopQueriesLoader = loadingState.topQueries && !hasTopQueriesData;

  const contentGroupColumns = useMemo<DataTableColumn[]>(() => {
    const columns: DataTableColumn[] = [
      { key: "key", label: "Content Group", width: "w-[200px]" },
    ];
    if (metricVisibility.impressions) {
      columns.push({ key: "impressions", label: "Impr.", sortable: true });
    }
    if (metricVisibility.clicks) {
      columns.push({ key: "clicks", label: "Clicks", sortable: true });
    }
    if (metricVisibility.sessions) {
      columns.push({ key: "sessions", label: "Sessions", sortable: true });
    }
    if (metricVisibility.goals) {
      columns.push({ key: "goals", label: "Goals", sortable: true });
    }
    return columns;
  }, [metricVisibility.clicks, metricVisibility.goals, metricVisibility.impressions, metricVisibility.sessions]);

  const topPagesColumns = useMemo<DataTableColumn[]>(() => {
    const columns: DataTableColumn[] = [
      { key: "key", label: "Top Pages", width: "w-[180px]" },
    ];
    if (metricVisibility.impressions) {
      columns.push({ key: "impressions", label: "Impr.", sortable: true });
    }
    if (metricVisibility.clicks) {
      columns.push({ key: "clicks", label: "Clicks", sortable: true });
    }
    if (metricVisibility.sessions) {
      columns.push({ key: "sessions", label: "Sessions", sortable: true });
    }
    if (metricVisibility.goals) {
      columns.push({ key: "goals", label: "Goals", sortable: true });
    }
    return columns;
  }, [metricVisibility.clicks, metricVisibility.goals, metricVisibility.impressions, metricVisibility.sessions]);

  const topQueriesColumns = useMemo<DataTableColumn[]>(() => {
    const columns: DataTableColumn[] = [
      { key: "key", label: "Top Queries", width: "w-[200px]" },
    ];
    if (metricVisibility.impressions) {
      columns.push({ key: "impressions", label: "Impr.", sortable: true });
    }
    if (metricVisibility.clicks) {
      columns.push({ key: "clicks", label: "Clicks", sortable: true });
    }
    return columns;
  }, [metricVisibility.clicks, metricVisibility.impressions]);

  const contentGroupModalColumns = useMemo<DataTableColumn[]>(() => {
    const columns: DataTableColumn[] = [{ key: "key", label: "Content Groups" }];
    if (metricVisibility.impressions) {
      columns.push({ key: "impressions", label: "Impr.", sortable: true });
    }
    if (metricVisibility.clicks) {
      columns.push({ key: "clicks", label: "Clicks", sortable: true });
    }
    if (metricVisibility.sessions) {
      columns.push({ key: "sessions", label: "Sessions", sortable: true });
    }
    if (metricVisibility.goals) {
      columns.push({ key: "goals", label: "Goals", sortable: true });
    }
    return columns;
  }, [metricVisibility.clicks, metricVisibility.goals, metricVisibility.impressions, metricVisibility.sessions]);

  const topPagesModalColumns = useMemo<DataTableColumn[]>(() => {
    const columns: DataTableColumn[] = [{ key: "key", label: "Top Page" }];
    if (metricVisibility.impressions) {
      columns.push({ key: "impressions", label: "Impr.", sortable: true });
    }
    if (metricVisibility.clicks) {
      columns.push({ key: "clicks", label: "Clicks", sortable: true });
    }
    if (metricVisibility.sessions) {
      columns.push({ key: "sessions", label: "Sessions", sortable: true });
    }
    if (metricVisibility.goals) {
      columns.push({ key: "goals", label: "Goals", sortable: true });
    }
    return columns;
  }, [metricVisibility.clicks, metricVisibility.goals, metricVisibility.impressions, metricVisibility.sessions]);

  const topQueriesModalColumns = useMemo<DataTableColumn[]>(() => {
    const columns: DataTableColumn[] = [{ key: "key", label: "Top Queries" }];
    if (metricVisibility.impressions) {
      columns.push({ key: "impressions", label: "Impr.", sortable: true });
    }
    if (metricVisibility.clicks) {
      columns.push({ key: "clicks", label: "Clicks", sortable: true });
    }
    return columns;
  }, [metricVisibility.clicks, metricVisibility.impressions]);

  const contentGroupsTableData = useMemo(
    () =>
      contentGroupsData.map((item) => ({
        key: item.key,
        _rawKey: item.rawKey || item.key,
        _source: item.source || "default",
        impressions: withZeroFallback(item.impressions),
        clicks: withZeroFallback(item.clicks),
        sessions: withZeroFallback(item.sessions),
        goals: withZeroFallback(item.goals),
      })),
    [contentGroupsData]
  );

  const renderContentGroupLabel = useCallback((row: DataTableRow, value: string) => {
    if (row._source !== "custom") {
      return <span className="truncate">{value}</span>;
    }

    return (
      <>
        <span className="truncate">{value}</span>
        <ContentGroupsIcon className="h-[13px] w-[13px] shrink-0 text-[#2E6A56]" />
      </>
    );
  }, []);

  const contentGroupsEmptyState = useMemo(() => {
    if (!onOpenCustomContentGroups) {
      return "No data available";
    }

    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="max-w-[260px] text-sm text-[#737373]">
          No content groups yet. Define custom content groups to start clustering related pages.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-[8px] border-[#D4D4D4] bg-white px-4 text-[14px] font-medium text-[#0A0A0A]"
          onClick={(event) => {
            event.stopPropagation();
            onOpenCustomContentGroups();
          }}
        >
          Define Content Groups
        </Button>
      </div>
    );
  }, [onOpenCustomContentGroups]);

  const topPagesTableData = useMemo(
    () =>
      topPagesData.map((item) => ({
        key: normalizePageForDisplay(item.key),
        _rawKey: item.key,
        impressions: withZeroFallback(item.impressions),
        clicks: withZeroFallback(item.clicks),
        sessions: withZeroFallback(item.sessions),
        goals: withZeroFallback(item.goals),
      })),
    [topPagesData]
  );

  const topQueriesTableData = useMemo(
    () =>
      topQueriesData.map((item) => ({
        key: item.key,
        _rawKey: item.key,
        impressions: item.impressions,
        clicks: item.clicks,
      })),
    [topQueriesData]
  );

  return (
    <div className="px-7 pb-10">
      <div className="flex items-center gap-2 pb-6">
        <Search className="h-8 w-8 text-general-foreground" />
        <Typography variant="h2">Discovery</Typography>
      </div>

      <div className="flex flex-col gap-3">
        <div className="">
          <div className="grid grid-cols-2 gap-3">
            {shouldShowNoGscMetricsState ? (
              <NoGSCMetricsSelected
                title="Content Group"
                description="Select at least one GSC metric to activate Content Group report."
              />
            ) : (
            <DataTable
              title="Content Group"
              titleTooltip="Content people are seeing"
              inlineHeader
              showTabs
              tabs={[
                { icon: <ListOrdered className="h-4 w-4" />, value: "popular" },
                { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
                {
                  icon: <TrendingDown className="h-4 w-4" />,
                  value: "decaying",
                },
              ]}
              activeTab={contentGroupsFilter}
              onTabChange={(value) =>
                handleContentGroupsFilterChange(value as TableFilterType)
              }
              columns={contentGroupColumns}
              data={contentGroupsTableData}
              isLoading={showContentGroupsLoader}
              hasData={hasContentGroupsData}
              emptyState={contentGroupsEmptyState}
              sortConfig={contentGroupsSort}
              onSort={(column) =>
                handleContentGroupsSort(
                  column as "impressions" | "clicks" | "sessions" | "goals"
                )
              }
              onArrowClick={() => setContentGroupsModalOpen(true)}
              onRowClick={handleContentGroupRowClick}
              maxRows={10}
              dynamicFirstColumn
              renderFirstColumn={renderContentGroupLabel}
            />
            )}

            {shouldShowNoGscMetricsState ? (
              <NoGSCMetricsSelected
                title="Top Pages"
                description="Select at least one GSC metric to activate Top Pages report."
              />
            ) : (
            <DataTable
              icon={<></>}
              title="Top Pages"
              titleTooltip="Content people are seeing"
              inlineHeader
              showTabs
              tabs={[
                { icon: <ListOrdered className="h-4 w-4" />, value: "popular" },
                { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
                {
                  icon: <TrendingDown className="h-4 w-4" />,
                  value: "decaying",
                },
              ]}
              activeTab={topPagesFilter}
              onTabChange={(value) =>
                handleTopPagesFilterChange(value as TableFilterType)
              }
              firstColumnTruncate="max-w-[300px]"
              columns={topPagesColumns}
              data={topPagesTableData}
              isLoading={showTopPagesLoader}
              hasData={hasTopPagesData}
              sortConfig={topPagesSort}
              onSort={(column) =>
                handleTopPagesSort(
                  column as "impressions" | "clicks" | "sessions" | "goals"
                )
              }
              onArrowClick={() => setTopPagesModalOpen(true)}
              onRowClick={handleTopPageRowClick}
              maxRows={10}
              dynamicFirstColumn
            />
            )}
          </div>
        </div>

        {/* Second Row */}
        {!hideTopQueries || !hideHowYouRank ? (
          <div className="">
            <div
              className={`grid gap-3 ${
                !hideTopQueries && !hideHowYouRank ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {!hideTopQueries ? (
                hasGscMetricSelected ? (
                  <DataTable
                    icon={<Eye className="h-4 w-4" />}
                    title="Top Queries"
                    titleTooltip="Searches to discover you"
                    inlineHeader
                    showTabs
                    tabs={[
                      {
                        icon: <ListOrdered className="h-4 w-4" />,
                        value: "popular",
                      },
                      { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
                      {
                        icon: <TrendingDown className="h-4 w-4" />,
                        value: "decaying",
                      },
                    ]}
                    activeTab={topQueriesFilter}
                    onTabChange={(value) =>
                      handleTopQueriesFilterChange(value as TableFilterType)
                    }
                    columns={topQueriesColumns}
                    data={topQueriesTableData}
                    isLoading={showTopQueriesLoader}
                    hasData={hasTopQueriesData}
                    sortConfig={topQueriesSort}
                    onSort={(column) =>
                      handleTopQueriesSort(column as "impressions" | "clicks")
                    }
                    onArrowClick={() => setTopQueriesModalOpen(true)}
                    onRowClick={handleTopQueryRowClick}
                    maxRows={10}
                    dynamicFirstColumn
                  />
                ) : (
                  <NoGSCMetricsSelected
                    title="Queries"
                    description="Select at least one GSC metric to activate Queries report."
                  />
                )
              ) : null}

              {!hideHowYouRank ? (
                shouldShowNoGscMetricsState ? (
                  <NoGSCMetricsSelected
                    title="How you rank"
                    description="Select at least one GSC metric to activate ranking report."
                  />
                ) : (
                  <PositionDistributionCard
                    positions={positionLegendItems}
                    chartData={positionChartData}
                    visibleLines={positionVisibleLines}
                    onToggle={handlePositionLegendToggle}
                    isLoading={isLoadingPositions}
                    hasData={hasPositionData}
                  />
                )
              ) : null}
            </div>
          </div>
        ) : null}

        {/* AI Search Section */}
        <div className="border border-general-border rounded-lg flex flex-col bg-white">
          <div className="p-2 border-b border-general-border-four">

          <Typography
            variant="p"
            className="text-base font-medium text-general-secondary-foreground"
            >
            AI Search
          </Typography>
            </div>

          <div className="grid grid-cols-2 gap-6 px-6 py-3">
            <AITrafficChartCard
              title="AI Search Traffic Over Time"
              metrics={metricsForCard}
              data={chartData}
              isLoading={isLoadingAI}
              hasData={hasChartData}
            />

            <LLMComparisonChart
              title="Relative search traffic across major LLMs"
              data={llmDataWithIcons}
              isLoading={isLoadingAI}
              hasData={hasSourcesData}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <DataTableModal
        open={contentGroupsModalOpen}
        onOpenChange={setContentGroupsModalOpen}
        title="Content people are seeing"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          {
            icon: <ListOrdered className="h-4 w-4" />,
            value: "popular",
            label: "Popular",
          },
          {
            icon: <TrendingUp className="h-4 w-4" />,
            value: "growing",
            label: "Growing",
          },
          {
            icon: <TrendingDown className="h-4 w-4" />,
            value: "decaying",
            label: "Decaying",
          },
        ]}
        activeTab={contentGroupsFilter}
        onTabChange={(value) =>
          handleContentGroupsFilterChange(value as TableFilterType)
        }
        columns={contentGroupModalColumns}
        data={contentGroupsTableData}
        sortConfig={contentGroupsSort}
        onSort={(column) =>
          handleContentGroupsSort(
            column as "impressions" | "clicks" | "sessions" | "goals"
          )
        }
        isLoading={showContentGroupsLoader}
        onRowClick={handleContentGroupRowClick}
        dynamicFirstColumn
        renderFirstColumn={renderContentGroupLabel}
      />

      <DataTableModal
        open={topPagesModalOpen}
        onOpenChange={setTopPagesModalOpen}
        title="Top Pages"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          {
            icon: <ListOrdered className="h-4 w-4" />,
            value: "popular",
            label: "Popular",
          },
          {
            icon: <TrendingUp className="h-4 w-4" />,
            value: "growing",
            label: "Growing",
          },
          {
            icon: <TrendingDown className="h-4 w-4" />,
            value: "decaying",
            label: "Decaying",
          },
        ]}
        activeTab={topPagesFilter}
        onTabChange={(value) =>
          handleTopPagesFilterChange(value as TableFilterType)
        }
        columns={topPagesModalColumns}
        data={topPagesTableData}
        sortConfig={topPagesSort}
        onSort={(column) =>
          handleTopPagesSort(
            column as "impressions" | "clicks" | "sessions" | "goals"
          )
        }
        isLoading={showTopPagesLoader}
        onRowClick={handleTopPageRowClick}
        dynamicFirstColumn
      />

      {!hideTopQueries && hasGscMetricSelected && (
        <DataTableModal
          open={topQueriesModalOpen}
          onOpenChange={setTopQueriesModalOpen}
          title="Searches to discover you"
          icon={<Eye className="h-4 w-4" />}
          tabs={[
            {
              icon: <ListOrdered className="h-4 w-4" />,
              value: "popular",
              label: "Popular",
            },
            {
              icon: <TrendingUp className="h-4 w-4" />,
              value: "growing",
              label: "Growing",
            },
            {
              icon: <TrendingDown className="h-4 w-4" />,
              value: "decaying",
              label: "Decaying",
            },
          ]}
          activeTab={topQueriesFilter}
          onTabChange={(value) =>
            handleTopQueriesFilterChange(value as TableFilterType)
          }
          columns={topQueriesModalColumns}
          data={topQueriesTableData}
          sortConfig={topQueriesSort}
          onSort={(column) =>
            handleTopQueriesSort(column as "impressions" | "clicks")
          }
          isLoading={showTopQueriesLoader}
          onRowClick={handleTopQueryRowClick}
          dynamicFirstColumn
        />
      )}
    </div>
  );
};

export default DiscoveryPerformanceSection;
