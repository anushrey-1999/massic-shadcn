import type { ReactElement } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { statusColor, statusLabel } from "@/lib/smart-sitemap"

export function StatusDot({ status, className }: { status: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: statusColor(status) }}
    />
  )
}

/** Shows Google's coverage text, e.g. "Not found (404)", when it explains the status. */
export function StatusReasonTooltip({
  status,
  reason,
  showLabel = false,
  children,
}: {
  status: string | null | undefined
  reason?: string | null
  showLabel?: boolean
  children: ReactElement
}) {
  const label = statusLabel(status)
  const text = reason && reason !== label ? (showLabel ? `${label}: ${reason}` : reason) : showLabel ? label : null
  if (!text) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[320px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

export function SmartSitemapStatusBadge({
  status,
  reason,
  className,
}: {
  status: string | null | undefined
  reason?: string | null
  className?: string
}) {
  return (
    <StatusReasonTooltip status={status} reason={reason}>
      <span
        className={cn(
          "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[4px] border border-general-border bg-general-secondary px-2 text-xs font-medium text-general-secondary-foreground",
          className
        )}
      >
        <StatusDot status={status} className="size-1.5" />
        {statusLabel(status)}
      </span>
    </StatusReasonTooltip>
  )
}
