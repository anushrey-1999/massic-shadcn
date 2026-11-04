"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import type { SmartSitemapListPage } from "@/hooks/use-smart-sitemap"
import { SITEMAP_COLUMNS } from "./sitemapColumns"
import { SmartSitemapPathCell, SmartSitemapPathTooltip } from "./SmartSitemapCells"
import {
  SmartSitemapRow,
  SmartSitemapSkeletonRows,
  SmartSitemapTableShell,
  type SitemapSortState,
} from "./SmartSitemapTableLayout"

interface SmartSitemapTableProps {
  /** Null while the first response loads. */
  pages: SmartSitemapListPage[] | null
  skeletonCount: number
  updating: boolean
  sort: SitemapSortState
  onSort: (next: SitemapSortState) => void
  pageHref: (pageId: string) => string
}

export function SmartSitemapTable({ pages, skeletonCount, updating, sort, onSort, pageHref }: SmartSitemapTableProps) {
  const router = useRouter()
  return (
    <SmartSitemapTableShell label="Site pages" pathLabel="Page" sort={sort} onSort={onSort} updating={updating}>
      {pages ? (
        pages.map((page) => {
          const href = pageHref(page.id)
          return (
            <SmartSitemapRow
              key={page.id}
              onActivate={() => router.push(href)}
              lead={
                <SmartSitemapPathTooltip path={page.path}>
                  <Link
                    href={href}
                    className="block min-w-0 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <SmartSitemapPathCell path={page.path} />
                  </Link>
                </SmartSitemapPathTooltip>
              }
              cells={SITEMAP_COLUMNS.map((column) => column.page(page))}
              trailing={<ChevronRight className="size-4" strokeWidth={1.5} />}
            />
          )
        })
      ) : (
        <SmartSitemapSkeletonRows count={skeletonCount} />
      )}
    </SmartSitemapTableShell>
  )
}
