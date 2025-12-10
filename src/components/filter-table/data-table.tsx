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
import { getCommonPinningStyles } from "../../utils/data-table-utils";
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
  isLoading?: boolean; // Show skeleton rows when loading on first page
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  pageSizeOptions,
  isLoading = false,
  ...props
}: DataTableProps<TData>) {
  const showLoading = isLoading && table.getRowModel().rows.length === 0;
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col gap-2.5",
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
        <div className="h-full w-full overflow-y-auto overflow-x-hidden">
          <TableElement className="w-full table-fixed" style={{ tableLayout: 'fixed' }}>
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        "bg-background",
                        getAlignmentClass(header.column.columnDef.meta as { align?: "left" | "center" | "right" } | undefined)
                      )}
                      style={{
                        width: header.getSize(),
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
                // Show spinner when loading on first page
                <TableRow>
                  <TableCell
                    colSpan={table.getAllColumns().length}
                    className="h-64 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "overflow-hidden",
                          getAlignmentClass(cell.column.columnDef.meta as { align?: "left" | "center" | "right" } | undefined)
                        )}
                        style={{
                          width: cell.column.getSize(),
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
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getAllColumns().length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No tasks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </TableElement>
        </div>
      </div>
      
      {/* Pagination - Always visible, no scroll */}
      <div className="shrink-0 flex flex-col gap-2.5">
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}
