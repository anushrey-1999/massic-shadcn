"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { Eye, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"

interface PositionItem {
  key: string
  label: string
  value: number
  change: number
  checked?: boolean
}

interface ChartDataPoint {
  date: string
  pos1_3: number
  pos4_10: number
  pos11_20: number
  pos20_plus: number
  pos1_3Norm?: number
  pos4_10Norm?: number
  pos11_20Norm?: number
  pos20_plusNorm?: number
}

interface PositionDistributionCardProps {
  title?: string
  positions: PositionItem[]
  chartData: ChartDataPoint[]
  visibleLines?: Record<string, boolean>
  onToggle?: (key: string, checked: boolean) => void
  isLoading?: boolean
  hasData?: boolean
}

export function PositionDistributionCard({
  title = "How you rank",
  positions,
  chartData,
  visibleLines = { pos1_3: true, pos4_10: true, pos11_20: true, pos20_plus: true },
  onToggle,
  isLoading = false,
  hasData = true,
}: PositionDistributionCardProps) {
  const chartConfig = {
    pos1_3: { label: "Pos 1-3", color: "#2563EB" },
    pos4_10: { label: "Pos 4-10", color: "#2563EB" },
    pos11_20: { label: "Pos 11-20", color: "#2563EB" },
    pos20_plus: { label: "Pos 20+", color: "#2563EB" },
  }

  const opacityMap: Record<string, number> = {
    pos1_3: 1,
    pos4_10: 0.7,
    pos11_20: 0.5,
    pos20_plus: 0.3,
  }

  const [zoomLevel, setZoomLevel] = useState(1)
  const [zoomCenter, setZoomCenter] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  const zoomedChartData = useMemo(() => {
    if (zoomLevel <= 1 || zoomCenter === null || chartData.length === 0) return chartData
    const totalPoints = chartData.length
    const visiblePoints = Math.max(2, Math.floor(totalPoints / zoomLevel))
    const halfVisible = Math.floor(visiblePoints / 2)
    let startIndex = Math.max(0, zoomCenter - halfVisible)
    let endIndex = Math.min(totalPoints - 1, zoomCenter + halfVisible)
    return chartData.slice(startIndex, endIndex + 1)
  }, [chartData, zoomLevel, zoomCenter])

  useEffect(() => {
    const element = chartRef.current
    if (!element) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = element.getBoundingClientRect()
      const x = e.clientX - rect.left
      const relativeX = x / rect.width
      const dataIndex = Math.floor(relativeX * chartData.length)
      setZoomCenter(Math.max(0, Math.min(chartData.length - 1, dataIndex)))
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      setZoomLevel((prev) => Math.max(1, Math.min(prev * zoomFactor, chartData.length / 2)))
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [chartData.length])

  const handleDoubleClick = useCallback(() => {
    setZoomLevel(1)
    setZoomCenter(null)
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5 rounded-lg  bg-white ">
        <div className="flex items-center gap-1">
          <Eye className="h-[26px] w-[26px] stroke-general-border-three stroke-[1.5]" />
          <span className="text-base font-medium text-[#171717]">{title}</span>
        </div>
        <div className="flex items-center justify-center h-[250px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="flex flex-col gap-2.5 rounded-lg border border-general-border bg-white p-3">
        <div className="flex items-center gap-1">
          <Eye className="h-[26px] w-[26px] stroke-general-border-three stroke-[1.5]" />
          <span className="text-base font-medium text-[#171717]">{title}</span>
        </div>
        <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
          No position data available
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 bg-white">
      <div className="flex items-center gap-1">
        <span className="text-base font-medium font-mono  text-general-secondary-foreground">{title}</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-foreground-light p-2 ">
          {positions.map((position, index) => (
            <label
              key={position.key || index}
              className="flex justify-between gap-0.5 rounded px-1.5 py-1.5 bg-white cursor-pointer min-w-0"
            >
              <div className="flex items-center gap-1.5">
                <Checkbox
                  checked={position.checked ?? true}
                  onCheckedChange={(checked) => onToggle?.(position.key, checked as boolean)}
                  className="h-4 w-4 shrink-0 rounded border border-border data-[state=checked]:bg-general-foreground data-[state=checked]:border-general-foreground data-[state=unchecked]:bg-white cursor-pointer"
                />
                <span
                  className="text-xs font-medium text-[#2563EB] tracking-[0.18px] truncate"
                  style={{ opacity: opacityMap[position.key] ?? 1 }}
                >
                  {position.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-base font-normal text-general-foreground">
                  {position.value}
                </span>
                <div className="flex items-center gap-0.5">
                  {position.change >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-[#16A34A]" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-[#DC2626]" />
                  )}
                  <span className={`text-[11px] font-medium tracking-[0.15px] ${position.change >= 0 ? 'text-general-muted-foreground' : 'text-[#DC2626]'}`}>
                    {Math.abs(position.change)}%
                  </span>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div
          ref={chartRef}
          className="h-51 cursor-grab active:cursor-grabbing"
          onDoubleClick={handleDoubleClick}
        >
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={zoomedChartData} margin={{ top: 0, right: 0, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="fillPos1_3_dist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillPos4_10_dist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillPos11_20_dist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillPos20_plus_dist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#737373", fontFamily: "Geist" }}
                  dy={8}
                  interval={zoomedChartData.length <= 7 ? 0 : zoomedChartData.length <= 14 ? 1 : zoomedChartData.length <= 30 ? Math.floor(zoomedChartData.length / 8) : zoomedChartData.length <= 90 ? Math.floor(zoomedChartData.length / 10) : Math.floor(zoomedChartData.length / 12)}
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
                          {visibleLines.pos1_3 && (
                            <p className="text-blue-600">Pos 1-3: {data?.pos1_3?.toLocaleString()}</p>
                          )}
                          {visibleLines.pos4_10 && (
                            <p className="text-blue-600/70">Pos 4-10: {data?.pos4_10?.toLocaleString()}</p>
                          )}
                          {visibleLines.pos11_20 && (
                            <p className="text-blue-600/50">Pos 11-20: {data?.pos11_20?.toLocaleString()}</p>
                          )}
                          {visibleLines.pos20_plus && (
                            <p className="text-blue-600/30">Pos 20+: {data?.pos20_plus?.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    )
                  }}
                />
                {visibleLines.pos20_plus && (
                  <Area
                    type="linear"
                    dataKey="pos20_plusNorm"
                    stroke="#2563EB"
                    fill="url(#fillPos20_plus_dist)"
                    strokeWidth={1.5}
                    opacity={0.3}
                    name="Pos 20+"
                  />
                )}
                {visibleLines.pos11_20 && (
                  <Area
                    type="linear"
                    dataKey="pos11_20Norm"
                    stroke="#2563EB"
                    fill="url(#fillPos11_20_dist)"
                    strokeWidth={1.5}
                    opacity={0.5}
                    name="Pos 11-20"
                  />
                )}
                {visibleLines.pos4_10 && (
                  <Area
                    type="linear"
                    dataKey="pos4_10Norm"
                    stroke="#2563EB"
                    fill="url(#fillPos4_10_dist)"
                    strokeWidth={1.5}
                    opacity={0.7}
                    name="Pos 4-10"
                  />
                )}
                {visibleLines.pos1_3 && (
                  <Area
                    type="linear"
                    dataKey="pos1_3Norm"
                    stroke="#2563EB"
                    fill="url(#fillPos1_3_dist)"
                    strokeWidth={1.5}
                    name="Pos 1-3"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}
