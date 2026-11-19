import { flexRender, type Column, type Table as TanstackTable } from "@tanstack/react-table";
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
import { Skeleton } from "@/components/ui/skeleton";

// Helper function to get alignment class from column meta
// Always returns left alignment as per requirement
function getAlignmentClass(meta?: { align?: "left" | "center" | "right" }): string {
  return "text-left";
}

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  isFetching?: boolean;
  loadingRowCount?: number;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  selectedRowId?: string | null;
  highlightSelectedRow?: boolean; // Optional: highlight selected row (default true)
  showPagination?: boolean;
  hideRowsPerPage?: boolean;
  disableHorizontalScroll?: boolean;
  fitToWidth?: boolean;
  paginationAlign?: "left" | "right" | "between";
  toolbarPosition?: "beforeTable" | "belowHeader";
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  pageSizeOptions,
  isLoading = false,
  isFetching = false,
  loadingRowCount,
  emptyMessage = "No results found.",
  onRowClick,
  selectedRowId,
  showPagination = true,
  hideRowsPerPage = false,
  disableHorizontalScroll = false,
  fitToWidth = false,
  paginationAlign = "between",
  toolbarPosition = "beforeTable",
  highlightSelectedRow = true,
  ...props
}: DataTableProps<TData>) {
  const showLoading = isLoading && (loadingRowCount != null || table.getRowModel().rows.length === 0);
  const fitColumns = fitToWidth && !disableHorizontalScroll;
  const visibleColumns = table.getVisibleLeafColumns();
  const minTableWidth = fitColumns
    ? visibleColumns.reduce((width, column) => width + (column.columnDef.minSize ?? column.getSize()), 0)
    : 1000;

  const fittedColumnStyles = (column: Column<TData>): React.CSSProperties => ({
    ...getCommonPinningStyles({ column }),
    position: undefined,
    width: column.columnDef.minSize ?? column.getSize(),
    opacity: 1,
  });
  const fittedPinningClass = (column: Column<TData>) =>
    fitColumns && column.getIsPinned() && "relative @min-[20rem]:sticky";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col gap-2.5 overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Filters/Toolbar - Always visible, no scroll */}
      {children && toolbarPosition === "beforeTable" && (
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
          fitColumns && "@container",
          disableHorizontalScroll ? "overflow-x-hidden" : "overflow-x-auto"
        )}>
          <TableElement
            className={cn(
              "w-full",
              disableHorizontalScroll ? "table-auto max-w-full" : "table-fixed"
            )}
            style={disableHorizontalScroll ? {} : { minWidth: minTableWidth, tableLayout: "fixed" }}
          >
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortState = header.column.getIsSorted();

                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          getAlignmentClass(
                            header.column.columnDef.meta as
                            | { align?: "left" | "center" | "right" }
                            | undefined,
                          ),
                          canSort && "p-0",
                          sortState && "bg-accent",
                          fittedPinningClass(header.column),
                        )}
                        style={
                          fitColumns
                            ? fittedColumnStyles(header.column)
                            : disableHorizontalScroll
                            ? {
                              minWidth:
                                formatSizeValue(
                                  header.column.columnDef.minSize,
                                ) || header.getSize(),
                              maxWidth: formatSizeValue(
                                header.column.columnDef.maxSize,
                              ),
                              ...getCommonPinningStyles({
                                column: header.column,
                              }),
                            }
                            : {
                              width: header.getSize(),
                              minWidth: header.getSize(),
                              maxWidth:
                                formatSizeValue(
                                  header.column.columnDef.maxSize,
                                ) || header.getSize(),
                              ...getCommonPinningStyles({
                                column: header.column,
                              }),
                            }
                        }
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {children && toolbarPosition === "belowHeader" && (
                <TableRow data-toolbar-row="true">
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    data-toolbar-cell="true"
                    className="p-0"
                  >
                    {children}
                  </TableCell>
                </TableRow>
              )}
              {showLoading && loadingRowCount ? (
                Array.from({ length: loadingRowCount }, (_, index) => (
                  <TableRow key={index} aria-hidden>
                    {visibleColumns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn("h-11", fittedPinningClass(column))}
                        style={fitColumns ? fittedColumnStyles(column) : undefined}
                      >
                        <Skeleton className="h-4 w-3/4 max-w-40 motion-reduce:animate-none" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : showLoading ? (
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
                  const isSelected = selectedRowId != null && row.id === selectedRowId;
                  return (
                    <TableRow
                      key={row.id}
                      data-row-id={row.id}
                      data-selected-row={isSelected ? row.id : undefined}
                      className={cn(
                        "group",
                        onRowClick && "cursor-pointer hover:bg-muted/70",
                        highlightSelectedRow && isSelected && "bg-primary/10"
                      )}
                      onClick={(e) => {
                        // Prevent row click if a button or inside a button is clicked
                        if (
                          e.target instanceof HTMLElement &&
                          (e.target.closest('button') ||
                            e.target.closest('a') ||
                            e.target.closest('input') ||
                            e.target.closest('[role="combobox"]') ||
                            e.target.tagName === 'BUTTON' ||
                            e.target.tagName === 'A')
                        ) {
                          return;
                        }
                        onRowClick?.(row.original);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "overflow-hidden",
                            fittedPinningClass(cell.column),
                            getAlignmentClass(cell.column.columnDef.meta as { align?: "left" | "center" | "right" } | undefined)
                          )}
                          style={fitColumns ? fittedColumnStyles(cell.column) : disableHorizontalScroll ? {
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
