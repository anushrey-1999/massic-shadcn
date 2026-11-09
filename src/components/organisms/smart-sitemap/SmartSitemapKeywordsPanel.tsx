"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { TruncatedText } from "@/components/molecules/TruncatedText"
import { Input } from "@/components/ui/input"
import { formatInteger } from "@/lib/smart-sitemap"
import { SmartSitemapPanel } from "./SmartSitemapPanel"

export function SmartSitemapKeywordsPanel({ keywords }: { keywords: string[] }) {
  const [filter, setFilter] = useState("")
  const needle = filter.trim().toLowerCase()
  const matches = useMemo(
    () => (needle ? keywords.filter((keyword) => keyword.toLowerCase().includes(needle)) : keywords),
    [keywords, needle]
  )

  return (
    <SmartSitemapPanel
      title="Keywords"
      trailing={<span className="text-xs text-general-muted-foreground">{formatInteger(keywords.length)}</span>}
      bodyClassName="p-0"
    >
      {keywords.length ? (
        <>
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
        </>
      ) : (
        <p className="p-4 text-sm text-general-muted-foreground">No Search Console keywords for this page in this period.</p>
      )}
    </SmartSitemapPanel>
  )
}
