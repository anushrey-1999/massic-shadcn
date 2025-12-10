"use client"

import { Eye, MousePointerClick, Target, Star, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { MetricCard } from "../components/MetricCard"
import { GoalAlertBar, TrafficAlertBar } from "../components/AlertBar"
import { GoalAnalysisSheet } from "../components/GoalAnalysisSheet"
import { TrafficAnalysisSheet } from "../components/TrafficAnalysisSheet"
import { FunnelChart } from "../components/FunnelChart"
import { DataTable } from "../components/DataTable"
import { DataTableModal } from "../components/DataTableModal"
import { ChartLegend } from "../components/ChartLegend"
import { PositionDistributionCard } from "../components/PositionDistributionCard"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useGSCAnalytics, type TimePeriodValue, type TableFilterType } from "@/hooks/use-gsc-analytics"
import { useTotalQueries } from "@/hooks/use-total-queries"
import { useGapAnalysis } from "@/hooks/use-gap-analysis"
import { useGoalAnalysis } from "@/hooks/use-goal-analysis"
import { useTrafficAnalysis } from "@/hooks/use-traffic-analysis"
import { useBusinessStore } from "@/store/business-store"
import { usePathname } from "next/navigation"
import { useMemo, useState, useCallback, useEffect } from "react"

const METRIC_ICONS: Record<string, React.ReactNode> = {
  "topic-coverage": <Target className="h-5 w-5" />,
  "visibility-relevance": <Eye className="h-5 w-5" />,
  "engagement-relevance": <MousePointerClick className="h-5 w-5" />,
}

interface OrganicPerformanceSectionProps {
  period?: TimePeriodValue
}

export function OrganicPerformanceSection({ period = "3 months" }: OrganicPerformanceSectionProps) {
  const pathname = usePathname()
  const profiles = useBusinessStore((state) => state.profiles)

  const { businessUniqueId, website, businessName } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/)
    if (!match) return { businessUniqueId: null, website: null, businessName: "" }

    const id = match[1]
    const profile = profiles.find((p) => p.UniqueId === id)
    return {
      businessUniqueId: id,
      website: profile?.Website || null,
      businessName: profile?.Name || profile?.DisplayName || "",
    }
  }, [pathname, profiles])

  const {
    chartData,
    normalizedChartData,
    chartConfig,
    chartLegendItems,
    funnelChartItems,
    isLoading,
    hasData,
    hasFunnelData,
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
  } = useGSCAnalytics(businessUniqueId, website, period)

  const {
    positionLegendItems,
    normalizedChartData: positionChartData,
    visibleLines: positionVisibleLines,
    isLoading: isLoadingPositions,
    hasData: hasPositionData,
    handleLegendToggle: handlePositionLegendToggle,
  } = useTotalQueries(businessUniqueId, website, period)

  const {
    metricCards,
    isLoading: isLoadingMetrics,
    hasData: hasMetricsData,
    status: metricsStatus,
    statusMessage: metricsStatusMessage,
  } = useGapAnalysis(businessUniqueId)

  const {
    goalData,
    criticalCount,
    warningCount,
    positiveCount,
    isLoading: isLoadingGoals,
    error: goalError,
  } = useGoalAnalysis(businessUniqueId, businessName, null)

  const {
    trafficData,
    isLoading: isLoadingTraffic,
    error: trafficError,
  } = useTrafficAnalysis(businessUniqueId, businessName, null)

  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  const [trafficSheetOpen, setTrafficSheetOpen] = useState(false)

  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    impressions: true,
    clicks: true,
    goals: true,
  })

  const handleLegendToggle = useCallback((key: string, checked: boolean) => {
    setVisibleLines((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length
      if (!checked && checkedCount <= 1) {
        return prev
      }
      return { ...prev, [key]: checked }
    })
  }, [])

  const chartLegendWithIcons = useMemo(() => {
    const iconConfig: Record<string, { icon: React.ReactNode; color: string }> = {
      impressions: { icon: <Eye className="h-4 w-4" />, color: "#6b7280" },
      clicks: { icon: <MousePointerClick className="h-4 w-4" />, color: "#2563eb" },
      goals: { icon: <Target className="h-4 w-4" />, color: "#059669" },
    }
    return chartLegendItems.map((item) => ({
      ...item,
      icon: iconConfig[item.key]?.icon || <Eye className="h-4 w-4" />,
      color: iconConfig[item.key]?.color,
      checked: visibleLines[item.key] ?? true,
    }))
  }, [chartLegendItems, visibleLines])

  const [contentGroupsModalOpen, setContentGroupsModalOpen] = useState(false)
  const [topPagesModalOpen, setTopPagesModalOpen] = useState(false)
  const [topQueriesModalOpen, setTopQueriesModalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-7">
      <h2 className="text-base font-semibold">Organic Performance</h2>

      {/* Alert Bars */}
      <div className="flex flex-col gap-3">
        <GoalAlertBar
          criticalCount={criticalCount}
          warningCount={warningCount}
          positiveCount={positiveCount}
          isLoading={isLoadingGoals}
          error={goalError}
          onClick={() => setGoalSheetOpen(true)}
        />
        <TrafficAlertBar
          trafficData={trafficData}
          isLoading={isLoadingTraffic}
          error={trafficError}
          onClick={() => setTrafficSheetOpen(true)}
        />
      </div>

      {/* Goal Analysis Sheet */}
      <GoalAnalysisSheet
        open={goalSheetOpen}
        onOpenChange={setGoalSheetOpen}
        defaultGoalData={goalData}
        defaultCriticalCount={criticalCount}
        defaultWarningCount={warningCount}
        defaultPositiveCount={positiveCount}
        defaultIsLoading={isLoadingGoals}
        businessId={businessUniqueId}
        businessName={businessName}
      />

      {/* Traffic Analysis Sheet */}
      <TrafficAnalysisSheet
        open={trafficSheetOpen}
        onOpenChange={setTrafficSheetOpen}
        defaultTrafficData={trafficData}
        defaultIsLoading={isLoadingTraffic}
        businessId={businessUniqueId}
        businessName={businessName}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        {metricsStatus === "loading" ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3 h-[88px] gap-2"
              >
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Analyzing...</span>
              </div>
            ))}
          </>
        ) : metricsStatus === "success" && metricCards.length > 0 ? (
          metricCards.map((card) => (
            <MetricCard
              key={card.key}
              icon={METRIC_ICONS[card.key] || <Target className="h-5 w-5" />}
              label={card.title}
              value={card.percentage}
              change={card.change}
              sparklineData={card.sparklineData}
            />
          ))
        ) : (
          <div className="col-span-3 flex items-center justify-center rounded-lg border border-border bg-card p-4 text-muted-foreground text-sm">
            {metricsStatusMessage || "No performance data available"}
          </div>
        )}
      </div>

      {/* Area Chart with Funnel */}
      <div className="grid grid-cols-[1fr_327px] border border-border rounded-lg overflow-hidden">
        <div className="bg-card p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-[290px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : hasData ? (
            <>
              <ChartLegend
                className="mb-4"
                items={chartLegendWithIcons}
                onToggle={handleLegendToggle}
              />
              <div className="h-[210px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={normalizedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillImpressions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6b7280" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#6b7280" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="fillGoals" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                      />
                      <YAxis hide domain={[0, 100]} />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          const data = payload[0]?.payload
                          return (
                            <div className="bg-background border border-border rounded-lg p-2 shadow-md">
                              <p className="text-sm font-medium mb-1">{label}</p>
                              <div className="space-y-1 text-xs">
                                {visibleLines.impressions && (
                                  <p className="text-gray-500">Impressions: {data?.impressions?.toLocaleString()}</p>
                                )}
                                {visibleLines.clicks && (
                                  <p className="text-blue-600">Clicks: {data?.clicks?.toLocaleString()}</p>
                                )}
                                {visibleLines.goals && data?.goals !== undefined && (
                                  <p className="text-emerald-600">Goals: {data?.goals?.toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                          )
                        }}
                      />
                      {visibleLines.impressions && (
                        <Area
                          type="monotone"
                          dataKey="impressionsNorm"
                          stroke="#6b7280"
                          fill="url(#fillImpressions)"
                          strokeWidth={2}
                          name="Impressions"
                        />
                      )}
                      {visibleLines.clicks && (
                        <Area
                          type="monotone"
                          dataKey="clicksNorm"
                          stroke="#2563eb"
                          fill="url(#fillClicks)"
                          strokeWidth={2}
                          name="Clicks"
                        />
                      )}
                      {visibleLines.goals && (
                        <Area
                          type="monotone"
                          dataKey="goalsNorm"
                          stroke="#059669"
                          fill="url(#fillGoals)"
                          strokeWidth={2}
                          name="Goals"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[290px] text-muted-foreground">
              No GSC data available. Please connect Google Search Console.
            </div>
          )}
        </div>

        <div className="bg-card p-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : hasFunnelData ? (
            <FunnelChart data={funnelChartItems} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No funnel data available
            </div>
          )}
        </div>
      </div>

      {/* Tables Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        <DataTable
          icon={<Eye className="h-4 w-4" />}
          title="Content people are seeing"
          showTabs
          tabs={[
            { icon: <Star className="h-4 w-4" />, value: "popular" },
            { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
            { icon: <TrendingDown className="h-4 w-4" />, value: "decaying" },
          ]}
          activeTab={contentGroupsFilter}
          onTabChange={(value) => handleContentGroupsFilterChange(value as TableFilterType)}
          columns={[
            { key: "key", label: "Content Groups", width: "w-[200px]" },
            { key: "impressions", label: "Impressions", sortable: true },
            { key: "clicks", label: "Clicks", sortable: true },
          ]}
          data={contentGroupsData.map((item) => ({
            key: item.key,
            impressions: item.impressions,
            clicks: item.clicks,
          }))}
          isLoading={isLoading}
          hasData={hasContentGroupsData}
          sortConfig={contentGroupsSort}
          onSort={(column) => handleContentGroupsSort(column as "impressions" | "clicks")}
          onArrowClick={() => setContentGroupsModalOpen(true)}
          maxRows={5}
        />
        <DataTable
          icon={<></>}
          title=""
          showTabs
          tabs={[
            { icon: <Star className="h-4 w-4" />, value: "popular" },
            { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
            { icon: <TrendingDown className="h-4 w-4" />, value: "decaying" },
          ]}
          activeTab={topPagesFilter}
          onTabChange={(value) => handleTopPagesFilterChange(value as TableFilterType)}
          columns={[
            { key: "key", label: "Top Pages", width: "w-[200px]" },
            { key: "impressions", label: "Impressions", sortable: true },
            { key: "clicks", label: "Clicks", sortable: true },
          ]}
          data={topPagesData.map((item) => ({
            key: item.key,
            impressions: item.impressions,
            clicks: item.clicks,
          }))}
          isLoading={isLoading}
          hasData={hasTopPagesData}
          sortConfig={topPagesSort}
          onSort={(column) => handleTopPagesSort(column as "impressions" | "clicks")}
          onArrowClick={() => setTopPagesModalOpen(true)}
          maxRows={5}
        />
      </div>

      {/* Tables Row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <DataTable
          icon={<Eye className="h-4 w-4" />}
          title="Searches to discover you"
          showTabs
          tabs={[
            { icon: <Star className="h-4 w-4" />, value: "popular" },
            { icon: <TrendingUp className="h-4 w-4" />, value: "growing" },
            { icon: <TrendingDown className="h-4 w-4" />, value: "decaying" },
          ]}
          activeTab={topQueriesFilter}
          onTabChange={(value) => handleTopQueriesFilterChange(value as TableFilterType)}
          columns={[
            { key: "key", label: "Top Queries", width: "w-[200px]" },
            { key: "impressions", label: "Impressions", sortable: true },
            { key: "clicks", label: "Clicks", sortable: true },
          ]}
          data={topQueriesData.map((item) => ({
            key: item.key,
            impressions: item.impressions,
            clicks: item.clicks,
          }))}
          isLoading={isLoading}
          hasData={hasTopQueriesData}
          sortConfig={topQueriesSort}
          onSort={(column) => handleTopQueriesSort(column as "impressions" | "clicks")}
          onArrowClick={() => setTopQueriesModalOpen(true)}
          maxRows={5}
        />
        <PositionDistributionCard
          positions={positionLegendItems}
          chartData={positionChartData}
          visibleLines={positionVisibleLines}
          onToggle={handlePositionLegendToggle}
          isLoading={isLoadingPositions}
          hasData={hasPositionData}
        />
      </div>

      {/* Modals */}
      <DataTableModal
        open={contentGroupsModalOpen}
        onOpenChange={setContentGroupsModalOpen}
        title="Content people are seeing"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          { icon: <Star className="h-4 w-4" />, value: "popular", label: "Popular" },
          { icon: <TrendingUp className="h-4 w-4" />, value: "growing", label: "Growing" },
          { icon: <TrendingDown className="h-4 w-4" />, value: "decaying", label: "Decaying" },
        ]}
        activeTab={contentGroupsFilter}
        onTabChange={(value) => handleContentGroupsFilterChange(value as TableFilterType)}
        columns={[
          { key: "key", label: "Content Groups" },
          { key: "impressions", label: "Impressions", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={contentGroupsData.map((item) => ({
          key: item.key,
          impressions: item.impressions,
          clicks: item.clicks,
        }))}
        sortConfig={contentGroupsSort}
        onSort={(column) => handleContentGroupsSort(column as "impressions" | "clicks")}
        isLoading={isLoading}
      />

      <DataTableModal
        open={topPagesModalOpen}
        onOpenChange={setTopPagesModalOpen}
        title="Top Pages"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          { icon: <Star className="h-4 w-4" />, value: "popular", label: "Popular" },
          { icon: <TrendingUp className="h-4 w-4" />, value: "growing", label: "Growing" },
          { icon: <TrendingDown className="h-4 w-4" />, value: "decaying", label: "Decaying" },
        ]}
        activeTab={topPagesFilter}
        onTabChange={(value) => handleTopPagesFilterChange(value as TableFilterType)}
        columns={[
          { key: "key", label: "Page" },
          { key: "impressions", label: "Impressions", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={topPagesData.map((item) => ({
          key: item.key,
          impressions: item.impressions,
          clicks: item.clicks,
        }))}
        sortConfig={topPagesSort}
        onSort={(column) => handleTopPagesSort(column as "impressions" | "clicks")}
        isLoading={isLoading}
      />

      <DataTableModal
        open={topQueriesModalOpen}
        onOpenChange={setTopQueriesModalOpen}
        title="Searches to discover you"
        icon={<Eye className="h-4 w-4" />}
        tabs={[
          { icon: <Star className="h-4 w-4" />, value: "popular", label: "Popular" },
          { icon: <TrendingUp className="h-4 w-4" />, value: "growing", label: "Growing" },
          { icon: <TrendingDown className="h-4 w-4" />, value: "decaying", label: "Decaying" },
        ]}
        activeTab={topQueriesFilter}
        onTabChange={(value) => handleTopQueriesFilterChange(value as TableFilterType)}
        columns={[
          { key: "key", label: "Query" },
          { key: "impressions", label: "Impressions", sortable: true },
          { key: "clicks", label: "Clicks", sortable: true },
        ]}
        data={topQueriesData.map((item) => ({
          key: item.key,
          impressions: item.impressions,
          clicks: item.clicks,
        }))}
        sortConfig={topQueriesSort}
        onSort={(column) => handleTopQueriesSort(column as "impressions" | "clicks")}
        isLoading={isLoading}
      />
    </div>
  )
}
