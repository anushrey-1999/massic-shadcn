"use client"

import { cn } from "@/lib/utils"
import { ArrowRight, ChevronDown, ChevronUp, ChevronsUpDown, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { StatsBadge } from "./StatsBadge"
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
  cellSize = "md",
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
    const isActive = sortConfig?.column === columnKey;
    const isDesc = sortConfig?.direction === "desc";
    return (
      <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center align-middle">
        {!isActive && (
          <ChevronsUpDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-opacity duration-200 ease-in-out opacity-0 group-hover:opacity-80"
            )}
          />
        )}
        {isActive && !isDesc && (
          <ChevronUp
            className={cn(
              "h-3.5 w-3.5 text-foreground transition-opacity duration-200 ease-in-out opacity-100"
            )}
          />
        )}
        {isActive && isDesc && (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-foreground transition-opacity duration-200 ease-in-out opacity-100"
            )}
          />
        )}
      </span>
    );
  }

  const cellStyles = {
    sm: {
      header: "h-[33px] p-2",
      cell: "h-10 max-h-10 p-2",
      text: "text-xs",
      truncate: "max-w-[250px]",
      badge: "text-[10px]",
    },
    md: {
      header: "h-11 p-2",
      cell: "h-11 p-2",
      text: "text-sm",
      truncate: "max-w-[380px]",
      badge: "text-[11px]",
    },
  }

  const styles = cellStyles[cellSize]

  const isThreeColumnLayout = columns.length === 3
  const firstColumnWidth = cellSize === "sm" ? "w-[28rem]" : "min-w-[30rem]"
  const otherColumnWidth = cellSize === "sm" ? "w-24" : "w-32"
  const firstColumnTruncate = cellSize === "sm" ? "max-w-[15rem]" : "max-w-[28rem]"

  const tableContent = (
    <>
      {isLoading ? (
        <div className={cn("flex items-center justify-center rounded-lg", variant === "card" ? "h-[200px]" : "h-full min-h-[300px]")}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData || data.length === 0 ? (
        <div className={cn("flex items-center justify-center rounded-lg text-muted-foreground text-sm", variant === "card" ? "h-[200px]" : "h-full min-h-[300px]")}>
          No data available
        </div>
      ) : (
        <div
          className={cn(
            "border-b border-general-border ",
            stickyHeader && maxHeight ? "overflow-auto" : "overflow-hidden",
          )}
          style={stickyHeader && maxHeight ? { maxHeight } : undefined}
        >
          <Table className={stickyHeader ? "overflow-visible" : undefined}>
            <TableElement>
              <TableHeader className="bg-foreground-light">
                <TableRow className="bg-foreground-light hover:bg-transparent">
                  {columns.map((col, index) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "group",
                        sortConfig?.column === col.key ? "bg-general-primary-foreground" : "bg-foreground-light",
                        stickyHeader && "sticky top-0 z-10",
                        styles.header,
                        isThreeColumnLayout && !col.width && (index === 0 ? firstColumnWidth : otherColumnWidth),
                        col.width
                      )}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className={cn(
                            "flex h-full w-full items-center justify-start text-left transition-colors",
                            "hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            sortConfig?.column === col.key && "bg-general-primary-foreground hover:bg-general-primary-foreground"
                          )}
                        >
                          <span className="inline-flex min-w-0 items-center justify-start gap-1.5">
                            <span
                              className={cn(
                                "min-w-0 truncate font-medium leading-none tracking-wide text-general-muted-foreground",
                                  cellSize === "md" ? "text-xs font-semibold" : "text-xs",
                                sortConfig?.column === col.key && "text-foreground"
                              )}
                            >
                              {col.label}
                            </span>
                            <span
                              className={cn(
                                "inline-flex shrink-0 items-center justify-center"
                              )}
                            >
                              {getSortIcon(col.key)}
                            </span>
                          </span>
                        </button>
                      ) : (
                        <div className="flex w-full items-center justify-start gap-1">
                          <span
                            className={cn(
                              "font-medium tracking-wide text-general-muted-foreground",
                              cellSize === "md" ? "text-xs font-semibold" : "text-xs"
                            )}
                          >
                            {col.label}
                          </span>
                        </div>
                      )}
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
                    {columns.map((col, colIndex) => {
                      const cellValue = row[col.key]
                      const isObject = typeof cellValue === "object" && cellValue !== null
                      const displayValue = isObject
                        ? String((cellValue as { value: string | number }).value)
                        : String(cellValue)

                      const truncateClass =
                        isThreeColumnLayout && colIndex === 0
                          ? firstColumnTruncate
                          : styles.truncate

                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            styles.cell,
                            isThreeColumnLayout && !col.width && (colIndex === 0 ? firstColumnWidth : otherColumnWidth)
                          )}
                        >
                          {isObject ? (
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(styles.text, "text-foreground truncate block cursor-default", truncateClass)}>
                                    {(cellValue as { value: string | number }).value}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {(cellValue as { value: string | number }).value}
                                </TooltipContent>
                              </Tooltip>
                              {(cellValue as { change?: number }).change !== undefined && (
                                <StatsBadge value={(cellValue as { change: number }).change} className={styles.badge} />
                              )}
                            </div>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(styles.text, "text-foreground truncate block cursor-default", truncateClass)}>
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
    <Card className={cn("p-0 shadow-none border border-general-border rounded-lg flex flex-col gap-0", className)}>
      <CardHeader className="p-0 gap-0">
        <div className="flex items-center justify-between p-2 border-b border-general-border-four">
          <div className="flex items-center gap-1 ">
            {title && <CardTitle className="text-base font-medium text-general-secondary-foreground">{title}</CardTitle>}
          </div>
          {showTabs && tabs && (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="h-auto p-0.5 bg-primary-foreground">
                {tabs.map((tab, index) => (
                  <TabsTrigger
                    key={index}
                    value={tab.value || `tab-${index}`}
                    className="px-1.5 py-0.5 cursor-pointer"
                  >
                    {tab.icon && <span className="text-[#525252]">{tab.icon}</span>}
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
        <CardFooter className="justify-end px-2 py-1.5">
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
