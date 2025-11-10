"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { Search, X, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { DataTable } from "./table"
import { Input } from "./input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"

export interface FilterConfig {
  column: string
  label: string
  options: { value: string; label: string }[]
}

export interface GenericTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  className?: string
  // Search props
  enableSearch?: boolean
  searchPlaceholder?: string
  searchableColumns?: string[] // Column accessor keys to search in
  // Server-side search (if provided, search is handled server-side)
  onSearchChange?: (search: string) => void
  serverSideSearch?: boolean // If true, don't filter client-side when search is active
  // Filter props
  enableFilters?: boolean
  filters?: FilterConfig[]
  // DataTable props
  onLoadMore?: () => void
  isLoading?: boolean
  hasMore?: boolean
  isInitialLoading?: boolean
  // Custom header content
  headerContent?: React.ReactNode
  // Table container class
  tableClassName?: string
  // DataTable className (for max-height, etc.)
  dataTableClassName?: string
}

export function GenericTable<TData, TValue>({
  columns,
  data,
  className,
  enableSearch = true,
  searchPlaceholder = "Search...",
  searchableColumns,
  enableFilters = false,
  filters = [],
  onLoadMore,
  isLoading = false,
  hasMore = false,
  isInitialLoading = false,
  headerContent,
  tableClassName,
  dataTableClassName,
  onSearchChange,
  serverSideSearch = false,
}: GenericTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [lastSearchValue, setLastSearchValue] = React.useState<string>("")

  // Handle search change with debounce for server-side search
  React.useEffect(() => {
    if (onSearchChange && serverSideSearch) {
      // Skip if value hasn't changed
      if (globalFilter === lastSearchValue) {
        return
      }

      // For empty search, call immediately (no debounce needed)
      if (globalFilter === "") {
        setLastSearchValue("")
        onSearchChange("")
        return
      }
      
      // Debounce non-empty searches to avoid too many API calls
      const timeoutId = setTimeout(() => {
        setLastSearchValue(globalFilter)
        onSearchChange(globalFilter)
      }, 300) // 300ms debounce
      return () => clearTimeout(timeoutId)
    }
  }, [globalFilter, onSearchChange, serverSideSearch, lastSearchValue])

  // Get all column accessor keys from the table columns
  const allColumnKeys = React.useMemo(() => {
    return columns
      .map((col) => {
        if ("accessorKey" in col && col.accessorKey) {
          return col.accessorKey as string
        }
        // Also check for accessorFn - extract the key from function name or use id
        if ("id" in col && col.id) {
          return col.id as string
        }
        return null
      })
      .filter((key): key is string => key !== null)
  }, [columns])

  // Get searchable column keys - use searchableColumns if provided, otherwise all columns
  const searchableKeys = React.useMemo(() => {
    if (searchableColumns && searchableColumns.length > 0) {
      // Only search in specified columns
      return searchableColumns.filter((key) => allColumnKeys.includes(key))
    }
    // Search in all columns by default
    return allColumnKeys
  }, [columns, searchableColumns, allColumnKeys])

  // Deep search function to search through all properties including nested objects/arrays
  const deepSearch = React.useCallback((obj: any, searchTerm: string): boolean => {
    if (obj == null) return false
    
    // Handle primitives
    if (typeof obj === "string") {
      return obj.toLowerCase().includes(searchTerm)
    }
    if (typeof obj === "number") {
      return obj.toString().includes(searchTerm)
    }
    if (typeof obj === "boolean") {
      return obj.toString().toLowerCase().includes(searchTerm)
    }
    
    // Handle arrays - search through each element
    if (Array.isArray(obj)) {
      return obj.some((item) => deepSearch(item, searchTerm))
    }
    
    // Handle objects - search through all values
    if (typeof obj === "object") {
      return Object.values(obj).some((value) => deepSearch(value, searchTerm))
    }
    
    return false
  }, [])

  // Filter data based on global search and column filters
  const filteredData = React.useMemo(() => {
    let result = [...data]

    // Apply search filtering
    if (globalFilter) {
      // When server-side search is enabled, the hook handles all filtering
      // (including numeric fields), so we don't need to filter again here
      if (serverSideSearch && onSearchChange) {
        // Hook has already filtered the data, just use it as-is
        // No additional filtering needed
      } else {
        // Pure client-side search - filter all fields
        const searchLower = globalFilter.toLowerCase()
        result = result.filter((row) => {
          // If searchableColumns is specified, only search in those columns
          if (searchableColumns && searchableColumns.length > 0) {
            return searchableKeys.some((key) => {
              const value = (row as any)[key]
              return deepSearch(value, searchLower)
            })
          }
          
          // Otherwise, search through ALL properties of the row object (including nested)
          return deepSearch(row, searchLower)
        })
      }
    }

    // Apply column filters
    if (columnFilters.length > 0) {
      result = result.filter((row) => {
        return columnFilters.every((filter) => {
          const value = (row as any)[filter.id]
          if (filter.value === "" || filter.value === undefined) return true
          return String(value) === String(filter.value)
        })
      })
    }

    return result
  }, [data, globalFilter, columnFilters, searchableKeys, deepSearch, serverSideSearch, onSearchChange, searchableColumns])

  // Handle filter change
  const handleFilterChange = (columnId: string, value: string) => {
    setColumnFilters((prev) => {
      const existing = prev.find((f) => f.id === columnId)
      if (value === "" || value === "all") {
        // Remove filter if empty or "all"
        return prev.filter((f) => f.id !== columnId)
      }
      if (existing) {
        // Update existing filter
        return prev.map((f) =>
          f.id === columnId ? { ...f, value } : f
        )
      }
      // Add new filter
      return [...prev, { id: columnId, value }]
    })
  }

  // Get current filter value for a column
  const getFilterValue = (columnId: string): string => {
    const filter = columnFilters.find((f) => f.id === columnId)
    return (filter?.value as string) || "all"
  }

  // Clear all filters
  const clearAllFilters = () => {
    setGlobalFilter("")
    setColumnFilters([])
  }

  // Check if any filters are active
  const hasActiveFilters = globalFilter !== "" || columnFilters.length > 0

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header Section with Search and Filters */}
      {(enableSearch || enableFilters || headerContent) && (
        <div className="flex flex-col gap-4">
          {headerContent && <div>{headerContent}</div>}
          
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search Bar */}
            {enableSearch && (
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9 pr-9"
                />
                {globalFilter && (
                  <button
                    onClick={() => setGlobalFilter("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Column Filters */}
            {enableFilters && filters.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                {filters.map((filter) => (
                  <Select
                    key={filter.column}
                    value={getFilterValue(filter.column)}
                    onValueChange={(value) =>
                      handleFilterChange(filter.column, value)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {filter.label}</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>
            )}

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className={cn("bg-card rounded-xl p-6", tableClassName)}>
        <DataTable
          columns={columns}
          data={filteredData}
          onLoadMore={onLoadMore}
          isLoading={isLoading}
          hasMore={hasMore}
          isInitialLoading={isInitialLoading}
          className={dataTableClassName}
        />
      </div>
    </div>
  )
}

