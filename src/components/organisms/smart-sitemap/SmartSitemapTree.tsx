"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, FileText, Folder, FolderOpen, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { decodePath, formatInteger } from "@/lib/smart-sitemap"
import {
  SITEMAP_TREE_PAGE_SIZE,
  useSmartSitemapTree,
  type SitemapTreeFolder,
  type SitemapTreePage,
  type SmartSitemapQueryParams,
} from "@/hooks/use-smart-sitemap"
import { SITEMAP_COLUMNS } from "./sitemapColumns"
import { SmartSitemapPathTooltip } from "./SmartSitemapCells"
import {
  SmartSitemapMessageRow,
  SmartSitemapRow,
  SmartSitemapSkeletonRows,
  SmartSitemapTableShell,
  type SitemapSortState,
} from "./SmartSitemapTableLayout"

type TreeQuery = ReturnType<typeof useSmartSitemapTree>

const INDENT_STEP = 20
/** Deeper levels stop indenting so long paths keep room for their names. */
const MAX_INDENT_DEPTH = 6
const TOGGLE_WIDTH = 24

function indentOf(depth: number) {
  return Math.min(depth, MAX_INDENT_DEPTH) * INDENT_STEP
}

function relativeLabel(path: string, parent: string) {
  const parentDepth = parent.split("/").filter(Boolean).length
  return decodePath(path.split("/").filter(Boolean).slice(parentDepth).join("/") || path)
}

interface TreeContextValue {
  businessId: string
  params: SmartSitemapQueryParams
  filtered: boolean
  expanded: ReadonlySet<string>
  toggle: (path: string) => void
  pageHref: (pageId: string) => string
}

const TreeContext = createContext<TreeContextValue | null>(null)

function useTree() {
  const value = useContext(TreeContext)
  if (!value) throw new Error("Sitemap tree rows must render inside SmartSitemapTree")
  return value
}

/** Open folders survive navigation to a page and back within the tab, per business. */
function useExpandedFolders(businessId: string) {
  const storageKey = `smart-sitemap-tree-expanded:${businessId}`
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "[]")
      setExpanded(new Set(Array.isArray(stored) ? stored.filter((value) => typeof value === "string") : []))
    } catch {
      setExpanded(new Set())
    }
  }, [storageKey])

  const toggle = useCallback(
    (path: string) => {
      setExpanded((current) => {
        const next = new Set(current)
        if (next.has(path)) {
          // Collapsing a folder also forgets its open descendants.
          for (const value of current) if (value === path || value.startsWith(`${path}/`)) next.delete(value)
        } else next.add(path)
        try {
          window.sessionStorage.setItem(storageKey, JSON.stringify([...next]))
        } catch {
          // Storage can be full or disabled; expansion still works for this view.
        }
        return next
      })
    },
    [storageKey]
  )

  return { expanded, toggle }
}

function PageRow({ node, parent, depth, stale }: { node: SitemapTreePage; parent: string; depth: number; stale: boolean }) {
  const router = useRouter()
  const { pageHref } = useTree()
  const href = pageHref(node.id)
  const label = node.isFolderIndex ? (node.path === "/" ? "Home page" : "This page") : relativeLabel(node.path, parent)
  return (
    <SmartSitemapRow
      aria-level={depth + 1}
      className={cn(stale && "opacity-60")}
      onActivate={() => router.push(href)}
      lead={
        <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: indentOf(depth) + TOGGLE_WIDTH }}>
          <FileText className="size-4 shrink-0 text-general-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
          <SmartSitemapPathTooltip path={node.path}>
            <Link
              href={href}
              className="flex min-w-0 items-baseline gap-2 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate text-sm text-general-foreground">{label}</span>
              {node.isFolderIndex ? (
                <span className="truncate text-xs text-general-muted-foreground">{decodePath(node.path)}</span>
              ) : null}
            </Link>
          </SmartSitemapPathTooltip>
        </div>
      }
      cells={SITEMAP_COLUMNS.map((column) => column.page(node))}
      trailing={<ChevronRight className="size-4" strokeWidth={1.5} />}
    />
  )
}

function FolderRow({ node, depth, stale }: { node: SitemapTreeFolder; depth: number; stale: boolean }) {
  const { expanded, toggle, filtered } = useTree()
  const open = expanded.has(node.path)
  const Icon = open ? FolderOpen : Folder
  const count = `${formatInteger(node.pageCount)} ${filtered ? "matching" : node.pageCount === 1 ? "page" : "pages"}`
  return (
    <>
      <SmartSitemapRow
        aria-level={depth + 1}
        className={cn(stale && "opacity-60")}
        onActivate={() => toggle(node.path)}
        lead={
          <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: indentOf(depth) }}>
            <button
              type="button"
              onClick={() => toggle(node.path)}
              aria-expanded={open}
              aria-label={`${open ? "Collapse" : "Expand"} ${decodePath(node.path)}`}
              className="-mr-1.5 flex size-6 shrink-0 items-center justify-center rounded-[4px] text-general-muted-foreground transition-colors hover:text-general-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} strokeWidth={1.5} />
            </button>
            <Icon className="size-4 shrink-0 text-general-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            <SmartSitemapPathTooltip
              path={node.path}
              details={[
                count,
                node.page ? "This folder is also a page" : null,
                node.indexing.indexedCount ? `${formatInteger(node.indexing.indexedCount)} indexed` : null,
              ]}
              action={open ? "Click to collapse" : "Click to show pages"}
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-sm font-medium text-general-foreground">{decodePath(node.label)}/</span>
                <span className="shrink-0 text-xs tabular-nums text-general-muted-foreground">{count}</span>
              </span>
            </SmartSitemapPathTooltip>
          </div>
        }
        cells={SITEMAP_COLUMNS.map((column) => column.folder(node))}
      />
      {open ? <FolderChildren parent={node.path} depth={depth + 1} /> : null}
    </>
  )
}

function FolderChildren({ parent, depth }: { parent: string; depth: number }) {
  const { businessId, params } = useTree()
  const query = useSmartSitemapTree(businessId, params, parent)
  return <TreeLevel query={query} parent={parent} depth={depth} />
}

function TreeLevel({ query, parent, depth }: { query: TreeQuery; parent: string; depth: number }) {
  const { filtered } = useTree()
  const nodes = useMemo(() => query.data?.pages.flatMap((page) => page.nodes) ?? [], [query.data])
  const total = query.data?.pages[0]?.total ?? 0
  const remaining = Math.max(0, total - nodes.length)
  const indent = indentOf(depth) + TOGGLE_WIDTH
  // Each level dims on its own while it refetches with new filters or sorting.
  const stale = query.isPlaceholderData

  if (!query.data) {
    if (query.isError) {
      return (
        <SmartSitemapMessageRow indent={indent}>
          <span className="text-general-muted-foreground">This folder could not be loaded.</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={() => query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Try again
          </Button>
        </SmartSitemapMessageRow>
      )
    }
    return <SmartSitemapSkeletonRows count={depth === 0 ? 12 : 3} indent={indent} />
  }

  if (!nodes.length) {
    // The root empty state is owned by the page; a folder can empty out after filters change.
    if (depth === 0) return null
    return (
      <SmartSitemapMessageRow indent={indent}>
        <span className="text-general-muted-foreground">
          {filtered ? "No pages in this folder match the filters." : "No pages in this folder."}
        </span>
      </SmartSitemapMessageRow>
    )
  }

  return (
    <>
      {nodes.map((node) =>
        node.type === "folder" ? (
          <FolderRow key={`folder:${node.path}`} node={node} depth={depth} stale={stale} />
        ) : (
          <PageRow key={`page:${node.id}`} node={node} parent={parent} depth={depth} stale={stale} />
        )
      )}
      {query.isFetchNextPageError ? (
        <SmartSitemapMessageRow indent={indent}>
          <span className="text-general-muted-foreground">More pages could not be loaded.</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </SmartSitemapMessageRow>
      ) : query.hasNextPage && remaining > 0 ? (
        <SmartSitemapMessageRow indent={indent}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-general-foreground"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage || stale}
          >
            {query.isFetchingNextPage ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Show {formatInteger(Math.min(SITEMAP_TREE_PAGE_SIZE, remaining))} more
          </Button>
          <span className="text-xs text-general-muted-foreground">{formatInteger(remaining)} remaining</span>
        </SmartSitemapMessageRow>
      ) : null}
    </>
  )
}

interface SmartSitemapTreeProps {
  businessId: string
  params: SmartSitemapQueryParams
  /** The root level, owned by the page so its status counts can feed the overview. */
  rootQuery: TreeQuery
  filtered: boolean
  sort: SitemapSortState
  onSort: (next: SitemapSortState) => void
  pageHref: (pageId: string) => string
}

export function SmartSitemapTree({ businessId, params, rootQuery, filtered, sort, onSort, pageHref }: SmartSitemapTreeProps) {
  const { expanded, toggle } = useExpandedFolders(businessId)
  const context = useMemo<TreeContextValue>(
    () => ({ businessId, params, filtered, expanded, toggle, pageHref }),
    [businessId, params, filtered, expanded, toggle, pageHref]
  )
  return (
    <TreeContext.Provider value={context}>
      <SmartSitemapTableShell
        label="Site pages tree"
        pathLabel="Folder or page"
        sort={sort}
        onSort={onSort}
      >
        <TreeLevel query={rootQuery} parent="/" depth={0} />
      </SmartSitemapTableShell>
    </TreeContext.Provider>
  )
}
