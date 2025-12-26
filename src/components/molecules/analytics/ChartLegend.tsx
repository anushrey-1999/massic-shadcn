"use client"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { StatsBadge } from "./StatsBadge"

interface ChartLegendItem {
  key: string
  label?: string
  icon: React.ReactNode
  value: string
  change: number
  color?: string
  checked?: boolean
}

interface ChartLegendProps {
  items: ChartLegendItem[]
  onToggle?: (key: string, checked: boolean) => void
  className?: string
}

export function ChartLegend({ items, onToggle, className }: ChartLegendProps) {
  return (
    <div className={cn("flex items-center gap-4 p-2 rounded-lg bg-foreground-light", className)}>
      {items.map((item) => (
        <label
          key={item.key}
          className="flex items-center justify-center px-1.5 py-1 bg-white rounded-md cursor-pointer flex-1"
        >
          <Checkbox
            checked={item.checked ?? true}
            onCheckedChange={(checked) =>
              onToggle?.(item.key, checked as boolean)
            }
            className="cursor-pointer"
          />
          <div className="flex items-center gap-2 pl-4 pr-2 flex-1 justify-center">
            <div className="flex items-center gap-1.5">
              <span style={item.color ? { color: item.color } : undefined} className={item.color ? undefined : "text-muted-foreground w-6 h-6"}>{item.icon}</span>
              <span
                className="font-semibold leading-[120%] tracking-[-0.02em]"
                style={{
                  fontSize: "20px",
                  ...(item.color ? { color: item.color } : {})
                }}
              >
                {item.value}
              </span>
            </div>
            <StatsBadge value={item.change} />
          </div>
        </label>
      ))}
    </div>
  )
}

interface PositionLegendItem {
  key: string
  label: string
  value: number
  change: number
  color: string
  checked?: boolean
}

interface PositionLegendProps {
  items: PositionLegendItem[]
  onToggle?: (key: string, checked: boolean) => void
  className?: string
}

export function PositionLegend({ items, onToggle, className }: PositionLegendProps) {
  return (
    <div className={cn("flex items-center gap-4 p-2", className)}>
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <Checkbox
            checked={item.checked ?? true}
            onCheckedChange={(checked) =>
              onToggle?.(item.key, checked as boolean)
            }
            className="data-[state=checked]:bg-primary"
            style={
              {
                "--checkbox-color": item.color,
              } as React.CSSProperties
            }
          />
          <div className="flex">
          <span className="text-sm">{item.label}</span>
          <span className="text-sm font-medium">{item.value}</span>
          <StatsBadge value={item.change} />
          </div>
        </div>
      ))}
    </div>
  )
}
