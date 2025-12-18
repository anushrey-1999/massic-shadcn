"use client"

import * as React from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, Loader2, MoveUp, MoveDown } from "lucide-react"

import { cn } from "@/lib/utils"

// Table wrapper component
const Table = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative w-full overflow-auto", className)}
      {...props}
    />
  )
})
Table.displayName = "Table"

// Table element
function TableElement({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  )
}

// Table header
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("bg-background [&_tr]:border-b", className)}
      {...props}
    />
  )
}

// Table body
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

// Table row
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border/40 bg-background transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

// Table head cell
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-12 py-1.5 px-2 text-left align-middle font-medium text-foreground bg-background [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

// Table cell
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("py-1.5 px-2 align-middle  [&:has([role=checkbox])]:pr-0 overflow-hidden", className)}
      {...props}
    />
  )
}

// Data table component using TanStack Table
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  className?: string
  onLoadMore?: () => void
  isLoading?: boolean
  hasMore?: boolean
  isInitialLoading?: boolean
}

function DataTable<TData, TValue>({
  columns,
  data,
  className,
  onLoadMore,
  isLoading = false,
  hasMore = false,
  isInitialLoading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const tableContainerRef = React.useRef<HTMLDivElement>(null)


  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })


  // Infinite scroll handler
  React.useEffect(() => {
    const container = tableContainerRef.current
    if (!container || !onLoadMore || !hasMore || isLoading) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Trigger when user is 200px from bottom
      if (scrollHeight - scrollTop - clientHeight < 200) {
        onLoadMore()
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => {
      container.removeEventListener("scroll", handleScroll)
    }
  }, [onLoadMore, hasMore, isLoading])

  return (
    <div className="relative">
      <div 
        ref={tableContainerRef} 
        className={cn("relative w-full overflow-auto", className)}
      >
        <TableElement>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortState = header.column.getIsSorted()
                  const headerContent = header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())

                  return (
                    <TableHead key={header.id}>
                      {canSort ? (
                        <button
                          onClick={() =>
                            header.column.toggleSorting(
                              header.column.getIsSorted() === "asc"
                            )
                          }
                          className="flex items-center gap-2  transition-opacity cursor-pointer"
                        >
                          {headerContent}
                          <div className="flex items-center">
                            <MoveUp
                              className={`h-4 w-3 ${
                                sortState === "asc"
                                  ? "text-black"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <MoveDown
                              className={`h-4 w-3 -ml-0.5 ${
                                sortState === "desc"
                                  ? "text-black"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </div>
                        </button>
                      ) : (
                        headerContent
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isInitialLoading && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              <>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Loading more...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </TableElement>
      </div>
    </div>
  )
}

export {
  Table,
  TableElement,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  DataTable,
  ArrowUpDown,
}
