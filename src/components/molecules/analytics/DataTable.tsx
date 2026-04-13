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
  tooltipLabel?: string
}

export interface DataTableMetricCell {
  value: string | number
  change?: number
  rawValue?: number
  previousValue?: number
}

export interface DataTableRow {
  [key: string]: string | number | DataTableMetricCell
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
  onRowClick?: (row: DataTableRow) => void
  maxRows?: number
  variant?: "card" | "standalone"
  stickyHeader?: boolean
  maxHeight?: string
  cellSize?: "sm" | "md"
  firstColumnTruncate?: string
  titleTooltip?: string
  inlineHeader?: boolean
  fillHeight?: boolean
  dynamicFirstColumn?: boolean
  emptyState?: React.ReactNode
  renderFirstColumn?: (row: DataTableRow, value: string) => React.ReactNode
}

const METRIC_LABEL_OVERRIDES: Record<string, string> = {
  "Impr.": "Impressions",
}

function resolveMetricLabel(column: DataTableColumn): string {
  return column.tooltipLabel || METRIC_LABEL_OVERRIDES[column.label] || column.label
}

function formatTrendTooltipNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  if (Number.isInteger(value)) return value.toLocaleString()
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function parseAbbreviatedNumber(value: string): number | null {
  const trimmed = value.trim()
  const match = /^(-?\d+(?:\.\d+)?)\s*([KMB])$/i.exec(trimmed)
  if (!match) return null

  const numeric = Number(match[1])
  if (!Number.isFinite(numeric)) return null

  const suffix = match[2].toUpperCase()
  const multiplier =
    suffix === "K" ? 1_000 :
    suffix === "M" ? 1_000_000 :
    suffix === "B" ? 1_000_000_000 :
    1

  return numeric * multiplier
}

function formatFullNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  if (Number.isInteger(value)) return value.toLocaleString()
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function getValueTooltipContent(
  value: string | number,
  rawValue?: number
): string {
  if (rawValue !== undefined && Number.isFinite(rawValue)) {
    return formatFullNumber(rawValue)
  }

  if (typeof value === "number") {
    return formatFullNumber(value)
  }

  const parsed = parseAbbreviatedNumber(value)
  if (parsed !== null) {
    return formatFullNumber(parsed)
  }

  return String(value)
}

function getTrendTooltipContent(
  cell: DataTableMetricCell,
  column: DataTableColumn
): {
  previousValue: number
  deltaValue: number
  metricLabel: string
} | null {
  if (cell.change === undefined) return null
  if (cell.rawValue === undefined || cell.previousValue === undefined) return null

  return {
    previousValue: cell.previousValue,
    deltaValue: cell.rawValue - cell.previousValue,
    metricLabel: resolveMetricLabel(column),
  }
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
  onRowClick,
  maxRows,
  variant = "card",
  stickyHeader = false,
  maxHeight,
  cellSize = "md",
  firstColumnTruncate,
  titleTooltip,
  inlineHeader = false,
  fillHeight = false,
  dynamicFirstColumn = false,
  emptyState,
  renderFirstColumn,
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
      header: "h-[32px] max-h-[32px] py-1.5 px-2",
      cell: "h-[32px] max-h-[32px] py-1.5 px-2",
      text: "text-xs",
      truncate: "max-w-[250px]",
      badge: "text-[10px]",
    },
    md: {
      header: "h-[32px] max-h-[32px] py-1.5 px-2",
      cell: "h-[32px] max-h-[32px] py-1.5 px-2",
      text: "text-xs",
      truncate: "max-w-[380px]",
      badge: "text-[11px]",
    },
  }

  const styles = cellStyles[cellSize]

  const isThreeColumnLayout = columns.length === 3
  const firstColumnWidth = cellSize === "sm" ? "w-[28rem]" : "min-w-[30rem]"
  const otherColumnWidth = cellSize === "sm" ? "w-24" : "w-32"
  const defaultFirstColumnTruncate = cellSize === "sm" ? "max-w-[15rem]" : "max-w-[28rem]"
  const resolvedFirstColumnTruncate = firstColumnTruncate ?? defaultFirstColumnTruncate
  const dynamicFirstColumnWidth =
    columns.length >= 5
      ? "w-[38%]"
      : columns.length === 4
        ? "w-[46%]"
        : columns.length === 3
          ? "w-[55%]"
          : "w-[60%]"
  const dynamicMetricColumnWidth =
    columns.length >= 5
      ? "w-[15.5%]"
      : columns.length === 4
        ? "w-[18%]"
        : columns.length === 3
          ? "w-[22.5%]"
          : "w-auto"

  const tableContent = (
    <>
      {isLoading ? (
        <div className={cn("flex items-center justify-center rounded-lg", variant === "card" ? "h-[200px]" : "h-full min-h-[300px]")}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData || data.length === 0 ? (
        <div className={cn("flex items-center justify-center rounded-lg text-muted-foreground text-sm", variant === "card" ? "h-[200px]" : "h-full min-h-[300px]")}>
          {emptyState || "No data available"}
        </div>
      ) : (
        <div
          className={cn(
            "border-b border-general-border ",
            stickyHeader && maxHeight ? "overflow-auto" : "overflow-hidden",
          )}
          style={stickyHeader && maxHeight ? { maxHeight } : undefined}
        >
          <Table className={cn(stickyHeader ? "overflow-visible" : undefined)}>
            <TableElement className={cn(dynamicFirstColumn && "table-fixed")}>
              <TableHeader className="bg-white">
                <TableRow className="bg-white hover:bg-transparent border-b border-[#A3A3A3]">
                  {columns.map((col, index) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "group transition-colors",
                        sortConfig?.column === col.key ? "bg-foreground-light hover:bg-muted" : "bg-white hover:bg-foreground-light",
                        inlineHeader && index === 0 && "hover:bg-white",
                        stickyHeader && "sticky top-0 z-10",
                        styles.header,
                        dynamicFirstColumn &&
                          (index === 0
                            ? dynamicFirstColumnWidth
                            : dynamicMetricColumnWidth),
                        isThreeColumnLayout && !col.width && (index === 0 ? firstColumnWidth : otherColumnWidth),
                        !dynamicFirstColumn && col.width
                      )}
                    >
                      {inlineHeader && index === 0 ? (
                        <div className="flex h-full w-full items-center justify-start gap-2">
                          {title && (
                            titleTooltip ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help text-[14px] font-medium text-general-secondary-foreground shrink-0">
                                    {title}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{titleTooltip}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-[14px] font-medium text-general-secondary-foreground shrink-0">
                                {title}
                              </span>
                            )
                          )}
                          {showTabs && tabs && (
                            <Tabs value={activeTab} onValueChange={handleTabChange}>
                              <TabsList className="h-auto p-0.5 bg-primary-foreground shrink-0">
                                {tabs.map((tab, i) => (
                                  <TabsTrigger
                                    key={i}
                                    value={tab.value || `tab-${i}`}
                                    className="px-1.5 py-0.5 cursor-pointer"
                                  >
                                    {tab.icon && <span className="text-[#525252]">{tab.icon}</span>}
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                            </Tabs>
                          )}
                        </div>
                      ) : col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className={cn(
                            "flex h-full w-full items-center justify-start text-left",
                            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            sortConfig?.column === col.key && "bg-transparent"
                          )}
                        >
                          <span className="inline-flex min-w-0 items-center justify-start gap-1.5">
                            <span
                              className={cn(
                                "font-medium leading-none tracking-wide",
                                index === 0 ? "min-w-0 truncate" : "whitespace-nowrap",
                                cellSize === "md" ? "text-xs font-semibold" : "text-xs",
                                sortConfig?.column === col.key ? "text-general-muted-foreground" : "text-foreground"
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
                        <div className="flex w-full items-center justify-start gap-1 min-h-full">
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
                      cellSize === "sm" ? "h-[32px] max-h-[32px]" : "h-[32px] max-h-[32px] border-b border-border/40 transition-colors hover:bg-muted/30",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col, colIndex) => {
                      const cellValue = row[col.key]
                      const isObject = typeof cellValue === "object" && cellValue !== null
                      const displayValue = isObject
                        ? String((cellValue as DataTableMetricCell).value)
                        : String(cellValue)
                      const valueTooltipContent = isObject
                        ? getValueTooltipContent(
                            (cellValue as DataTableMetricCell).value,
                            (cellValue as DataTableMetricCell).rawValue
                          )
                        : colIndex > 0
                          ? getValueTooltipContent(cellValue as string | number)
                          : displayValue
                      const trendTooltip = isObject
                        ? getTrendTooltipContent(cellValue as DataTableMetricCell, col)
                        : null

                      const truncateClass =
                        dynamicFirstColumn && colIndex === 0
                          ? "max-w-full"
                          : isThreeColumnLayout && colIndex === 0
                          ? resolvedFirstColumnTruncate
                          : ""

                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            styles.cell,
                            dynamicFirstColumn &&
                              (colIndex === 0
                                ? dynamicFirstColumnWidth
                                : dynamicMetricColumnWidth),
                            isThreeColumnLayout && !col.width && (colIndex === 0 ? firstColumnWidth : otherColumnWidth),
                            !dynamicFirstColumn && col.width
                          )}
                        >
                          {isObject ? (
                            <div className="flex items-baseline gap-2 min-w-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(styles.text, "text-foreground inline-block align-baseline leading-none cursor-default", colIndex === 0 ? ["truncate", truncateClass] : "whitespace-nowrap")}>
                                    {(cellValue as DataTableMetricCell).value}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {valueTooltipContent}
                                </TooltipContent>
                              </Tooltip>
                              {(cellValue as DataTableMetricCell).change !== undefined && (
                                trendTooltip ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex cursor-default">
                                        <StatsBadge value={(cellValue as DataTableMetricCell).change as number} className={cn("leading-none flex items-center", styles.badge)} />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="px-2.5 py-2">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[11px] text-background/80">
                                          {formatTrendTooltipNumber(trendTooltip.previousValue)} previous period
                                        </span>
                                        {trendTooltip.deltaValue !== 0 && (
                                          <span
                                            className={cn(
                                              "text-[11px] font-medium",
                                              trendTooltip.deltaValue > 0 ? "text-green-400" : "text-red-400"
                                            )}
                                          >
                                            {trendTooltip.deltaValue > 0 ? "+" : "-"}
                                            {formatTrendTooltipNumber(Math.abs(trendTooltip.deltaValue))} {trendTooltip.metricLabel}
                                          </span>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <StatsBadge value={(cellValue as DataTableMetricCell).change as number} className={cn("leading-none flex items-center", styles.badge)} />
                                )
                              )}
                            </div>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(styles.text, "text-foreground inline-flex max-w-full items-center gap-2 align-baseline leading-none cursor-default", colIndex === 0 ? ["truncate", truncateClass] : "whitespace-nowrap")}>
                                  {colIndex === 0 && renderFirstColumn
                                    ? renderFirstColumn(row, String(cellValue))
                                    : cellValue}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {valueTooltipContent}
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
    <Card
      className={cn(
        "p-0 shadow-none border border-general-border rounded-lg flex flex-col gap-0 overflow-hidden",
        fillHeight && "h-full min-h-0",
        className
      )}
    >
      {!inlineHeader && (
        <CardHeader className="p-0 gap-0 shrink-0">
          <div className="flex items-center justify-between p-2 border-b border-general-border-four">
            <div className="flex items-center gap-1 ">
              {title && (
                titleTooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <CardTitle className="text-base font-medium text-general-secondary-foreground">{title}</CardTitle>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{titleTooltip}</TooltipContent>
                  </Tooltip>
                ) : (
                  <CardTitle className="text-base font-medium text-general-secondary-foreground">{title}</CardTitle>
                )
              )}
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
      )}

      <CardContent className={cn("p-0", fillHeight && "flex-1 flex flex-col min-h-0")}>
        {fillHeight ? (
          <div className="flex flex-1 flex-col min-h-0">
            {tableContent}
            {onArrowClick && (
              <div className="flex justify-end px-2 py-1.5 shrink-0">
                <Button
                  size="icon-sm"
                  variant="secondary"
                  className="rounded-lg cursor-pointer"
                  onClick={onArrowClick}
                >
                  <ArrowRight className="h-3 w-3 text-foreground" />
                </Button>
              </div>
            )}
            <div className="flex-1 min-h-0" />
          </div>
        ) : (
          tableContent
        )}
      </CardContent>

      {!fillHeight && onArrowClick && (
        <CardFooter className="justify-end px-2 py-1.5 shrink-0">
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
