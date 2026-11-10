"use client"

import { useMemo, useState } from "react"
import { Loader2, RefreshCw, Search } from "lucide-react"
import { TruncatedText } from "@/components/molecules/TruncatedText"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatInteger } from "@/lib/smart-sitemap"
import { SmartSitemapPanel } from "./SmartSitemapPanel"

interface SmartSitemapKeywordsPanelProps {
  /** Undefined until the first response arrives. */
  keywords: string[] | undefined
  isError: boolean
  retrying: boolean
  onRetry: () => void
}

export function SmartSitemapKeywordsPanel({ keywords, isError, retrying, onRetry }: SmartSitemapKeywordsPanelProps) {
  const [filter, setFilter] = useState("")
  const needle = filter.trim().toLowerCase()
  const matches = useMemo(
    () => (keywords && needle ? keywords.filter((keyword) => keyword.toLowerCase().includes(needle)) : (keywords ?? [])),
    [keywords, needle]
  )

  return (
    <SmartSitemapPanel
      title="Keywords"
      trailing={
        keywords ? (
          <span className="text-xs text-general-muted-foreground">{formatInteger(keywords.length)}</span>
        ) : isError ? null : (
          <Skeleton className="h-3 w-6" />
        )
      }
      bodyClassName="p-0"
    >
      {!keywords ? (
        isError ? (
          <div className="flex items-center justify-between gap-3 p-4 text-sm">
            <span className="text-general-muted-foreground">Keywords could not be loaded.</span>
            <Button variant="outline" size="sm" className="gap-2" onClick={onRetry} disabled={retrying}>
              {retrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-3 p-4" role="status" aria-label="Loading keywords">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-4 w-full max-w-[420px]" />
            ))}
          </div>
        )
      ) : keywords.length ? (
        <div>
          <div className="relative border-b border-general-border px-4 py-3">
            <Search className="pointer-events-none absolute left-7 top-1/2 size-4 -translate-y-1/2 text-general-muted-foreground" />
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter keywords"
              aria-label="Filter keywords"
              className="h-8 pl-9 text-sm shadow-none"
            />
          </div>
          {matches.length ? (
            <ul className="max-h-[360px] divide-y divide-general-border overflow-y-auto">
              {matches.map((keyword) => (
                <li key={keyword} className="px-4 py-2 text-sm text-general-foreground">
                  <TruncatedText text={keyword} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-general-muted-foreground">No keywords contain “{filter.trim()}”.</p>
          )}
        </div>
      ) : (
        <p className="p-4 text-sm text-general-muted-foreground">No Search Console keywords for this page in this period.</p>
      )}
    </SmartSitemapPanel>
  )
}
