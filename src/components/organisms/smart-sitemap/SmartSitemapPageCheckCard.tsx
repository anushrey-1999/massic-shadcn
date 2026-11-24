import { formatDistanceToNowStrict, parseISO } from "date-fns"
import type { PageCheck } from "@/hooks/use-smart-sitemap"
import { formatDay, pageCheckDestination, pageCheckStatus } from "@/lib/smart-sitemap"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SmartSitemapPanel } from "./SmartSitemapPanel"

interface SmartSitemapPageCheckCardProps {
  check: PageCheck | null | undefined
  path: string
}

function CheckedAt({ checkedAt }: { checkedAt: string }) {
  const parsed = parseISO(checkedAt)
  if (Number.isNaN(parsed.getTime())) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default text-xs text-general-muted-foreground">
          Checked {formatDistanceToNowStrict(parsed, { addSuffix: true })}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {formatDay(checkedAt, "MMM d, yyyy h:mm a")}
      </TooltipContent>
    </Tooltip>
  )
}

function TextField({ label, value, emptyLabel }: { label: string; value: string | null; emptyLabel: string }) {
  return (
    <div className="space-y-1">
      <dt className="flex items-center justify-between gap-2 text-xs text-general-muted-foreground">
        {label}
        {value ? <span className="tabular-nums">{value.length} chars</span> : null}
      </dt>
      <dd className={value ? "break-words text-sm text-general-foreground" : "text-sm text-general-border-three"}>
        {value ?? emptyLabel}
      </dd>
    </div>
  )
}

export function SmartSitemapPageCheckCard({ check, path }: SmartSitemapPageCheckCardProps) {
  if (!check) {
    return (
      <SmartSitemapPanel title="Live page">
        <p className="text-sm text-general-muted-foreground">
          Not checked yet. Massic checks each page&apos;s status, title and meta description automatically.
        </p>
      </SmartSitemapPanel>
    )
  }

  const status = pageCheckStatus(check)
  const destination = pageCheckDestination(check, path)
  const showsContent = check.outcome === "ok" || check.outcome === "redirected"

  return (
    <SmartSitemapPanel title="Live page" trailing={<CheckedAt checkedAt={check.checkedAt} />}>
      <dl className="space-y-3">
        <div className="flex items-start justify-between gap-3 text-sm">
          <dt className="text-general-muted-foreground">Status</dt>
          <dd className="flex min-w-0 flex-col items-end gap-0.5 text-right">
            <span className="flex min-w-0 items-center gap-1.5 font-medium text-general-foreground">
              <span
                aria-hidden="true"
                className="inline-block size-2 shrink-0 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <span className="truncate">{status.label}</span>
            </span>
            {status.detail ? <span className="text-xs text-general-muted-foreground">{status.detail}</span> : null}
          </dd>
        </div>
        {destination ? (
          <div className="space-y-1">
            <dt className="text-xs text-general-muted-foreground">Ends at</dt>
            <dd className="break-all text-sm text-general-foreground">
              <a
                href={destination}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {destination}
              </a>
            </dd>
          </div>
        ) : null}
        {showsContent ? (
          <>
            <TextField label="Title" value={check.title ?? null} emptyLabel="No title" />
            <TextField
              label="Meta description"
              value={check.metaDescription ?? null}
              emptyLabel="No meta description"
            />
          </>
        ) : null}
      </dl>
    </SmartSitemapPanel>
  )
}
