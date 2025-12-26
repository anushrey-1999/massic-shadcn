"use client";

import {
  Eye,
  MousePointerClick,
  Target,
  Star,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { MetricCard } from "@/components/molecules/analytics/MetricCard";
import { AlertBar } from "@/components/molecules/analytics/AlertBar";
import { GoalAnalysisSheet } from "@/components/molecules/analytics/GoalAnalysisSheet";
import { TrafficAnalysisSheet } from "@/components/molecules/analytics/TrafficAnalysisSheet";
import { FunnelChart } from "@/components/molecules/analytics/FunnelChart";
import { ChartLegend } from "@/components/molecules/analytics/ChartLegend";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
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
import { useGoalAnalysis } from "@/hooks/use-goal-analysis";
import { useTrafficAnalysis } from "@/hooks/use-traffic-analysis";
import { useBusinessStore } from "@/store/business-store";
import { usePathname } from "next/navigation";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";

const METRIC_ICONS: Record<string, React.ReactNode> = {
  "topic-coverage": <Target className="h-5 w-5" />,
  "visibility-relevance": <Eye className="h-5 w-5" />,
  "engagement-relevance": <MousePointerClick className="h-5 w-5" />,
};

interface OrganicPerformanceSectionProps {
  period?: TimePeriodValue;
}

export function OrganicPerformanceSection({
  period = "3 months",
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

  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [trafficSheetOpen, setTrafficSheetOpen] = useState(false);

  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    impressions: true,
    clicks: true,
    goals: true,
  });

  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCenter, setZoomCenter] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const handleLegendToggle = useCallback((key: string, checked: boolean) => {
    setVisibleLines((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length;
      if (!checked && checkedCount <= 1) {
        return prev;
      }
      return { ...prev, [key]: checked };
    });
  }, []);

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
    return chartLegendItems.map((item) => ({
      ...item,
      icon: iconConfig[item.key]?.icon || <Eye className="h-4 w-4" />,
      color: iconConfig[item.key]?.color,
      checked: visibleLines[item.key] ?? true,
    }));
  }, [chartLegendItems, visibleLines]);

  const zoomedChartData = useMemo(() => {
    if (zoomLevel <= 1 || zoomCenter === null || normalizedChartData.length === 0) {
      return normalizedChartData;
    }
    const totalPoints = normalizedChartData.length;
    const visiblePoints = Math.max(2, Math.floor(totalPoints / zoomLevel));
    const halfVisible = Math.floor(visiblePoints / 2);
    let startIndex = Math.max(0, zoomCenter - halfVisible);
    let endIndex = Math.min(totalPoints - 1, zoomCenter + halfVisible);
    if (endIndex - startIndex + 1 < 2) {
      if (startIndex === 0) endIndex = Math.min(totalPoints - 1, 1);
      else startIndex = Math.max(0, totalPoints - 2);
    }
    return normalizedChartData.slice(startIndex, endIndex + 1);
  }, [normalizedChartData, zoomLevel, zoomCenter]);

  useEffect(() => {
    const element = chartContainerRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const chartWidth = rect.width - 20;
      const relativeX = x / chartWidth;
      const dataIndex = Math.floor(relativeX * normalizedChartData.length);
      const centerIndex = Math.max(0, Math.min(normalizedChartData.length - 1, dataIndex));
      setZoomCenter(centerIndex);
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoomLevel((prev) => {
        const newZoom = prev * zoomFactor;
        const maxZoom = normalizedChartData.length / 2;
        return Math.max(1, Math.min(newZoom, maxZoom));
      });
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [normalizedChartData.length]);

  const handleChartDoubleClick = useCallback(() => {
    setZoomLevel(1);
    setZoomCenter(null);
  }, []);


  return (
    <div className="flex flex-col gap-6">

      {/* Alert Bars */}
      <div className="flex gap-6">
        <AlertBar
          title="Goal Alerts"
          icon={<Target className="h-5 w-5" color="#F59E0B" />}
          badges={[
            { count: criticalCount, type: "critical" },
            { count: warningCount, type: "warning" },
            { count: positiveCount, type: "positive" },
          ]}
          isLoading={isLoadingGoals}
          error={goalError}
          noAlertsMessage={`No recent anomalies detected as of ${new Date().toLocaleDateString()}`}
          onClick={() => setGoalSheetOpen(true)}
        />

        <AlertBar
          title="Traffic Alerts"
          icon={<MousePointerClick className="h-5 w-5" color="#F59E0B" />}
          badges={
            trafficData
              ? [
                {
                  count: 1,
                  type:
                    trafficData.direction === "up"
                      ? "positive"
                      : trafficData.severity === "high"
                        ? "critical"
                        : "warning",
                  label:
                    trafficData.direction === "down"
                      ? `${Math.abs(trafficData.delta_pct * 100).toFixed(
                        0
                      )}% Drop`
                      : `${Math.abs(trafficData.delta_pct * 100).toFixed(
                        0
                      )}% Increase`,
                },
              ]
              : []
          }
          isLoading={isLoadingTraffic}
          error={trafficError}
          noAlertsMessage={`No recent anomalies detected as of ${new Date().toLocaleDateString()}`}
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

      <div className="flex flex-col gap-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-3 bg-white p-2 rounded-lg border border-general-border">
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
                <MetricCard key={i} isLoading={true} />
              ))}
            </>
          ) : (
            <MetricCard
              className="col-span-3"
              emptyMessage={metricsStatusMessage || "No performance data available"}
            />
          )}
        </div>

        {/* Area Chart with Funnel */}
        <div className="grid grid-cols-[minmax(0,1fr)_300px] rounded-lg overflow-hidden bg-white border border-general-border">
          <div className="p-3 pr-8 border-r border-general-border">
            {isLoading ? (
              <div className="flex items-center justify-center h-[218px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : hasData ? (
              <>
                <ChartLegend
                  className="mb-4"
                  items={chartLegendWithIcons}
                  onToggle={handleLegendToggle}
                />
                <div
                  className="h-[218px] cursor-grab active:cursor-grabbing"
                  ref={chartContainerRef}
                  onDoubleClick={handleChartDoubleClick}
                >
                  <ChartContainer
                    config={chartConfig}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={zoomedChartData}
                        margin={{ top: 0, right: 0, left: 20, bottom: 0 }}
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
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          tickMargin={8}
                          interval={zoomedChartData.length <= 7 ? 0 : zoomedChartData.length <= 14 ? 1 : zoomedChartData.length <= 30 ? Math.floor(zoomedChartData.length / 8) : zoomedChartData.length <= 90 ? Math.floor(zoomedChartData.length / 10) : Math.floor(zoomedChartData.length / 12)}
                        />
                        <YAxis
                          hide
                          allowDataOverflow
                          domain={["dataMin", "dataMax"]}
                          padding={{ top: 0, bottom: 0 }}
                        />
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
                                      Impressions:{" "}
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
                            type="linear"
                            dataKey="impressionsNorm"
                            stroke="#6b7280"
                            fill="url(#fillImpressions)"
                            strokeWidth={1}
                            name="Impressions"
                          />
                        )}
                        {visibleLines.clicks && (
                          <Area
                            type="linear"
                            dataKey="clicksNorm"
                            stroke="#2563eb"
                            fill="url(#fillClicks)"
                            strokeWidth={1}
                            name="Clicks"
                          />
                        )}
                        {visibleLines.goals && (
                          <Area
                            type="linear"
                            dataKey="goalsNorm"
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
              <div className="flex items-center justify-center h-[290px] text-muted-foreground">
                No GSC data available. Please connect Google Search Console.
              </div>
            )}
          </div>

          <div className="bg-p-3">
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
      </div>
    </div>
  );
}
