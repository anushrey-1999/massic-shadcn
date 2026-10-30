"use client"

import { FolderTree, Table2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const SITEMAP_VIEWS = ["table", "tree"] as const
export type SitemapView = (typeof SITEMAP_VIEWS)[number]

const VIEW_OPTIONS: Record<SitemapView, { label: string; icon: typeof Table2 }> = {
  table: { label: "Table", icon: Table2 },
  tree: { label: "Tree", icon: FolderTree },
}

export function SmartSitemapViewToggle({ value, onChange }: { value: SitemapView; onChange: (view: SitemapView) => void }) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as SitemapView)}>
      <TabsList aria-label="Sitemap view" className="h-9 rounded-lg p-0.5">
        {SITEMAP_VIEWS.map((view) => {
          const { label, icon: Icon } = VIEW_OPTIONS[view]
          return (
            <TabsTrigger key={view} value={view} className="h-8 rounded-[6px] px-2.5">
              <Icon strokeWidth={1.5} />
              {label}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
