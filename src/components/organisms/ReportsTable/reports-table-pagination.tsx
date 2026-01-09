import * as React from "react";
import type { Table } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function buildPaginationRange(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Figma shows: 1 2 3 … Next
  // Keep it simple but still usable:
  // - Always show 1
  // - Show current +/- 1 when not near the start
  // - Always show last
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  const nearStart = page <= 3;
  if (nearStart) {
    pages.add(2);
    pages.add(3);
  } else {
    pages.add(page - 1);
    pages.add(page);
    pages.add(page + 1);
  }

  const out = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  return out;
}

export function ReportsTablePagination<TData>({
  table,
  pageSizeOptions = [10, 24, 50, 100],
  className,
}: {
  table: Table<TData>;
  pageSizeOptions?: number[];
  className?: string;
}) {
  const pageIndex = table.getState().pagination.pageIndex;
  const page = pageIndex + 1;
  const totalPages = table.getPageCount();

  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  const range = React.useMemo(
    () => buildPaginationRange(page, totalPages),
    [page, totalPages]
  );

  const showLeadingEllipsis = range.length > 0 && range[0] !== 1 && !range.includes(2);
  const showTrailingEllipsis =
    range.length > 0 && range[range.length - 1] !== totalPages && !range.includes(totalPages - 1);

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-4",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <p className="whitespace-nowrap text-xs text-muted-foreground">Rows per page</p>
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger size="sm" className="h-9 gap-2">
            <SelectValue placeholder={table.getState().pagination.pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizeOptions.map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs">
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent className="gap-1">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              className={cn(!canPrev && "pointer-events-none opacity-50")}
              onClick={(e) => {
                e.preventDefault();
                if (!canPrev) return;
                table.previousPage();
              }}
            />
          </PaginationItem>

          {totalPages > 0 ? (
            <>
              {showLeadingEllipsis ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : null}

              {range.map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      table.setPageIndex(p - 1);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}

              {showTrailingEllipsis ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : null}
            </>
          ) : null}

          <PaginationItem>
            <PaginationNext
              href="#"
              className={cn(!canNext && "pointer-events-none opacity-50")}
              onClick={(e) => {
                e.preventDefault();
                if (!canNext) return;
                table.nextPage();
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* keep footer height consistent when table has 0 pages */}
      {totalPages === 0 ? (
        <Button className="sr-only" />
      ) : null}
    </div>
  );
}
