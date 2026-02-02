"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Eye, MousePointerClick } from "lucide-react";
import { useGscChartData, formatNumber, type TimePeriodValue } from "@/hooks/use-gsc-chart-data";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ChartLegend } from "@/components/molecules/analytics/ChartLegend";
import { ChartSectionSkeleton } from "./skeletons";
import { type DeepdiveFilter } from "@/hooks/use-organic-deepdive-filters";

interface OrganicChartSectionProps {
  businessUniqueId: string | null;
  website: string | null;
  period: TimePeriodValue;
  filters?: DeepdiveFilter[];
}

export function OrganicChartSection({
  businessUniqueId,
  website,
  period,
  filters = [],
}: OrganicChartSectionProps) {
  const {
    normalizedChartData,
    impressionsMetric,
    clicksMetric,
    isLoading,
  } = useGscChartData(businessUniqueId, website, period, filters);

  const [visibleLines, setVisibleLines] = useState({
    impressions: true,
    clicks: true,
  });

  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCenter, setZoomCenter] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const chartConfig = {
    impressions: { label: "Impressions", color: "#6b7280" },
    clicks: { label: "Clicks", color: "#2563eb" },
  };

  const handleLegendToggle = useCallback((key: string, checked: boolean) => {
    setVisibleLines((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length;
      if (!checked && checkedCount <= 1) {
        return prev;
      }
      return { ...prev, [key]: checked };
    });
  }, []);

  const chartLegendItems = useMemo(() => {
    const iconConfig: Record<string, { icon: React.ReactNode; color: string }> = {
      impressions: { icon: <Eye className="h-6 w-6" />, color: "#6b7280" },
      clicks: {
        icon: <MousePointerClick className="h-6 w-6 rotate-90" />,
        color: "#2563eb",
      },
    };

    return [
      {
        key: "impressions",
        icon: iconConfig.impressions.icon,
        value: formatNumber(impressionsMetric.total),
        change: impressionsMetric.trend.isInfinity
          ? Infinity
          : impressionsMetric.trend.trend === 'up'
            ? impressionsMetric.trend.value
            : -impressionsMetric.trend.value,
        color: iconConfig.impressions.color,
        checked: visibleLines.impressions,
      },
      {
        key: "clicks",
        icon: iconConfig.clicks.icon,
        value: formatNumber(clicksMetric.total),
        change: clicksMetric.trend.isInfinity
          ? Infinity
          : clicksMetric.trend.trend === 'up'
            ? clicksMetric.trend.value
            : -clicksMetric.trend.value,
        color: iconConfig.clicks.color,
        checked: visibleLines.clicks,
      },
    ];
  }, [impressionsMetric, clicksMetric, visibleLines, formatNumber]);

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

  if (isLoading) {
    return <ChartSectionSkeleton />;
  }

  return (
    <div className="grid grid-cols-1">
      <div className="flex flex-col gap-4 rounded-lg border border-general-border bg-white p-2">
        <div className="flex items-center justify-between">
          <ChartLegend items={chartLegendItems} onToggle={handleLegendToggle} />
        </div>

        <div
          ref={chartContainerRef}
          className="h-[250px] cursor-grab active:cursor-grabbing"
          onDoubleClick={handleChartDoubleClick}
        >
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={zoomedChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillImpressions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6b7280" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6b7280" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#737373", fontFamily: "Geist" }}
                  dy={8}
                  interval={
                    zoomedChartData.length <= 7
                      ? 0
                      : zoomedChartData.length <= 14
                        ? 1
                        : zoomedChartData.length <= 30
                          ? Math.floor(zoomedChartData.length / 8)
                          : zoomedChartData.length <= 90
                            ? Math.floor(zoomedChartData.length / 10)
                            : Math.floor(zoomedChartData.length / 12)
                  }
                />
                <YAxis hide domain={[0, 100]} />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-background border border-border rounded-lg p-2 shadow-md">
                        <p className="text-sm font-medium mb-1">{label}</p>
                        <div className="space-y-1 text-xs">
                          {visibleLines.impressions && (
                            <p className="text-gray-600">
                              Impr.: {data?.impressions?.toLocaleString()}
                            </p>
                          )}
                          {visibleLines.clicks && (
                            <p className="text-blue-600">
                              Clicks: {data?.clicks?.toLocaleString()}
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
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
