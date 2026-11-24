import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatInteger } from "@/lib/smart-sitemap"

interface SmartSitemapPaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  pageSizeOptions: readonly number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  disabled?: boolean
}

/** Same layout as the shared data-table pagination: rows per page on the left, page controls on the right. */
export function SmartSitemapPagination({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: SmartSitemapPaginationProps) {
  if (!total) return null
  const canPrevious = !disabled && page > 1
  const canNext = !disabled && page < totalPages

  return (
    <div className="flex w-full flex-col gap-4 p-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex shrink-0 items-center space-x-2">
        <p className="whitespace-nowrap text-xs font-medium">Rows per page</p>
        <Select value={`${pageSize}`} onValueChange={(value) => onPageSizeChange(Number(value))} disabled={disabled}>
          <SelectTrigger size="sm" className="bg-white text-xs" aria-label="Rows per page">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={`${option}`} className="text-xs">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex shrink-0 items-center whitespace-nowrap text-xs font-medium">
          Page {formatInteger(page)} of {formatInteger(Math.max(totalPages, 1))}
          <span className="ml-1.5 font-normal text-general-muted-foreground">({formatInteger(total)} pages)</span>
        </div>
        <nav aria-label="Pagination" className="flex items-center space-x-2">
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => onPageChange(1)}
            disabled={!canPrevious}
          >
            <ChevronsLeft />
          </Button>
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrevious}
          >
            <ChevronLeft />
          </Button>
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
          >
            <ChevronRight />
          </Button>
          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
          >
            <ChevronsRight />
          </Button>
        </nav>
      </div>
    </div>
  )
}
