"use client"

import { cn } from "@/lib/utils"

interface FunnelItem {
  label: string
  value: number
  percentage?: string
}

interface FunnelChartProps {
  data: FunnelItem[]
  className?: string
}

const VIEWBOX_WIDTH = 327
const VIEWBOX_HEIGHT = 274
const TOP_Y = 12
const BOTTOM_Y = VIEWBOX_HEIGHT - 12
const TOP_INSET = 20
const BOTTOM_INSET = 90
const CORNER_RADIUS = 16
const LINE_OFFSET = 0
const LINE_RATIOS = [0.37, 0.68] as const
const SECTION_STYLES = [
  {
    label: "text-xs font-medium text-muted-foreground",
    value: "text-2xl font-semibold leading-8 text-foreground",
  },
  {
    label: "text-xs font-medium text-sky-500",
    value: "text-2xl font-semibold leading-8 text-sky-600",
  },
  {
    label: "text-xs font-medium text-emerald-500",
    value: "text-2xl font-semibold leading-8 text-emerald-600",
  },
] as const

const outlinePath = [
  `M ${TOP_INSET + CORNER_RADIUS} ${TOP_Y}`,
  `H ${VIEWBOX_WIDTH - TOP_INSET - CORNER_RADIUS}`,
  `Q ${VIEWBOX_WIDTH - TOP_INSET} ${TOP_Y} ${VIEWBOX_WIDTH - TOP_INSET} ${TOP_Y + CORNER_RADIUS}`,
  `L ${VIEWBOX_WIDTH - BOTTOM_INSET} ${BOTTOM_Y - CORNER_RADIUS}`,
  `Q ${VIEWBOX_WIDTH - BOTTOM_INSET} ${BOTTOM_Y} ${VIEWBOX_WIDTH - BOTTOM_INSET - CORNER_RADIUS} ${BOTTOM_Y}`,
  `H ${BOTTOM_INSET + CORNER_RADIUS}`,
  `Q ${BOTTOM_INSET} ${BOTTOM_Y} ${BOTTOM_INSET} ${BOTTOM_Y - CORNER_RADIUS}`,
  `L ${TOP_INSET} ${TOP_Y + CORNER_RADIUS}`,
  `Q ${TOP_INSET} ${TOP_Y} ${TOP_INSET + CORNER_RADIUS} ${TOP_Y}`,
  "Z",
].join(" ")

const slope = (BOTTOM_INSET - TOP_INSET) / (BOTTOM_Y - TOP_Y)

const lines = LINE_RATIOS.map((ratio, index) => {
  const y = TOP_Y + (BOTTOM_Y - TOP_Y) * ratio
  const left = TOP_INSET + slope * (y - TOP_Y) + LINE_OFFSET
  const right = VIEWBOX_WIDTH - left
  return {
    y,
    left,
    right,
    color: index === 0 ? "#3b82f6" : "#10b981",
    percentY: (y / VIEWBOX_HEIGHT) * 100,
    percentX: (right / VIEWBOX_WIDTH) * 100,
  }
})

const formatValue = (value?: number) => {
  if (typeof value !== "number") {
    return "—"
  }
  return value.toLocaleString()
}

export function FunnelChart({ data, className }: FunnelChartProps) {
  return (
    <div className={cn("relative w-full h-full", className)} style={{ aspectRatio: "327 / 274" }}>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="funnel-stroke" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d={outlinePath} fill="#ffffff" stroke="url(#funnel-stroke)" strokeWidth={1.5} />
        {lines.map((line, index) => (
          <line
            key={`divider-${line.y}`}
            x1={line.left}
            x2={line.right}
            y1={line.y}
            y2={line.y}
            stroke={line.color}
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={index === 0 ? 0.9 : 0.85}
          />
        ))}
      </svg>
      <div className="relative z-10 flex h-full flex-col items-center justify-between py-8 text-center">
        {SECTION_STYLES.map((style, index) => (
          <div key={`${style.value}-${index}`} className="">
            <p className={style.label}>{data[index]?.label ?? ""}</p>
            <p className={style.value}>{formatValue(data[index]?.value)}</p>
          </div>
        ))}
      </div>
      {lines.map((line, index) => {
        const percentage = data[index]?.percentage
        if (!percentage) {
          return null
        }
        const pillColor = index === 0 ? "border-slate-200 text-general-foreground" : "border-emerald-200 text-general-foreground"
        return (
          <span
            key={`pill-${line.y}`}
            className={cn(
              "absolute z-10 -translate-y-1/2 text-general-foreground rounded-full font-mono bg-white px-0.5 text-base leading-none",
              pillColor
            )}
            style={{
              top: `${line.percentY}%`,
              left: `calc(${line.percentX}% - 50px)`,
            }}
          >
            {percentage}
          </span>
        )
      })}
    </div>
  )
}
