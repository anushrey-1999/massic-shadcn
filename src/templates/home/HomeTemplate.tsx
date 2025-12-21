"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, AlertTriangle, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { StatsBadge } from "@/components/molecules/analytics"
import { useAuthStore } from "@/store/auth-store"
import { useBusinessProfiles } from "@/hooks/use-business-profiles"
import { useBusinessPreviews, type BusinessPreviewItem } from "@/hooks/use-business-previews"
import { useGoogleAccounts } from "@/hooks/use-google-accounts"
import { cn } from "@/lib/utils"
import { Area, AreaChart, XAxis, YAxis } from "recharts"

type PreviewGraphRow = {
  keys?: [string]
  clicks?: string | number
  impressions?: string | number
  goal?: string | number
}

type PreviewGraph = {
  rows?: PreviewGraphRow[]
}

type PreviewStats = {
  Total?: string | number
  Trend?: "up" | "down" | string
  Diff?: string | number
}

type PreviewMainStats = {
  Clicks?: PreviewStats
  Impressions?: PreviewStats
  goals?: PreviewStats
}

function safeJsonParse<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizeUrlDomain(input: string) {
  const raw = (input || "").trim().toLowerCase()
  if (!raw) return ""
  try {
    const withProto = raw.startsWith("http") ? raw : `https://${raw}`
    const url = new URL(withProto)
    return url.hostname.replace(/^www\./, "")
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || raw
  }
}

function formatTotal(value: string | number | undefined) {
  if (value === undefined || value === null) return "—"
  return String(value)
}

function parsePercent(diff: string | number | undefined, trend: string | undefined): number {
  if (diff === undefined || diff === null) return 0
  const raw = typeof diff === "number" ? diff : Number(String(diff).replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(raw)) return 0
  return (trend || "").toLowerCase() === "down" ? -raw : raw
}

function getGreetingName(user: any) {
  return user?.firstName || user?.FirstName || user?.name || user?.Name || user?.username || "there"
}

const HOME_PERIODS = [
  { label: "7 days", value: "7 days" },
  { label: "14 days", value: "14 days" },
  { label: "28 days", value: "28 days" },
  { label: "3 months", value: "3 months" },
  { label: "6 months", value: "6 months" },
  { label: "12 months", value: "12 months" },
] as const

const miniChartConfig: ChartConfig = {
  impressionsNorm: { label: "Impressions", color: "#9CA3AF" },
  clicksNorm: { label: "Clicks", color: "#2563EB" },
  goalsNorm: { label: "Goals", color: "#059669" },
}

function MiniAreaChart({ graph }: { graph: PreviewGraph }) {
  const data = useMemo(() => {
    const rows = graph.rows || []
    return rows.map((row) => ({
      date: row.keys?.[0] || "",
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      goals: Number(row.goal ?? 0),
    }))
  }, [graph.rows])

  const normalizedData = useMemo(() => {
    if (data.length === 0) return []

    const maxImpressions = Math.max(...data.map((d) => d.impressions || 0))
    const maxClicks = Math.max(...data.map((d) => d.clicks || 0))
    const maxGoals = Math.max(...data.map((d) => d.goals || 0))
    const globalMax = Math.max(maxImpressions, maxClicks, maxGoals)

    if (globalMax === 0) {
      return data.map((point) => ({
        ...point,
        impressionsNorm: 0,
        clicksNorm: 0,
        goalsNorm: 0,
      }))
    }

    const logMax = Math.log10(globalMax + 1)
    const scaleValue = (value: number): number => {
      if (!value) return 0
      return (Math.log10(value + 1) / logMax) * 100
    }

    return data.map((point) => ({
      ...point,
      impressionsNorm: scaleValue(point.impressions),
      clicksNorm: scaleValue(point.clicks),
      goalsNorm: scaleValue(point.goals),
    }))
  }, [data])

  if (data.length === 0) {
    return (
      <div className="h-[115px] flex items-center justify-center">
        <Skeleton className="h-[90px] w-full" />
      </div>
    )
  }

  return (
    <div className="h-[115px]">
      <ChartContainer config={miniChartConfig} className="h-full w-full">
        <AreaChart data={normalizedData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, _item, _index, payload) => {
                  const seriesKey = String(name || "")
                  const rawKey = seriesKey.endsWith("Norm") ? seriesKey.slice(0, -4) : seriesKey
                  const rawValue = (payload as any)?.[rawKey]
                  const displayValue = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0)
                  const label = seriesKey.startsWith("impressions")
                    ? "Impressions"
                    : seriesKey.startsWith("clicks")
                      ? "Clicks"
                      : "Goals"

                  return (
                    <>
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {Number.isFinite(displayValue) ? displayValue.toLocaleString() : "0"}
                      </span>
                    </>
                  )
                }}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="impressionsNorm"
            stroke="var(--color-impressionsNorm)"
            fill="transparent"
            strokeWidth={1.5}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="goalsNorm"
            stroke="var(--color-goalsNorm)"
            fill="transparent"
            strokeWidth={1.5}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="clicksNorm"
            stroke="var(--color-clicksNorm)"
            fill="transparent"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function BusinessPreviewCard({
  item,
  name,
  uniqueId,
  onConnectGoogle,
}: {
  item: BusinessPreviewItem
  name: string
  uniqueId: string | null
  onConnectGoogle: () => void
}) {
  const router = useRouter()

  const mainStats = useMemo(
    () => safeJsonParse<PreviewMainStats>(item.mainstats, {}),
    [item.mainstats]
  )
  const graph = useMemo(
    () => safeJsonParse<PreviewGraph>(item.graph, {}),
    [item.graph]
  )

  const clicks = mainStats?.Clicks || {}
  const impressions = mainStats?.Impressions || {}
  const goals = mainStats?.goals || {}

  const showConnectAnalytics = Object.keys(goals || {}).length === 0
  const showConnectGoogle =
    Object.keys(clicks || {}).length === 0 ||
    Object.keys(impressions || {}).length === 0

  const domain = normalizeUrlDomain(item.url)

  const handleOpen = () => {
    if (uniqueId) {
      router.push(`/business/${uniqueId}/analytics`)
      return
    }

    if (item.url) {
      window.open(item.url.startsWith("http") ? item.url : `https://${item.url}`, "_blank")
    }
  }

  if (showConnectGoogle) {
    return null
  }

  return (
    <Card className="overflow-hidden border-border py-0 gap-0">
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleOpen()
          }
        }}
        className="w-full text-left cursor-pointer"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <p className="font-mono text-sm text-muted-foreground truncate">{name || domain}</p>
        </div>

        <div className="px-3 pt-2 pb-3">
          <div
            className={cn(
              "rounded-md border px-2 py-1.5 flex items-center justify-between mb-2",
              showConnectAnalytics
                ? "border-red-200 bg-red-50/70"
                : "border-transparent bg-transparent invisible"
            )}
          >
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Connect Google Analytics</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-600"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onConnectGoogle()
              }}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <MiniAreaChart graph={graph} />
        </div>

        <CardContent className="pt-0 pb-3 px-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-7 rounded-md bg-secondary px-2 flex items-center justify-center gap-1.5">
              <span className="text-base font-medium leading-6 text-muted-foreground">{formatTotal(impressions.Total)}</span>
              <StatsBadge value={parsePercent(impressions.Diff, impressions.Trend)} variant="plain" />
            </div>

            <div className="flex-1 h-7 rounded-md bg-secondary px-2 flex items-center justify-center gap-1.5">
              <span className="text-base font-medium leading-6 text-blue-600">{formatTotal(clicks.Total)}</span>
              <StatsBadge value={parsePercent(clicks.Diff, clicks.Trend)} variant="plain" />
            </div>

            <div className="flex-1 h-7 rounded-md bg-secondary px-2 flex items-center justify-center gap-1.5">
              <span className="text-base font-medium leading-6 text-emerald-600">{formatTotal(goals.Total)}</span>
              <StatsBadge value={parsePercent(goals.Diff, goals.Trend)} variant="plain" />
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}

function ProspectCard({
  item,
  onConnectGoogle,
}: {
  item: BusinessPreviewItem
  onConnectGoogle: () => void
}) {
  const domain = normalizeUrlDomain(item.url)

  return (
    <Card className="border-border py-0 gap-0">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <p className="font-mono text-sm text-muted-foreground truncate">{domain}</p>
        <Button
          type="button"
          variant="secondary"
          className="h-9"
          onClick={(e) => {
            e.preventDefault()
            onConnectGoogle()
          }}
        >
          <span className="mr-2"><GoogleIcon /></span>
          Connect Google
        </Button>
      </CardContent>
    </Card>
  )
}

export function HomeTemplate() {
  const router = useRouter()
  const { user } = useAuthStore()
  const greetingName = getGreetingName(user)

  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState<(typeof HOME_PERIODS)[number]["value"]>("3 months")

  const { profiles } = useBusinessProfiles()
  const { previews, isLoading: previewsLoading } = useBusinessPreviews(period)
  const { connectGoogleAccount } = useGoogleAccounts()

  const joined = useMemo(() => {
    const profileByDomain = new Map<string, { name: string; uniqueId: string }>()
    for (const profile of profiles) {
      const domain = normalizeUrlDomain(profile.Website || "")
      if (!domain) continue
      profileByDomain.set(domain, {
        name: profile.Name || profile.DisplayName || domain,
        uniqueId: profile.UniqueId,
      })
    }

    return previews.map((preview) => {
      const domain = normalizeUrlDomain(preview.url)
      const match = profileByDomain.get(domain)
      return {
        preview,
        domain,
        name: match?.name || domain,
        uniqueId: match?.uniqueId || null,
      }
    })
  }, [previews, profiles])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return joined
    return joined.filter((x) => x.name.toLowerCase().includes(q) || x.domain.includes(q))
  }, [joined, search])

  const { activeBusinesses, prospects } = useMemo(() => {
    const active: typeof filtered = []
    const prospect: typeof filtered = []

    for (const item of filtered) {
      const mainStats = safeJsonParse<PreviewMainStats>(item.preview.mainstats, {})
      const clicks = mainStats?.Clicks || {}
      const impressions = mainStats?.Impressions || {}

      const showConnectGoogle =
        Object.keys(clicks || {}).length === 0 ||
        Object.keys(impressions || {}).length === 0

      if (showConnectGoogle) {
        prospect.push(item)
      } else {
        active.push(item)
      }
    }

    return { activeBusinesses: active, prospects: prospect }
  }, [filtered])

  // const statsCounts = useMemo(() => {
  //   let goalAlerts = 0
  //   let trafficAlerts = 0

  //   // Best-effort: if GA goals missing for any active business, treat as alert.
  //   // (A dedicated alerts summary endpoint is not available in this UI layer yet.)
  //   for (const item of activeBusinesses) {
  //     const mainStats = safeJsonParse<PreviewMainStats>(item.preview.mainstats, {})
  //     const goals = mainStats?.goals || {}
  //     if (Object.keys(goals || {}).length === 0) {
  //       goalAlerts += 1
  //     }
  //   }

  //   return { goalAlerts, trafficAlerts }
  // }, [activeBusinesses])

  return (
    <div className="bg-muted p-7 flex flex-col gap-5 min-h-full">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Hi, {greetingName}</h1>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as any)}>
            <SelectTrigger className="min-w-[130px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent align="end">
              {HOME_PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name"
              className="pl-9"
            />
          </div>

          <Button
            type="button"
            onClick={() => router.push("/create-business")}
            className="h-9"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* {statsCounts.goalAlerts > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <p className="text-sm font-medium text-amber-700">
            You have {statsCounts.goalAlerts} goal alerts and {statsCounts.trafficAlerts} traffic alerts
          </p>
        </div>
      )} */}

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-muted-foreground">Active Businesses</h2>

        {previewsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="px-3 py-2">
                  <Skeleton className="h-[115px] w-full" />
                </div>
                <CardContent className="pt-0 pb-3 px-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeBusinesses.map(({ preview, name, uniqueId, domain }) => (
              <BusinessPreviewCard
                key={domain}
                item={preview}
                name={name}
                uniqueId={uniqueId}
                onConnectGoogle={connectGoogleAccount}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-muted-foreground">Prospects</h2>
        <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4", prospects.length === 0 && "opacity-60")}>
          {prospects.map(({ preview, domain }) => (
            <ProspectCard
              key={domain}
              item={preview}
              onConnectGoogle={connectGoogleAccount}
            />
          ))}

          {!previewsLoading && prospects.length === 0 && (
            <Card className="border-border">
              <CardContent className="p-3 text-sm text-muted-foreground">
                No prospects found
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
