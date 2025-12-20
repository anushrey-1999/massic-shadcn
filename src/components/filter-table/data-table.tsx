import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import * as React from "react";

import { DataTablePagination } from "./data-table-pagination";
import {
  TableElement,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { getCommonPinningStyles, formatSizeValue } from "../../utils/data-table-utils";
import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";

// Helper function to get alignment class from column meta
function getAlignmentClass(meta?: { align?: "left" | "center" | "right" }): string {
  const align = meta?.align;
  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    case "left":
    default:
      return "text-left";
  }
}

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  isFetching?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  selectedRowId?: string | null;
  showPagination?: boolean;
  hideRowsPerPage?: boolean;
  disableHorizontalScroll?: boolean;
  paginationAlign?: "left" | "right" | "between";
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  pageSizeOptions,
  isLoading = false,
  isFetching = false,
  emptyMessage = "No results found.",
  onRowClick,
  selectedRowId,
  showPagination = true,
  hideRowsPerPage = false,
  disableHorizontalScroll = false,
  paginationAlign = "between",
  ...props
}: DataTableProps<TData>) {
  const showLoading = isLoading && table.getRowModel().rows.length === 0;
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col gap-2.5 overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Filters/Toolbar - Always visible, no scroll */}
      {children && (
        <div className="shrink-0">
          {children}
        </div>
      )}

      {/* Table container - Scrollable with max-height, no horizontal scroll */}
      <div className="relative flex-1 min-h-0 rounded-md border overflow-hidden">
        {isFetching && !showLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          </div>
        )}
        <div className={cn(
          "h-full w-full overflow-y-auto",
          disableHorizontalScroll ? "overflow-x-hidden" : "overflow-x-auto"
        )}>
          <TableElement 
            className={cn(
              "w-full",
              disableHorizontalScroll ? "table-auto max-w-full" : "table-fixed"
            )} 
            style={disableHorizontalScroll ? {} : { minWidth: "1000px", tableLayout: "fixed" }}
          >
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        "",
                        getAlignmentClass(header.column.columnDef.meta as { align?: "left" | "center" | "right" } | undefined)
                      )}
                      style={disableHorizontalScroll ? {
                        minWidth: formatSizeValue(header.column.columnDef.minSize) || header.getSize(),
                        maxWidth: formatSizeValue(header.column.columnDef.maxSize),
                        ...getCommonPinningStyles({ column: header.column }),
                      } : {
                        width: header.getSize(),
                        minWidth: header.getSize(),
                        maxWidth: formatSizeValue(header.column.columnDef.maxSize) || header.getSize(),
                        ...getCommonPinningStyles({ column: header.column }),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {showLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-64 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const isSelected = selectedRowId ? row.id === selectedRowId : row.getIsSelected();
                  return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected && "selected"}
                    className={cn(
                      onRowClick && "cursor-pointer hover:bg-muted/70",
                      isSelected && "bg-muted"
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "overflow-hidden",
                          getAlignmentClass(cell.column.columnDef.meta as { align?: "left" | "center" | "right" } | undefined)
                        )}
                        style={disableHorizontalScroll ? {
                          minWidth: formatSizeValue(cell.column.columnDef.minSize) || cell.column.getSize(),
                          maxWidth: formatSizeValue(cell.column.columnDef.maxSize),
                          ...getCommonPinningStyles({ column: cell.column }),
                        } : {
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                          maxWidth: formatSizeValue(cell.column.columnDef.maxSize) || cell.column.getSize(),
                          ...getCommonPinningStyles({ column: cell.column }),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </TableElement>
        </div>
      </div>

      {/* Pagination - Always visible, no scroll */}
      {showPagination && (
        <div className="shrink-0 flex flex-col gap-2.5">
          <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} hideRowsPerPage={hideRowsPerPage} align={paginationAlign} />
          {actionBar &&
            table.getFilteredSelectedRowModel().rows.length > 0 &&
            actionBar}
        </div>
      )}
    </div>
  );
}
