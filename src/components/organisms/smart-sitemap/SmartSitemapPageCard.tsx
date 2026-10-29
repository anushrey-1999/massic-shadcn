import Link from "next/link"
import { TruncatedText } from "@/components/molecules/TruncatedText"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatCompact, formatPosition, statusLabel } from "@/lib/smart-sitemap"
import type { SmartSitemapListPage } from "@/hooks/use-smart-sitemap"
import { StatusDot, StatusReasonTooltip } from "./SmartSitemapStatusBadge"

export function SmartSitemapPageCard({ page, href }: { page: SmartSitemapListPage; href: string }) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col gap-2.5 rounded-lg border border-general-border bg-white p-3.5 transition-colors hover:border-general-border-three hover:bg-general-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <TruncatedText text={page.path} className="flex-1 text-sm font-medium text-general-foreground" />
        <StatusReasonTooltip status={page.indexing.status} reason={page.indexing.coverageState} showLabel>
          <span className="inline-flex">
            <StatusDot status={page.indexing.status} />
            <span className="sr-only">{statusLabel(page.indexing.status)}</span>
          </span>
        </StatusReasonTooltip>
      </div>
      <div className="flex items-end gap-1.5">
        <span
          className={cn(
            "text-[22px] leading-7 font-medium tabular-nums",
            page.gsc ? "text-general-foreground" : "text-general-border-three"
          )}
        >
          {formatCompact(page.gsc?.clicks)}
        </span>
        <span className="pb-0.5 text-xs text-general-muted-foreground">clicks</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-general-muted-foreground">
        <span>{formatCompact(page.gsc?.impressions)} impr.</span>
        <span>Pos. {formatPosition(page.gsc?.position)}</span>
        <span>{formatCompact(page.ga4?.sessions)} sessions</span>
        <span>
          {formatCompact(page.keywordCount)} {page.keywordCount === 1 ? "keyword" : "keywords"}
        </span>
      </div>
    </Link>
  )
}

export function SmartSitemapPageCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-general-border bg-white p-3.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}
