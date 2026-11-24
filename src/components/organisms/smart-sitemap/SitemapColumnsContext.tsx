"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { SITEMAP_COLUMNS, type SitemapColumn } from "./sitemapColumns"

const SitemapColumnsContext = createContext<SitemapColumn[]>(SITEMAP_COLUMNS)

/** Columns after Page that the table and tree render; hidden ones are left out everywhere. */
export function SitemapColumnsProvider({ hidden, children }: { hidden: readonly string[]; children: ReactNode }) {
  const columns = useMemo(() => SITEMAP_COLUMNS.filter((column) => !hidden.includes(column.id)), [hidden])
  return <SitemapColumnsContext.Provider value={columns}>{children}</SitemapColumnsContext.Provider>
}

export function useSitemapColumns(): SitemapColumn[] {
  return useContext(SitemapColumnsContext)
}
