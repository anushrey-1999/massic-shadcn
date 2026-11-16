import { StatsBadge } from "@/components/molecules/analytics/StatsBadge"
import { DETAIL_METRICS, formatMetric, metricChangeBadge, metricValue, type DetailMetricKey } from "@/lib/smart-sitemap"
import type { Ga4Metrics, GscMetrics } from "@/hooks/use-smart-sitemap"
import { SmartSitemapPanel } from "./SmartSitemapPanel"

const ENGAGEMENT_KEYS: DetailMetricKey[] = ["ctr", "engagedSessions", "engagementRate", "revenue"]

interface SmartSitemapEngagementCardProps {
  current: { gsc: GscMetrics | null; ga4: Ga4Metrics | null }
  previous: { gsc: GscMetrics | null; ga4: Ga4Metrics | null }
}

export function SmartSitemapEngagementCard({ current, previous }: SmartSitemapEngagementCardProps) {
  return (
    <SmartSitemapPanel title="Engagement">
      <dl className="space-y-3">
        {ENGAGEMENT_KEYS.map((key) => {
          const metric = DETAIL_METRICS[key]
          const value = metricValue(key, current.gsc, current.ga4)
          const badge = metricChangeBadge(metric.format, value, metricValue(key, previous.gsc, previous.ga4))
          return (
            <div key={key} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-general-muted-foreground">{metric.label}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span className={value == null ? "text-general-border-three" : "font-medium tabular-nums text-general-foreground"}>
                  {formatMetric(metric.format, value)}
                </span>
                {badge ? <StatsBadge value={badge.value} unit={badge.unit} label={badge.label} variant="plain" /> : null}
              </dd>
            </div>
          )
        })}
      </dl>
    </SmartSitemapPanel>
  )
}
