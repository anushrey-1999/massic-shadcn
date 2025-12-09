"use client"

import { cn } from "@/lib/utils"
import { ArrowRight, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import {
  Table,
  TableElement,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

export interface DataTableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
}

export interface DataTableRow {
  [key: string]: string | number | { value: string | number; change?: number }
}

export interface DataTableTab {
  label?: string
  icon?: React.ReactNode
  active?: boolean
  value?: string
}

export interface SortConfig {
  column: string
  direction: "asc" | "desc"
}

interface DataTableProps {
  columns: DataTableColumn[]
  data: DataTableRow[]
  icon?: React.ReactNode
  title?: string
  showTabs?: boolean
  tabs?: DataTableTab[]
  className?: string
  isLoading?: boolean
  hasData?: boolean
  activeTab?: string
  onTabChange?: (value: string) => void
  sortConfig?: SortConfig
  onSort?: (column: string) => void
  onArrowClick?: () => void
  maxRows?: number
  variant?: "card" | "standalone"
  stickyHeader?: boolean
  maxHeight?: string
  cellSize?: "sm" | "md"
}

export function DataTable({
  columns,
  data,
  icon,
  title,
  showTabs,
  tabs,
  className,
  isLoading = false,
  hasData = true,
  activeTab: controlledActiveTab,
  onTabChange,
  sortConfig,
  onSort,
  onArrowClick,
  maxRows,
  variant = "card",
  stickyHeader = false,
  maxHeight,
  cellSize = "sm",
}: DataTableProps) {
  const activeTab = controlledActiveTab || tabs?.find((t) => t.active)?.value || tabs?.[0]?.value || "tab-0"
  const displayData = maxRows ? data.slice(0, maxRows) : data

  const handleTabChange = (value: string) => {
    onTabChange?.(value)
  }

  const handleSort = (columnKey: string) => {
    onSort?.(columnKey)
  }

  const getSortIcon = (columnKey: string) => {
    const isActive = sortConfig?.column === columnKey
    const isDesc = sortConfig?.direction === "desc"

    return (
      <span className="relative inline-flex items-center justify-center w-4 h-4">
        <ArrowUp
          className={cn(
            "h-4 w-4 absolute transition-all duration-200 ease-in-out",
            isActive && !isDesc ? "opacity-100 text-foreground" : "opacity-0"
          )}
        />
        <ArrowDown
          className={cn(
            "h-4 w-4 absolute transition-all duration-200 ease-in-out",
            isActive && isDesc ? "opacity-100 text-foreground" : "opacity-0"
          )}
        />
        <ArrowUpDown
          className={cn(
            "h-4 w-4 absolute transition-all duration-200 ease-in-out",
            !isActive ? "opacity-50 text-muted-foreground" : "opacity-0"
          )}
        />
      </span>
    )
  }

  const cellStyles = {
    sm: {
      header: "h-[33px] px-2 py-[7.5px]",
      cell: "h-10 max-h-10 px-2 py-1",
      text: "text-xs",
      truncate: "max-w-[150px]",
      badge: "text-[10px]",
    },
    md: {
      header: "h-11 px-4 py-2",
      cell: "h-11 px-4 py-2",
      text: "text-sm",
      truncate: "max-w-[280px]",
      badge: "text-[11px]",
    },
  }

  const styles = cellStyles[cellSize]

  const tableContent = (
    <>
      {isLoading ? (
        <div className={cn("flex items-center justify-center border rounded-lg", variant === "card" ? "h-[200px]" : "h-full min-h-[300px]")}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData || data.length === 0 ? (
        <div className={cn("flex items-center justify-center border rounded-lg text-muted-foreground text-sm", variant === "card" ? "h-[200px]" : "h-full min-h-[300px]")}>
          No data available
        </div>
      ) : (
        <div
          className={cn(
            "rounded-lg border",
            stickyHeader && maxHeight ? "overflow-auto" : "overflow-hidden",
          )}
          style={stickyHeader && maxHeight ? { maxHeight } : undefined}
        >
          <Table className={stickyHeader ? "overflow-visible" : undefined}>
            <TableElement>
              <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-muted [&_tr]:border-b")}>
                <TableRow className="hover:bg-transparent">
                  {columns.map((col, index) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        styles.header,
                        col.width,
                        index === 0 && (cellSize === "sm" ? "w-60" : "min-w-[300px]")
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-2 transition-colors duration-150",
                          col.sortable && "cursor-pointer hover:text-foreground select-none"
                        )}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <span className={cn(
                          "font-medium tracking-wide text-muted-foreground",
                          cellSize === "md" ? "text-xs font-semibold uppercase" : "text-xs"
                        )}>
                          {col.label}
                        </span>
                        {col.sortable && getSortIcon(col.key)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    className={cn(
                      cellSize === "sm" ? "h-10 max-h-10" : "h-11 border-b border-border/40 transition-colors hover:bg-muted/30"
                    )}
                  >
                    {columns.map((col) => {
                      const cellValue = row[col.key]
                      const isObject = typeof cellValue === "object" && cellValue !== null
                      const displayValue = isObject
                        ? String((cellValue as { value: string | number }).value)
                        : String(cellValue)
                      return (
                        <TableCell key={col.key} className={styles.cell}>
                          {isObject ? (
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(styles.text, "text-foreground truncate block cursor-default", styles.truncate)}>
                                    {(cellValue as { value: string | number }).value}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {(cellValue as { value: string | number }).value}
                                </TooltipContent>
                              </Tooltip>
                              {(cellValue as { change?: number }).change !== undefined && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "gap-1 rounded-lg border-0 px-1.5 py-0.5 font-medium shrink-0",
                                    styles.badge,
                                    (cellValue as { change: number }).change > 0 && "bg-green-50 text-green-600",
                                    (cellValue as { change: number }).change < 0 && "bg-red-50 text-red-600"
                                  )}
                                >
                                  {(cellValue as { change: number }).change > 0 ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (cellValue as { change: number }).change < 0 ? (
                                    <TrendingDown className="h-3 w-3" />
                                  ) : null}
                                  {Math.abs((cellValue as { change: number }).change)}%
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(styles.text, "text-foreground truncate block cursor-default", styles.truncate)}>
                                  {cellValue}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {displayValue}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </TableElement>
          </Table>
        </div>
      )}
    </>
  )

  if (variant === "standalone") {
    return <div className={className}>{tableContent}</div>
  }

  return (
    <Card className={cn("gap-2.5 p-3 shadow-none", className)}>
      <CardHeader className="p-0 gap-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {icon && <span className="text-muted-foreground w-[26px]">{icon}</span>}
            {title && <CardTitle className="text-base font-medium">{title}</CardTitle>}
          </div>
          {showTabs && tabs && (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="h-auto p-0.5">
                {tabs.map((tab, index) => (
                  <TabsTrigger
                    key={index}
                    value={tab.value || `tab-${index}`}
                    className="min-h-5 min-w-5 px-1.5 py-0.5 cursor-pointer"
                  >
                    {tab.icon && <span>{tab.icon}</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {tableContent}
      </CardContent>

      {onArrowClick && (
        <CardFooter className="justify-end p-0 pt-1">
          <Button
            size="icon-sm"
            variant="secondary"
            className="rounded-lg cursor-pointer"
            onClick={onArrowClick}
          >
            <ArrowRight className="h-3 w-3 text-foreground" />
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
