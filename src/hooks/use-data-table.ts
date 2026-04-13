"use client";

import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  InitialTableState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  type SingleParser,
  type UseQueryStateOptions,
  useQueryState,
  useQueryStates,
} from "nuqs";
import * as React from "react";

import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getSortingStateParser } from "../components/filter-table/parsers";
import type { ExtendedColumnSort, QueryKeys } from "../types/data-table-types";

const PAGE_KEY = "page";
const PER_PAGE_KEY = "perPage";
const SORT_KEY = "sort";
const FILTERS_KEY = "filters";
const JOIN_OPERATOR_KEY = "joinOperator";
const ARRAY_SEPARATOR = ",";
const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;

interface UseDataTableProps<TData>
  extends Omit<
    TableOptions<TData>,
    | "state"
    | "pageCount"
    | "getCoreRowModel"
    | "manualFiltering"
    | "manualPagination"
    | "manualSorting"
    | "initialState"
  >,
  Required<Pick<TableOptions<TData>, "pageCount">> {
  initialState?: Omit<Partial<TableState>, "sorting"> & {
    sorting?: ExtendedColumnSort<TData>[];
  };
  queryKeys?: Partial<QueryKeys>;
  history?: "push" | "replace";
  debounceMs?: number;
  throttleMs?: number;
  clearOnDefault?: boolean;
  enableAdvancedFilter?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  startTransition?: React.TransitionStartFunction;
  persistColumnVisibility?: boolean;
  columnVisibilityKey?: string;
}

export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  const {
    columns,
    pageCount = -1,
    initialState,
    queryKeys,
    history = "replace",
    debounceMs = DEBOUNCE_MS,
    throttleMs = THROTTLE_MS,
    clearOnDefault = false,
    enableAdvancedFilter = false,
    scroll = false,
    shallow = true,
    startTransition,
    persistColumnVisibility = false,
    columnVisibilityKey,
    ...tableProps
  } = props;
  const pageKey = queryKeys?.page ?? PAGE_KEY;
  const perPageKey = queryKeys?.perPage ?? PER_PAGE_KEY;
  const sortKey = queryKeys?.sort ?? SORT_KEY;
  const filtersKey = queryKeys?.filters ?? FILTERS_KEY;
  const joinOperatorKey = queryKeys?.joinOperator ?? JOIN_OPERATOR_KEY;

  const queryStateOptions = React.useMemo<
    Omit<UseQueryStateOptions<string>, "parse">
  >(
    () => ({
      history,
      scroll,
      shallow,
      throttleMs,
      debounceMs,
      clearOnDefault,
      startTransition,
    }),
    [
      history,
      scroll,
      shallow,
      throttleMs,
      debounceMs,
      clearOnDefault,
      startTransition,
    ],
  );

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {},
  );

  const columnIds = React.useMemo(() => {
    return new Set(
      columns.map((column) => column.id).filter(Boolean) as string[],
    );
  }, [columns]);

  const sanitizeColumnVisibility = React.useCallback(
    (visibility: VisibilityState) => {
      if (columnIds.size === 0) return visibility;
      const next: VisibilityState = {};
      for (const [id, value] of Object.entries(visibility)) {
        if (columnIds.has(id)) {
          next[id] = value;
        }
      }
      return next;
    },
    [columnIds],
  );

  const readPersistedColumnVisibility = React.useCallback(() => {
    if (!persistColumnVisibility || !columnVisibilityKey) return null;
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(columnVisibilityKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as VisibilityState;
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }, [persistColumnVisibility, columnVisibilityKey]);

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => {
      const base = initialState?.columnVisibility ?? {};
      const stored = readPersistedColumnVisibility();
      const merged = stored ? { ...base, ...stored } : base;
      return sanitizeColumnVisibility(merged);
    });

  const [page, setPage] = useQueryState(
    pageKey,
    parseAsInteger.withOptions(queryStateOptions).withDefault(1),
  );
  const [perPage, setPerPage] = useQueryState(
    perPageKey,
    parseAsInteger
      .withOptions(queryStateOptions)
      .withDefault(initialState?.pagination?.pageSize ?? 10),
  );

  const pagination: PaginationState = React.useMemo(() => {
    return {
      pageIndex: page - 1, // zero-based index -> one-based index
      pageSize: perPage,
    };
  }, [page, perPage]);

  const onPaginationChange = React.useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      if (typeof updaterOrValue === "function") {
        const newPagination = updaterOrValue(pagination);
        void setPage(newPagination.pageIndex + 1);
        void setPerPage(newPagination.pageSize);
      } else {
        void setPage(updaterOrValue.pageIndex + 1);
        void setPerPage(updaterOrValue.pageSize);
      }
    },
    [pagination, setPage, setPerPage],
  );

  React.useEffect(() => {
    const next = sanitizeColumnVisibility(columnVisibility);
    const prevKeys = Object.keys(columnVisibility);
    const nextKeys = Object.keys(next);
    if (
      prevKeys.length === nextKeys.length &&
      prevKeys.every((key) => nextKeys.includes(key))
    ) {
      return;
    }
    setColumnVisibility(next);
  }, [columnVisibility, sanitizeColumnVisibility]);

  React.useEffect(() => {
    if (!persistColumnVisibility || !columnVisibilityKey) return;
    if (typeof window === "undefined") return;
    const next = sanitizeColumnVisibility(columnVisibility);
    try {
      window.localStorage.setItem(columnVisibilityKey, JSON.stringify(next));
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }, [
    columnVisibility,
    persistColumnVisibility,
    columnVisibilityKey,
    sanitizeColumnVisibility,
  ]);

  React.useEffect(() => {
    if (!persistColumnVisibility || !columnVisibilityKey) return;
    const stored = readPersistedColumnVisibility();
    if (!stored) return;
    setColumnVisibility((prev) => {
      const base = initialState?.columnVisibility ?? {};
      const merged = sanitizeColumnVisibility({ ...base, ...stored });
      const prevEntries = Object.entries(prev);
      const mergedEntries = Object.entries(merged);
      if (prevEntries.length !== mergedEntries.length) return merged;
      const hasDiff = prevEntries.some(
        ([key, value]) => merged[key] !== value,
      );
      return hasDiff ? merged : prev;
    });
  }, [
    persistColumnVisibility,
    columnVisibilityKey,
    readPersistedColumnVisibility,
    sanitizeColumnVisibility,
    initialState?.columnVisibility,
  ]);

  const sortFieldMapper = React.useMemo(() => {
    const idToQueryField = new Map<string, string>();
    const queryFieldToId = new Map<string, string>();
    const validQueryFields = new Set<string>();

    for (const column of columns) {
      const id = column.id;
      if (!id) continue;

      const queryField = column.meta?.apiField ?? id;
      idToQueryField.set(id, queryField);
      validQueryFields.add(id);
      validQueryFields.add(queryField);
      if (!queryFieldToId.has(queryField)) {
        queryFieldToId.set(queryField, id);
      }
    }

    return {
      validQueryFields,
      toQueryField: (field: string) => idToQueryField.get(field) ?? field,
      fromQueryField: (field: string) => queryFieldToId.get(field) ?? field,
    };
  }, [columns]);

  const [sorting, setSorting] = useQueryState(
    sortKey,
    getSortingStateParser<TData>(sortFieldMapper.validQueryFields, {
      toQueryField: sortFieldMapper.toQueryField,
      fromQueryField: sortFieldMapper.fromQueryField,
    })
      .withOptions(queryStateOptions)
      .withDefault([]),
  );

  const tableSorting: SortingState = React.useMemo(() => {
    return (sorting ?? []).map((sort) => ({
      id: sort.field,
      desc: sort.desc,
    }));
  }, [sorting]);

  const prioritizeLastChangedSort = React.useCallback(
    (prev: SortingState, next: SortingState): SortingState => {
      if (next.length <= 1) return next;

      let changedId: string | undefined;

      if (next.length > prev.length) {
        changedId = next.find((s) => !prev.some((p) => p.id === s.id))?.id;
      } else if (next.length === prev.length) {
        changedId = next.find((n) => {
          const p = prev.find((p) => p.id === n.id);
          return !p || p.desc !== n.desc;
        })?.id;
      }

      if (!changedId) return next;

      const changedSort = next.find((s) => s.id === changedId);
      if (!changedSort) return next;

      return [changedSort, ...next.filter((s) => s.id !== changedId)];
    },
    [],
  );

  const onSortingChange = React.useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      if (typeof updaterOrValue === "function") {
        const nextSorting = updaterOrValue(tableSorting);
        const newSorting = prioritizeLastChangedSort(tableSorting, nextSorting);
        setSorting(
          newSorting.map((sort) => ({
            field: sort.id as Extract<keyof TData, string>,
            desc: sort.desc,
          })),
        );
      } else {
        const newSorting = prioritizeLastChangedSort(tableSorting, updaterOrValue);
        setSorting(
          newSorting.map((sort) => ({
            field: sort.id as Extract<keyof TData, string>,
            desc: sort.desc,
          })),
        );
      }
    },
    [prioritizeLastChangedSort, tableSorting, setSorting],
  );

  const resolvedInitialState = React.useMemo((): InitialTableState | undefined => {
    if (!initialState) return undefined;

    const { sorting, ...rest } = initialState;

    if (!sorting) {
      return rest as InitialTableState;
    }

    return {
      ...rest,
      sorting: sorting.map((sort) => ({
        id: sort.field,
        desc: sort.desc,
      })),
    } as InitialTableState;
  }, [initialState]);

  const filterableColumns = React.useMemo(() => {
    if (enableAdvancedFilter) return [];

    return columns.filter((column) => column.enableColumnFilter);
  }, [columns, enableAdvancedFilter]);

  const filterParsers = React.useMemo(() => {
    if (enableAdvancedFilter) return {};

    return filterableColumns.reduce<
      Record<string, SingleParser<string> | SingleParser<string[]>>
    >((acc, column) => {
      if (column.meta?.options) {
        acc[column.id ?? ""] = parseAsArrayOf(
          parseAsString,
          ARRAY_SEPARATOR,
        ).withOptions(queryStateOptions);
      } else {
        acc[column.id ?? ""] = parseAsString.withOptions(queryStateOptions);
      }
      return acc;
    }, {});
  }, [filterableColumns, queryStateOptions, enableAdvancedFilter]);

  const [filterValues, setFilterValues] = useQueryStates(filterParsers);

  const debouncedSetFilterValues = useDebouncedCallback(
    (values: typeof filterValues) => {
      void setPage(1);
      void setFilterValues(values);
    },
    debounceMs,
  );

  const initialColumnFilters: ColumnFiltersState = React.useMemo(() => {
    if (enableAdvancedFilter) return [];

    return Object.entries(filterValues).reduce<ColumnFiltersState>(
      (filters, [key, value]) => {
        if (value !== null) {
          const processedValue = Array.isArray(value)
            ? value
            : typeof value === "string" && /[^a-zA-Z0-9]/.test(value)
              ? value.split(/[^a-zA-Z0-9]+/).filter(Boolean)
              : [value];

          filters.push({
            id: key,
            value: processedValue,
          });
        }
        return filters;
      },
      [],
    );
  }, [filterValues, enableAdvancedFilter]);

  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>(initialColumnFilters);

  const onColumnFiltersChange = React.useCallback(
    (updaterOrValue: Updater<ColumnFiltersState>) => {
      if (enableAdvancedFilter) return;

      setColumnFilters((prev) => {
        const next =
          typeof updaterOrValue === "function"
            ? updaterOrValue(prev)
            : updaterOrValue;

        const filterUpdates = next.reduce<
          Record<string, string | string[] | null>
        >((acc, filter) => {
          if (filterableColumns.find((column) => column.id === filter.id)) {
            acc[filter.id] = filter.value as string | string[];
          }
          return acc;
        }, {});

        for (const prevFilter of prev) {
          if (!next.some((filter) => filter.id === prevFilter.id)) {
            filterUpdates[prevFilter.id] = null;
          }
        }

        debouncedSetFilterValues(filterUpdates);
        return next;
      });
    },
    [debouncedSetFilterValues, filterableColumns, enableAdvancedFilter],
  );

  const table = useReactTable({
    ...tableProps,
    columns,
    initialState: resolvedInitialState,
    pageCount,
    enableSortingRemoval: false,
    isMultiSortEvent: () => true,
    state: {
      pagination,
      sorting: tableSorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    defaultColumn: {
      ...tableProps.defaultColumn,
      enableColumnFilter: false,
      size: 150, // Default column size
      minSize: 50,
      maxSize: 500,
    },
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onRowSelectionChange: setRowSelection,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    meta: {
      ...tableProps.meta,
      queryKeys: {
        page: pageKey,
        perPage: perPageKey,
        sort: sortKey,
        filters: filtersKey,
        joinOperator: joinOperatorKey,
      },
    },
  });

  return { table, shallow, debounceMs, throttleMs };
}
