"use client"

import { cn } from "@/lib/utils"

interface LLMBarData {
  icon: string
  name: string
  value: number
  change: number
  color: string
}

interface LLMBarChartProps {
  data: LLMBarData[]
  className?: string
}

export function LLMBarChart({ data, className }: LLMBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-muted">
            <img src={item.icon} alt={item.name} className="h-6 w-6" />
          </div>
          <div
            className="h-10 rounded-md flex items-center justify-start"
            style={{
              width: `${(item.value / maxValue) * 70}%`,
              backgroundColor: item.color,
              minWidth: "60px",
            }}
          />
          <span
            className={cn(
              "text-sm font-medium",
              item.change >= 0 ? "text-emerald-600" : "text-red-600"
            )}
          >
            {item.change >= 0 ? "+" : ""}
            {item.change}%
          </span>
        </div>
      ))}
    </div>
  )
}
