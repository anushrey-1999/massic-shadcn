"use client"

import { Download, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { useState, useMemo, useEffect } from "react"
import { DataTable, type DataTableColumn, type DataTableRow, type SortConfig } from "./DataTable"

interface DataTableTab {
  label?: string
  icon?: React.ReactNode
  value?: string
}

interface DataTableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: DataTableColumn[]
  data: DataTableRow[]
  title?: string
  icon?: React.ReactNode
  tabs?: DataTableTab[]
  activeTab?: string
  onTabChange?: (value: string) => void
  sortConfig?: SortConfig
  onSort?: (column: string) => void
  isLoading?: boolean
}

const ROW_LIMITS = [25, 50, 100] as const

export function DataTableModal({
  open,
  onOpenChange,
  columns,
  data,
  title,
  icon,
  tabs,
  activeTab,
  onTabChange,
  sortConfig,
  onSort,
  isLoading = false,
}: DataTableModalProps) {
  const [rowsPerPage, setRowsPerPage] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = useMemo(() => Math.ceil(data.length / rowsPerPage), [data.length, rowsPerPage])

  const displayData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    return data.slice(startIndex, endIndex)
  }, [data, currentPage, rowsPerPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [rowsPerPage, data.length, activeTab])

  const handleTabChange = (value: string) => {
    onTabChange?.(value)
  }

  const handleExportCSV = () => {
    const csvRows = [
      columns.map(col => col.label),
      ...displayData.map(row =>
        columns.map(col => {
          const cellValue = row[col.key]
          if (typeof cellValue === "object" && cellValue !== null) {
            return String((cellValue as { value: string | number }).value)
          }
          return String(cellValue)
        })
      )
    ]
    const csvContent = csvRows.map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${title?.toLowerCase().replace(/\s+/g, "_") || "data"}_export.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[85vw] min-w-[800px] max-h-[85vh] flex flex-col p-0 gap-0"
        showCloseButton={false}
      >
        <DialogHeader className="px-4 py-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0 shrink">
              {/* {icon && <span className="text-muted-foreground shrink-0">{icon}</span>} */}
              <DialogTitle className="text-lg font-semibold truncate max-w-[300px]">{title}</DialogTitle>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {tabs && tabs.length > 0 && (
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <TabsList className="h-auto p-0.5">
                    {tabs.map((tab, index) => (
                      <TabsTrigger
                        key={index}
                        value={tab.value || `tab-${index}`}
                        className="min-h-6 min-w-6 px-2 py-1 cursor-pointer"
                      >
                        {tab.icon && <span>{tab.icon}</span>}
                        {/* {tab.label && <span className="ml-1 text-xs">{tab.label}</span>} */}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="text-xs">Export</span>
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <DataTable
            columns={columns}
            data={displayData}
            isLoading={isLoading}
            hasData={data.length > 0}
            sortConfig={sortConfig}
            onSort={onSort}
            variant="standalone"
            stickyHeader
            maxHeight="calc(85vh - 180px)"
            cellSize="md"
          />
        </div>

        <div className="px-4 py-3 border-t shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-black">Rows per page</span>
            <Select
              value={String(rowsPerPage)}
              onValueChange={(value) => setRowsPerPage(Number(value))}
            >
              <SelectTrigger className="!h-8 text-xs">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {ROW_LIMITS.map((limit) => (
                  <SelectItem key={limit} value={String(limit)} className="text-xs">
                    {limit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-4">
              <span className="font-medium text-black">Page {currentPage} of {totalPages}</span>

              <div className="flex gap-2">
                <button
                  className="size-8 rounded-md border border-input bg-transparent flex items-center justify-center disabled:opacity-50"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                  type="button"
                >
                  <span className="sr-only">First</span>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.53 13.28a.75.75 0 0 1-1.06 0L7.25 9.06a.75.75 0 0 1 0-1.06l4.22-4.22a.75.75 0 1 1 1.06 1.06L9.31 8.53l3.22 3.22a.75.75 0 0 1 0 1.06z" fill="currentColor"/><path d="M8.53 13.28a.75.75 0 0 1-1.06 0L3.25 9.06a.75.75 0 0 1 0-1.06l4.22-4.22a.75.75 0 1 1 1.06 1.06L5.31 8.53l3.22 3.22a.75.75 0 0 1 0 1.06z" fill="currentColor"/></svg>
                </button>
                <button
                  className="size-8 rounded-md border border-input bg-transparent flex items-center justify-center disabled:opacity-50"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  type="button"
                >
                  <span className="sr-only">Previous</span>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.53 13.28a.75.75 0 0 1-1.06 0L6.25 9.06a.75.75 0 0 1 0-1.06l4.22-4.22a.75.75 0 1 1 1.06 1.06L8.31 8.53l3.22 3.22a.75.75 0 0 1 0 1.06z" fill="currentColor"/></svg>
                </button>
                <button
                  className="size-8 rounded-md border border-input bg-transparent flex items-center justify-center disabled:opacity-50"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  type="button"
                >
                  <span className="sr-only">Next</span>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.47 4.72a.75.75 0 0 1 1.06 0l4.22 4.22a.75.75 0 0 1 0 1.06l-4.22 4.22a.75.75 0 1 1-1.06-1.06l3.22-3.22-3.22-3.22a.75.75 0 0 1 0-1.06z" fill="currentColor"/></svg>
                </button>
                <button
                  className="size-8 rounded-md border border-input bg-transparent flex items-center justify-center disabled:opacity-50"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                  type="button"
                >
                  <span className="sr-only">Last</span>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.47 4.72a.75.75 0 0 1 1.06 0l4.22 4.22a.75.75 0 0 1 0 1.06l-4.22 4.22a.75.75 0 1 1-1.06-1.06l3.22-3.22-3.22-3.22a.75.75 0 0 1 0-1.06z" fill="currentColor"/><path d="M9.47 4.72a.75.75 0 0 1 1.06 0l4.22 4.22a.75.75 0 0 1 0 1.06l-4.22 4.22a.75.75 0 1 1-1.06-1.06l3.22-3.22-3.22-3.22a.75.75 0 0 1 0-1.06z" fill="currentColor"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
