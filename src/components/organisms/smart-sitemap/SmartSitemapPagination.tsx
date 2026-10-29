import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatInteger } from "@/lib/smart-sitemap"

interface SmartSitemapPaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

/** Current page, first, last and neighbours; gaps collapse to an ellipsis. */
function visiblePages(page: number, totalPages: number): Array<number | "gap"> {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b)
  return sorted.flatMap((value, index) =>
    index > 0 && value - sorted[index - 1] > 1 ? (["gap", value] as const) : [value]
  )
}

export function SmartSitemapPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  disabled = false,
}: SmartSitemapPaginationProps) {
  if (!total) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-general-muted-foreground">
        Showing {formatInteger(first)}–{formatInteger(last)} of {formatInteger(total)} pages
      </p>
      {totalPages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2.5"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          {visiblePages(page, totalPages).map((value, index) =>
            value === "gap" ? (
              <span key={`gap-${index}`} className="px-1 text-xs text-general-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={value}
                variant={value === page ? "secondary" : "ghost"}
                size="sm"
                aria-current={value === page ? "page" : undefined}
                className={cn("h-8 min-w-8 px-2 tabular-nums", value === page && "bg-general-border")}
                disabled={disabled && value !== page}
                onClick={() => value !== page && onPageChange(value)}
              >
                {value}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2.5"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      ) : null}
    </div>
  )
}
