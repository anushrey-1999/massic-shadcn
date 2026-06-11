"use client"

import { Loader2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SourcesChannelsData {
  name: string
  goals: number
  sessions: number
  goalsNorm?: number
  sessionsNorm?: number
}

interface SourcesChannelsChartProps {
  data: SourcesChannelsData[]
  title?: string
  height?: number
  fillHeight?: boolean
  isLoading?: boolean
  hasData?: boolean
}

function formatValue(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return n.toLocaleString()
}

export function SourcesChannelsChart({
  data,
  title,
  height = 320,
  fillHeight = false,
  isLoading = false,
  hasData = true,
}: SourcesChannelsChartProps) {
  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-general-border bg-white p-3"
        style={{ minHeight: height }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hasData || data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-general-border bg-white p-3"
        style={{ minHeight: height }}
      >
        <span className="text-muted-foreground text-sm">No channel data available</span>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-2.5 rounded-lg p-3 border border-general-border bg-white"
      style={fillHeight ? { minHeight: height, height: "100%" } : { minHeight: height, height }}
    >
      {title ? (
        <span className="text-left text-base font-medium text-general-secondary-foreground">
          {title}
        </span>
      ) : null}

      <TooltipProvider>
        <div className="flex flex-col justify-center flex-1 gap-1">
          {data.map((item) => {
            const sessionsWidth = item.sessionsNorm ?? 0
            const goalsWidth = item.goalsNorm ?? 0

            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 py-[7px] cursor-default">
                    <span className="w-[120px] shrink-0 truncate text-sm text-[#0A0A0A]">
                      {item.name}
                    </span>

                    <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E5E5E5]">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: sessionsWidth > 0 ? `${sessionsWidth}%` : "0px",
                          backgroundColor: item.sessions > 0 ? "#f97316" : "#E5E5E5",
                          opacity: 0.45,
                        }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: goalsWidth > 0 ? `${goalsWidth}%` : "0px",
                          backgroundColor: item.goals > 0 ? "#059669" : "transparent",
                        }}
                      />
                    </div>

                    <div className="w-[80px] shrink-0 flex items-baseline gap-1 justify-end">
                      <span className="text-[12px] font-normal tracking-[0.18px] text-[#0a0a0a]">
                        {formatValue(item.goals)}
                      </span>
                      <span className="text-[10px] font-normal tracking-[0.18px] text-[#737373]">
                        {formatValue(item.sessions)}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="p-2">
                  <div className="mb-1 opacity-70">{item.name}</div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#f97316" }} />
                    <span>Sessions: {item.sessions.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#059669" }} />
                    <span>Goals: {item.goals.toLocaleString()}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    </div>
  )
}
