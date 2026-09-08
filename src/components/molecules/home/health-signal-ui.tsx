import type { ReactNode } from "react"
import { ArrowDown, ArrowUp, Minus, MousePointerClick, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  Confidence,
  HealthColor,
  HealthStatusRow,
  TrendArrow,
} from "@/hooks/use-health-status"

export const HEALTH_ACCENT_COLOR: Record<NonNullable<HealthColor>, string> = {
  green: "#639922",
  amber: "#EF9F27",
  red: "#E24B4A",
  gray: "#B4B2A9",
}

export const HEALTH_LABEL: Record<NonNullable<HealthColor>, string> = {
  green: "Strong",
  amber: "Dip",
  red: "Check",
  gray: "No Signal",
}

const HEALTH_BADGE_CLASSNAME: Record<NonNullable<HealthColor>, string> = {
  green: "border-transparent bg-[#EEF6E4] text-[#639922]",
  amber: "border-transparent bg-[#FFF3E2] text-[#EF9F27]",
  red: "border-transparent bg-[#FDECEC] text-[#E24B4A]",
  gray: "border-transparent bg-[#F2F1EE] text-[#7E7B73]",
}

const HEALTH_TOOLTIP_NARRATIVE: Record<
  "green" | "amber" | "red",
  { strongSignal: { subtitle: string; footer: string }; thinData: { subtitle: string; footer: string } }
> = {
  green: {
    strongSignal: {
      subtitle: "Performing well and holding steady",
      footer: "Strong signal · 14 days of data",
    },
    thinData: {
      subtitle: "Looking good so far — check back as more data comes in",
      footer: "Thin data · too early to confirm",
    },
  },
  amber: {
    strongSignal: {
      subtitle: "Healthy, but momentum is softening",
      footer: "Strong signal · 14 days of data",
    },
    thinData: {
      subtitle: "Some soft signals — could be noise",
      footer: "Thin data · too early to act on this",
    },
  },
  red: {
    strongSignal: {
      subtitle: "Traffic is down and the pattern is consistent",
      footer: "Strong signal · 14 days of data",
    },
    thinData: {
      subtitle: "Some dips, but not enough data to confirm a real problem",
      footer: "Thin data · hold off before drawing conclusions",
    },
  },
}

export function healthTooltipNarrativeBlock(
  color: NonNullable<HealthColor>,
  confidence: Confidence
) {
  if (color === "gray") return null
  const row = HEALTH_TOOLTIP_NARRATIVE[color]
  return confidence === "low" ? row.thinData : row.strongSignal
}

export function HealthSignalPill({
  color,
  streakDays,
  className,
}: {
  color: NonNullable<HealthColor>
  streakDays?: number | null
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium leading-none",
        HEALTH_BADGE_CLASSNAME[color],
        className
      )}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: HEALTH_ACCENT_COLOR[color] }}
      />
      {HEALTH_LABEL[color]}
      {streakDays ? ` · ${streakDays}d` : null}
    </span>
  )
}

export function HealthTrendIndicator({ trend }: { trend: TrendArrow }) {
  const className = "h-3 w-3 shrink-0 text-muted-foreground"
  if (trend === "up") return <ArrowUp className={className} strokeWidth={2} />
  if (trend === "down") return <ArrowDown className={className} strokeWidth={2} />
  return <Minus className={className} strokeWidth={2} />
}

export function healthTrendLabel(trend: TrendArrow) {
  if (trend === "up") return "Trending up"
  if (trend === "down") return "Trending down"
  return "Holding steady"
}

function formatCompact(value: number | null | undefined) {
  if (value == null) return "—"
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(Math.round(value))
}

function formatPct(value: number | null | undefined) {
  if (value == null) return "—"
  const rounded = Math.round(value * 100)
  return rounded >= 0 ? `+${rounded}%` : `${rounded}%`
}

function MetricRow({
  icon,
  label,
  recent,
  baseline,
  changePct,
}: {
  icon: ReactNode
  label: string
  recent: number | null
  baseline: number | null
  changePct: number | null
}) {
  if (recent == null && baseline == null) return null
  const changeColor = changePct == null
    ? "text-muted-foreground"
    : changePct >= 0 ? "text-green-600" : "text-red-600"

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex shrink-0 items-center gap-1">
        {icon}
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1 text-[11px] tabular-nums">
        <span className="font-medium text-foreground">{formatCompact(recent)}</span>
        <span className={cn("font-medium", changeColor)}>{formatPct(changePct)}</span>
        <span className="text-[10px] text-muted-foreground">vs {formatCompact(baseline)}</span>
      </div>
    </div>
  )
}

export function HealthDailyMetrics({ status }: { status: HealthStatusRow }) {
  const hasMetrics = status.recent_leads != null || status.recent_traffic != null
  if (!hasMetrics) return null

  return (
    <div className="space-y-1.5">
      <MetricRow
        icon={<Target className="h-3 w-3 shrink-0 text-emerald-600" />}
        label="Goals"
        recent={status.recent_leads}
        baseline={status.baseline_leads}
        changePct={status.lead_change_pct}
      />
      <MetricRow
        icon={<MousePointerClick className="h-3 w-3 shrink-0 rotate-90 text-blue-600" />}
        label="Clicks"
        recent={status.recent_traffic}
        baseline={status.baseline_traffic}
        changePct={status.traffic_change_pct}
      />
    </div>
  )
}

export function formatHealthDate(dateKey: string, short = false) {
  const [year, month, day] = dateKey.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(short ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(date)
}
