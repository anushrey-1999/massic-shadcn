"use client";

import { ReactNode, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { StatsBadge } from "./StatsBadge";

interface LegendItem {
  color: string;
  label: string;
  value: string | number;
  change: number;
}

interface InteractionsChartCardProps {
  icon: ReactNode;
  title: string;
  legend: LegendItem;
  data: Record<string, any>[];
  dataKey: string;
  strokeColor?: string;
  chartHeight?: number;
}

export function InteractionsChartCard({
  icon,
  title,
  legend,
  data,
  dataKey,
  strokeColor = "#3b82f6",
  chartHeight = 200,
}: InteractionsChartCardProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCenter, setZoomCenter] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const zoomedData = useMemo(() => {
    if (zoomLevel <= 1 || zoomCenter === null || data.length === 0) return data;
    const totalPoints = data.length;
    const visiblePoints = Math.max(2, Math.floor(totalPoints / zoomLevel));
    const halfVisible = Math.floor(visiblePoints / 2);
    let startIndex = Math.max(0, zoomCenter - halfVisible);
    let endIndex = Math.min(totalPoints - 1, zoomCenter + halfVisible);
    return data.slice(startIndex, endIndex + 1);
  }, [data, zoomLevel, zoomCenter]);

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const relativeX = x / rect.width;
      const dataIndex = Math.floor(relativeX * data.length);
      setZoomCenter(Math.max(0, Math.min(data.length - 1, dataIndex)));
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoomLevel((prev) => Math.max(1, Math.min(prev * zoomFactor, data.length / 2)));
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [data.length]);

  const handleDoubleClick = useCallback(() => {
    setZoomLevel(1);
    setZoomCenter(null);
  }, []);

  const chartConfig = {
    [dataKey]: { label: legend.label, color: strokeColor },
  };

  return (
    <div className="bg-white rounded-lg border border-general-border flex flex-col min-h-0 h-full">
      <div className="text-base text-general-secondary-foreground border-b border-general-border-four w-full p-2 font-medium flex-none">
        {title}
      </div>

      <div className="px-2 pt-2 flex flex-col gap-2 flex-none">
        <div className="flex items-center gap-4">
          <div className="bg-foreground-light rounded-lg p-2 flex flex-col gap-1">
            <span className="text-sm text-general-muted-foreground font-medium">
              {legend.label}
            </span>
            <div className="flex items-center gap-2 justify-between">
              <span className="text-base font-medium">{legend.value}</span>
              <StatsBadge value={legend.change} variant="plain" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0" />
      <div
        ref={chartRef}
        className="cursor-grab active:cursor-grabbing px-2 pt-2 flex-none"
        style={{ height: chartHeight }}
        onDoubleClick={handleDoubleClick}
      >
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={zoomedData}
              margin={{ top: 0, right: 10, left: 20, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`fill${dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
                  <stop
                    offset="100%"
                    stopColor={strokeColor}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                interval={zoomedData.length <= 7 ? 0 : zoomedData.length <= 14 ? 1 : zoomedData.length <= 30 ? Math.floor(zoomedData.length / 8) : zoomedData.length <= 90 ? Math.floor(zoomedData.length / 10) : Math.floor(zoomedData.length / 12)}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="linear"
                dataKey={dataKey}
                stroke={strokeColor}
                fill={`url(#fill${dataKey})`}
                strokeWidth={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}
