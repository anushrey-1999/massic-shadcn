import * as React from "react";
import type { Column } from "@tanstack/react-table";
import { dataTableConfig } from "../components/filter-table/data-table-config";
import type {
  ExtendedColumnFilter,
  FilterOperator,
  FilterVariant,
  JoinOperator,
} from "../types/data-table-types";

/**
 * Helper function to format size value - supports both numbers (pixels) and strings (relative units)
 * @param size - Size value as number (pixels) or string (CSS unit like "50%", "20vw", "10rem")
 * @returns Formatted size value ready for CSS
 */
export function formatSizeValue(size: number | string | undefined): string | number | undefined {
  if (size === undefined) return undefined;
  // If it's already a string (e.g., "50%", "20vw", "10rem"), return as-is
  if (typeof size === "string") return size;
  // If it's a number, return as-is (will be treated as pixels)
  return size;
}

export function getCommonPinningStyles<TData>({
  column,
  withBorder = false,
}: {
  column: Column<TData>;
  withBorder?: boolean;
}): React.CSSProperties {
  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn =
    isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinnedColumn =
    isPinned === "right" && column.getIsFirstColumn("right");

  return {
    boxShadow: withBorder
      ? isLastLeftPinnedColumn
        ? "-4px 0 4px -4px var(--border) inset"
        : isFirstRightPinnedColumn
          ? "4px 0 4px -4px var(--border) inset"
          : undefined
      : undefined,
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    opacity: isPinned ? 0.97 : 1,
    position: isPinned ? "sticky" : "relative",
    background: isPinned ? "var(--background)" : undefined,
    width: column.getSize(),
    zIndex: isPinned ? 1 : undefined,
  };
}

export function getFilterOperators(filterVariant: FilterVariant) {
  const operatorMap: Record<
    FilterVariant,
    { label: string; value: FilterOperator }[]
  > = {
    text: dataTableConfig.textOperators,
    number: dataTableConfig.numericOperators,
    range: dataTableConfig.numericOperators,
    date: dataTableConfig.dateOperators,
    dateRange: dataTableConfig.dateOperators,
    boolean: dataTableConfig.booleanOperators,
    select: dataTableConfig.selectOperators,
    multiSelect: dataTableConfig.multiSelectOperators,
  };

  return operatorMap[filterVariant] ?? dataTableConfig.textOperators;
}

export function getDefaultFilterOperator(filterVariant: FilterVariant) {
  const operators = getFilterOperators(filterVariant);

  return operators[0]?.value ?? (filterVariant === "text" ? "iLike" : "eq");
}

export function getValidFilters<TData>(
  filters: ExtendedColumnFilter<TData>[],
): ExtendedColumnFilter<TData>[] {
  return filters.filter(
    (filter) =>
      filter.operator === "isEmpty" ||
      filter.operator === "isNotEmpty" ||
      (Array.isArray(filter.value)
        ? filter.value.length > 0
        : filter.value !== "" &&
        filter.value !== null &&
        filter.value !== undefined),
  );
}

// Generic table utilities - reusable across all table types

/**
 * Generic pagination function for any data type
 */
export function tablePaginate<TData>(
  data: TData[],
  page: number,
  perPage: number
): { data: TData[]; pageCount: number; total: number } {
  const total = data.length;
  const pageCount = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedData = data.slice(start, end);

  return { data: paginatedData, pageCount, total };
}

/**
 * Generic sorting function for any data type
 */
export function tableSort<TData>(
  data: TData[],
  sortBy: Array<{ id: keyof TData; desc: boolean }>
): TData[] {
  if (!sortBy.length) return data;

  return [...data].sort((a, b) => {
    for (const sort of sortBy) {
      const aValue = a[sort.id];
      const bValue = b[sort.id];

      let comparison = 0;

      if (aValue === null || aValue === undefined) comparison = 1;
      else if (bValue === null || bValue === undefined) comparison = -1;
      else if (aValue < bValue) comparison = -1;
      else if (aValue > bValue) comparison = 1;

      if (comparison !== 0) {
        return sort.desc ? -comparison : comparison;
      }
    }
    return 0;
  });
}

/**
 * Generic advanced filtering function for any data type
 */
export function tableApplyAdvancedFilters<TData>(
  data: TData[],
  filters: ExtendedColumnFilter<TData>[],
  joinOperator: JoinOperator = "and"
): TData[] {
  if (!filters.length) return data;

  return data.filter((item) => {
    const results = filters.map((filter) => {
      const value = item[filter.field as keyof TData];

      switch (filter.operator) {
        case "iLike":
          if (typeof filter.value !== "string") return false;
          const iLikeHaystack =
            typeof value === "number"
              ? String(value)
              : typeof value === "string"
                ? value
                : "";
          return iLikeHaystack.toLowerCase().includes(filter.value.toLowerCase());

        case "notILike":
          return typeof value === "string" && typeof filter.value === "string"
            ? !value.toLowerCase().includes(filter.value.toLowerCase())
            : true;

        case "eq": {
          const eqFilterNum = Array.isArray(filter.value)
            ? Number(filter.value[0] ?? filter.value[1] ?? "")
            : Number(filter.value);
          if (typeof value === "number" && !Number.isNaN(eqFilterNum)) {
            return Math.abs(value - eqFilterNum) < 1e-9;
          }
          return value === filter.value;
        }

        case "ne": {
          const neFilterNum = Array.isArray(filter.value)
            ? Number(filter.value[0] ?? filter.value[1] ?? "")
            : Number(filter.value);
          if (typeof value === "number" && !Number.isNaN(neFilterNum)) {
            return Math.abs(value - neFilterNum) >= 1e-9;
          }
          return value !== filter.value;
        }

        case "inArray":
          return Array.isArray(filter.value)
            ? filter.value.includes(String(value))
            : false;

        case "notInArray":
          return Array.isArray(filter.value)
            ? !filter.value.includes(String(value))
            : true;

        case "lt": {
          if (typeof value !== "number") return false;
          const n = typeof filter.value === "string" || typeof filter.value === "number"
            ? Number(filter.value)
            : Array.isArray(filter.value) && filter.value[0] !== ""
              ? Number(filter.value[0])
              : NaN;
          return !Number.isNaN(n) && value < n;
        }

        case "lte": {
          if (typeof value !== "number") return false;
          const nLte = typeof filter.value === "string" || typeof filter.value === "number"
            ? Number(filter.value)
            : Array.isArray(filter.value) && filter.value[0] !== ""
              ? Number(filter.value[0])
              : NaN;
          return !Number.isNaN(nLte) && value <= nLte;
        }

        case "gt": {
          if (typeof value !== "number") return false;
          const nGt = typeof filter.value === "string" || typeof filter.value === "number"
            ? Number(filter.value)
            : Array.isArray(filter.value) && filter.value[1] !== ""
              ? Number(filter.value[1])
              : NaN;
          return !Number.isNaN(nGt) && value > nGt;
        }

        case "gte": {
          if (typeof value !== "number") return false;
          const nGte = typeof filter.value === "string" || typeof filter.value === "number"
            ? Number(filter.value)
            : Array.isArray(filter.value) && filter.value[1] !== ""
              ? Number(filter.value[1])
              : NaN;
          return !Number.isNaN(nGte) && value >= nGte;
        }

        case "isBetween":
          if (Array.isArray(filter.value) && filter.value.length === 2) {
            const [min, max] = filter.value;
            if (typeof value === "number") {
              const minVal = min ? Number(min) : -Infinity;
              const maxVal = max ? Number(max) : Infinity;
              return value >= minVal && value <= maxVal;
            }
          }
          return false;

        case "isEmpty":
          return value === null || value === undefined || value === "";

        case "isNotEmpty":
          return value !== null && value !== undefined && value !== "";

        default:
          return true;
      }
    });

    // Apply join operator
    return joinOperator === "and"
      ? results.every(Boolean)
      : results.some(Boolean);
  });
}
