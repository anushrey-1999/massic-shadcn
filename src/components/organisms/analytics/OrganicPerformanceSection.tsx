"use client";

import {
  Eye,
  MousePointerClick,
  Target,
  Star,
  TrendingUp,
  TrendingDown,
  Loader2,
  CircleCheckBig,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/molecules/analytics/MetricCard";
import { AlertBar } from "@/components/molecules/analytics/AlertBar";
import { AnomaliesSheet } from "@/components/molecules/analytics/AnomaliesSheet";
import { FunnelChart } from "@/components/molecules/analytics/FunnelChart";
import { ChartLegend } from "@/components/molecules/analytics/ChartLegend";
import { BrandedKeywordsModal } from "@/components/molecules/analytics/BrandedKeywordsModal";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  useGSCAnalytics,
  type TimePeriodValue,
  type TableFilterType,
} from "@/hooks/use-gsc-analytics";
import { useGapAnalysis } from "@/hooks/use-gap-analysis";
import { useBrandedNonBranded } from "@/hooks/use-branded-nonbranded";
import { useGoalAnalysis } from "@/hooks/use-goal-analysis";
import { useTrafficAnalysis } from "@/hooks/use-traffic-analysis";
import { useBusinessStore } from "@/store/business-store";
import { usePathname } from "next/navigation";
import { useMemo, useState, useCallback } from "react";

const METRIC_ICONS: Record<string, React.ReactNode> = {
  "topic-coverage": <Target className="h-5 w-5" />,
  "visibility-relevance": <Eye className="h-5 w-5" />,
  "engagement-relevance": <MousePointerClick className="h-5 w-5" />,
  branded: <Star className="h-5 w-5" />,
  "non-branded": <TrendingUp className="h-5 w-5" />,
};

export interface OrganicPerformanceSectionProps {
  period?: TimePeriodValue;
  visibleLines?: Record<string, boolean>;
  onLegendToggle?: (key: string, checked: boolean) => void;
}

export function OrganicPerformanceSection({
  period = "3 months",
  visibleLines: visibleLinesProp,
  onLegendToggle: onLegendToggleProp,
}: OrganicPerformanceSectionProps) {
  const pathname = usePathname();
  const profiles = useBusinessStore((state) => state.profiles);

  const { businessUniqueId, website, businessName } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/);
    if (!match)
      return { businessUniqueId: null, website: null, businessName: "" };

    const id = match[1];
    const profile = profiles.find((p) => p.UniqueId === id);
    return {
      businessUniqueId: id,
      website: profile?.Website || null,
      businessName: profile?.Name || profile?.DisplayName || "",
    };
  }, [pathname, profiles]);

  const {
    chartData,
    normalizedChartData,
    chartConfig,
    chartLegendItems,
    funnelChartItems,
    isLoading,
    hasData,
    hasFunnelData,
  } = useGSCAnalytics(businessUniqueId, website, period);

  const {
    metricCards,
    isLoading: isLoadingMetrics,
    hasData: hasMetricsData,
    status: metricsStatus,
    statusMessage: metricsStatusMessage,
  } = useGapAnalysis(businessUniqueId);

  const {
    brandedCard,
    nonBrandedCard,
    status: brandedStatus,
    statusMessage: brandedStatusMessage,
    isLoading: isLoadingBranded,
  } = useBrandedNonBranded(businessUniqueId, website, period);

  const {
    goalData,
    criticalCount,
    warningCount,
    positiveCount,
    isLoading: isLoadingGoals,
    error: goalError,
  } = useGoalAnalysis(businessUniqueId, businessName, null);

  const {
    trafficData,
    isLoading: isLoadingTraffic,
    error: trafficError,
  } = useTrafficAnalysis(businessUniqueId, businessName, null);

  const [anomaliesSheetOpen, setAnomaliesSheetOpen] = useState(false);
  const [brandedKeywordsModalOpen, setBrandedKeywordsModalOpen] = useState(false);

  const [visibleLinesLocal, setVisibleLinesLocal] = useState<
    Record<string, boolean>
  >({
    impressions: true,
    clicks: true,
    goals: true,
  });

  const visibleLines =
    visibleLinesProp !== undefined ? visibleLinesProp : visibleLinesLocal;

  const visibleCount = [visibleLines.impressions, visibleLines.clicks, visibleLines.goals].filter(Boolean).length;
  const singleMetricMode = visibleCount === 1;
  const useNormalizedKeys = normalizedChartData.length > 0 && !singleMetricMode;
  const chartDataToRender = useNormalizedKeys ? normalizedChartData : chartData;

  const singleMetricYDomain = useMemo(() => {
    if (!singleMetricMode || chartData.length === 0) return undefined;
    const key = visibleLines.impressions ? "impressions" : visibleLines.clicks ? "clicks" : "goals";
    const values = chartData.map((d) => Number(d[key as keyof typeof d]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.05 || 1;
    return [Math.max(0, min - pad), max + pad] as [number, number];
  }, [singleMetricMode, chartData, visibleLines.impressions, visibleLines.clicks, visibleLines.goals]);

  const handleLegendToggle = useCallback(
    (key: string, checked: boolean) => {
      if (onLegendToggleProp) {
        onLegendToggleProp(key, checked);
        return;
      }
      setVisibleLinesLocal((prev) => {
        const checkedCount = Object.values(prev).filter(Boolean).length;
        if (!checked && checkedCount <= 1) return prev;
        return { ...prev, [key]: checked };
      });
    },
    [onLegendToggleProp]
  );

  const [graphFullScreen, setGraphFullScreen] = useState(false);

  const xAxisTicks12Months = useMemo(() => {
    if (period !== "12 months" || chartData.length === 0)
      return undefined;
    const ticks: string[] = [];
    let lastMonth = "";
    for (const d of chartData) {
      const month = d.date.split(" ")[0];
      if (month !== lastMonth) {
        lastMonth = month;
        ticks.push(d.date);
      }
    }
    return ticks.length > 0 ? ticks : undefined;
  }, [period, chartData]);

  const funnelKeyToIndex: Record<string, number> = useMemo(
    () => ({ impressions: 0, clicks: 1, goals: 2 }),
    []
  );

  const chartLegendWithIcons = useMemo(() => {
    const iconConfig: Record<string, { icon: React.ReactNode; color: string }> =
    {
      impressions: { icon: <Eye className="h-6 w-6" />, color: "#6b7280" },
      clicks: {
        icon: <MousePointerClick className="h-6 w-6 rotate-90" />,
        color: "#2563eb",
      },
      goals: { icon: <Target className="h-6 w-6" />, color: "#059669" },
    };
    return chartLegendItems.map((item) => {
      const stageIndex = funnelKeyToIndex[item.key];
      const funnelPct =
        graphFullScreen &&
        hasFunnelData &&
        funnelChartItems[stageIndex]?.percentage
          ? funnelChartItems[stageIndex].percentage
          : undefined;
      return {
        ...item,
        icon: iconConfig[item.key]?.icon || <Eye className="h-4 w-4" />,
        color: iconConfig[item.key]?.color,
        checked: visibleLines[item.key] ?? true,
        ...(funnelPct !== undefined && funnelPct !== "" ? { funnelPercentage: funnelPct } : {}),
      };
    });
  }, [chartLegendItems, visibleLines, graphFullScreen, hasFunnelData, funnelChartItems, funnelKeyToIndex]);

  // Calculate total counts from both Goals and Traffic APIs
  const trafficCriticalCount = trafficData && trafficData.severity === "high" ? 1 : 0;
  const trafficPositiveCount = trafficData && trafficData.direction === "up" ? 1 : 0;
  
  const totalCriticalCount = criticalCount + trafficCriticalCount;
  const totalPositiveCount = positiveCount + trafficPositiveCount;
  const totalAnomaliesCount = totalCriticalCount + totalPositiveCount;
  
  const hasAnomalies = totalAnomaliesCount > 0;

  return (
    <div className="flex flex-col gap-3">

      {/* Alert Bar */}
      <AlertBar
        title={hasAnomalies ? "Anomalies Detected" : ""}
        icon={
          hasAnomalies ? (
            <AlertTriangle
              className="h-5 w-5"
              color="#F59E0B"
            />
          ) : (
            <CircleCheckBig
              className="h-5 w-5"
              color="#16A34A"
            />
          )
        }
        badges={
          hasAnomalies
            ? [
                {
                  count: totalAnomaliesCount,
                  type: "critical" as const,
                  label: `${totalAnomaliesCount}`,
                },
              ]
            : []
        }
        isLoading={isLoadingGoals || isLoadingTraffic}
        error={goalError || trafficError}
        noAlertsMessage={`No recent anomalies detected as of ${new Date().toLocaleDateString()}`}
        onClick={() => setAnomaliesSheetOpen(true)}
        variant="secondary"
      />

      {/* Anomalies Sheet */}
      <AnomaliesSheet
        open={anomaliesSheetOpen}
        onOpenChange={setAnomaliesSheetOpen}
        defaultGoalData={goalData}
        defaultCriticalCount={criticalCount}
        defaultWarningCount={warningCount}
        defaultPositiveCount={positiveCount}
        defaultIsLoadingGoals={isLoadingGoals}
        defaultTrafficData={trafficData}
        defaultIsLoadingTraffic={isLoadingTraffic}
        businessId={businessUniqueId}
        businessName={businessName}
      />

      <div className="flex flex-col gap-3">
        {/* Metric Cards */}
        <div className="grid grid-cols-5 bg-white p-2 rounded-lg border border-general-border">
          {/* Gap analysis cards (3 columns) */}
          {metricCards.length > 0 ? (
            metricCards.map((card) => (
              <MetricCard
                key={card.key}
                icon={METRIC_ICONS[card.key] || <Target className="h-5 w-5" />}
                label={card.title}
                value={card.percentage}
                change={card.change}
                sparklineData={card.sparklineData}
                isLoading={isLoadingMetrics}
              />
            ))
          ) : metricsStatus === "loading" ? (
            <>
              {[1, 2, 3].map((i) => (
                <MetricCard key={`gap-loading-${i}`} isLoading={true} />
              ))}
            </>
          ) : (
            <>
              {/* Show empty state for each metric card with heading and -- */}
              {[
                "topic-coverage",
                "visibility-relevance",
                "engagement-relevance",
              ].map((key) => (
                <MetricCard
                  key={key}
                  icon={METRIC_ICONS[key] || <Target className="h-5 w-5" />}
                  label={
                    key === "topic-coverage"
                      ? "Topic Coverage"
                      : key === "visibility-relevance"
                      ? "Visibility Rel"
                      : key === "engagement-relevance"
                      ? "Engagement Rel"
                      : "--"
                  }
                  value={"--"}
                  change={undefined}
                  sparklineData={undefined}
                  isLoading={false}
                  emptyMessage={
                    key === "topic-coverage"
                      ? "Add more topics to your business profile to see this metric."
                      : key === "visibility-relevance"
                      ? "Improve your website's SEO to see this metric."
                      : key === "engagement-relevance"
                      ? "Increase user engagement to see this metric."
                      : "No data available."
                  }
                />
              ))}
            </>
          )}

          {/* Branded / Non-branded cards (2 columns) */}
          {brandedStatus === "success" ? (
            <>
              <MetricCard
                key={brandedCard.key}
                icon={METRIC_ICONS[brandedCard.key] || <Star className="h-5 w-5" />}
                label={brandedCard.title}
                value={brandedCard.percentage}
                change={brandedCard.change}
                sparklineData={brandedCard.sparklineData}
                isLoading={isLoadingBranded}
                showArrowButton={true}
                onArrowClick={() => setBrandedKeywordsModalOpen(true)}
              />
              <MetricCard
                key={nonBrandedCard.key}
                icon={
                  METRIC_ICONS[nonBrandedCard.key] || <TrendingUp className="h-5 w-5" />
                }
                label={nonBrandedCard.title}
                value={nonBrandedCard.percentage}
                change={nonBrandedCard.change}
                sparklineData={nonBrandedCard.sparklineData}
                isLoading={isLoadingBranded}
              />
            </>
          ) : brandedStatus === "loading" ? (
            <>
              <MetricCard key="branded-loading" isLoading={true} />
              <MetricCard key="nonbranded-loading" isLoading={true} />
            </>
          ) : (
            <>
              {/* Show empty state for branded/non-branded cards with heading and -- */}
              {[
                "branded",
                "non-branded",
              ].map((key) => (
                <MetricCard
                  key={key}
                  icon={METRIC_ICONS[key] || <Star className="h-5 w-5" />}
                  label={key === "branded" ? "Branded" : "Non-Branded"}
                  value={"--"}
                  change={undefined}
                  sparklineData={undefined}
                  isLoading={false}
                  emptyMessage={
                    key === "branded"
                      ? "Ensure your brand keywords are tracked to see this metric."
                      : "Add more non-branded keywords to see this metric."
                  }
                  disableTooltip={key === "non-branded"}
                  showArrowButton={key === "branded"}
                  onArrowClick={key === "branded" ? () => setBrandedKeywordsModalOpen(true) : undefined}
                />
              ))}
            </>
          )}
        </div>

        {/* Area Chart with Funnel - card height matches funnel; toggle keeps same height */}
        <div className="relative rounded-lg overflow-hidden bg-white border border-general-border min-h-[320px]">
          <div
            className={
              graphFullScreen
                ? "grid grid-cols-1 min-h-[242px]"
                : "grid grid-cols-[minmax(0,1fr)_400px] min-h-[320px]"
            }
          >
            <div
              className={
                graphFullScreen
                  ? "p-3 pr-8 flex flex-col min-h-full"
                  : "p-3 pr-8 border-r border-general-border flex flex-col min-h-full"
              }
            >
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center min-h-[240px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : hasData ? (
              <>
                <ChartLegend
                  variant="box"
                  className="mb-3 shrink-0"
                  items={chartLegendWithIcons}
                  onToggle={handleLegendToggle}
                  showToggle={false}
                />
                <div
                  className={
                    graphFullScreen
                      ? "min-h-[242px] flex-1"
                      : "h-[242px]"
                  }
                >
                  <ChartContainer
                    config={chartConfig}
                    className="h-full w-full flex-col justify-end items-stretch aspect-auto"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartDataToRender}
                        margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="fillImpressions"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#6b7280"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#6b7280"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                          <linearGradient
                            id="fillClicks"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#2563eb"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#2563eb"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                          <linearGradient
                            id="fillGoals"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#059669"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#059669"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          tickMargin={8}
                          ticks={xAxisTicks12Months}
                          interval={
                            xAxisTicks12Months
                              ? 0
                              : chartData.length <= 7
                                ? 0
                                : chartData.length <= 14
                                  ? 1
                                  : chartData.length <= 30
                                    ? Math.floor(chartData.length / 8)
                                    : chartData.length <= 90
                                      ? Math.floor(chartData.length / 10)
                                      : Math.floor(chartData.length / 12)
                          }
                        />
                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          hide
                          width={0}
                          domain={useNormalizedKeys ? [0, 100] : singleMetricYDomain}
                          {...(useNormalizedKeys ? {} : !singleMetricMode ? {
                            domain: ([dataMin, dataMax]: [number, number]) => {
                              const pad = (dataMax - dataMin) * 0.05 || 1;
                              const min = dataMin <= 0 ? 0 : Math.max(0, dataMin - pad);
                              return [min, dataMax + pad];
                            },
                          } : {})}
                        />
                        {!useNormalizedKeys && !singleMetricMode && (
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            hide
                            width={0}
                            domain={([dataMin, dataMax]: [number, number]) => {
                              const pad = (dataMax - dataMin) * 0.05 || 1;
                              const min = dataMin <= 0 ? 0 : Math.max(0, dataMin - pad);
                              return [min, dataMax + pad];
                            }}
                          />
                        )}
                        <ChartTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0]?.payload;
                            return (
                              <div className="bg-background border border-border rounded-lg p-2 shadow-md">
                                <p className="text-sm font-medium mb-1">
                                  {label}
                                </p>
                                <div className="space-y-1 text-xs">
                                  {visibleLines.impressions && (
                                    <p className="text-gray-500">
                                      Impr.:{" "}
                                      {data?.impressions?.toLocaleString()}
                                    </p>
                                  )}
                                  {visibleLines.clicks && (
                                    <p className="text-blue-600">
                                      Clicks: {data?.clicks?.toLocaleString()}
                                    </p>
                                  )}
                                  {visibleLines.goals &&
                                    data?.goals !== undefined && (
                                      <p className="text-emerald-600">
                                        Goals: {data?.goals?.toLocaleString()}
                                      </p>
                                    )}
                                </div>
                              </div>
                            );
                          }}
                        />
                        {visibleLines.impressions && (
                          <Area
                            type="monotone"
                            dataKey={useNormalizedKeys ? "impressionsNorm" : "impressions"}
                            yAxisId={useNormalizedKeys || singleMetricMode ? "left" : "right"}
                            stroke="#6b7280"
                            fill="url(#fillImpressions)"
                            strokeWidth={1}
                            name="Impressions"
                          />
                        )}
                        {visibleLines.clicks && (
                          <Area
                            type="monotone"
                            dataKey={useNormalizedKeys ? "clicksNorm" : "clicks"}
                            yAxisId="left"
                            stroke="#2563eb"
                            fill="url(#fillClicks)"
                            strokeWidth={1}
                            name="Clicks"
                          />
                        )}
                        {visibleLines.goals && (
                          <Area
                            type="monotone"
                            dataKey={useNormalizedKeys ? "goalsNorm" : "goals"}
                            yAxisId="left"
                            stroke="#059669"
                            fill="url(#fillGoals)"
                            strokeWidth={1}
                            name="Goals"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center min-h-[240px] text-muted-foreground">
                No GSC data available. Please connect Google Search Console.
              </div>
            )}
            </div>

            {!graphFullScreen && (
              <div className="h-full px-7 py-3 flex items-center justify-center min-h-0">
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
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-white h-8 w-8"
            onClick={() => setGraphFullScreen(!graphFullScreen)}
          >
            {graphFullScreen ? (
              <Minimize2 className="h-2 w-2" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      <BrandedKeywordsModal
        open={brandedKeywordsModalOpen}
        onOpenChange={setBrandedKeywordsModalOpen}
        businessId={businessUniqueId}
      />
    </div>
  );
}
