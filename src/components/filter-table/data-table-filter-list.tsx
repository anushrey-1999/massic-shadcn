"use client";

import type { Column, ColumnMeta, Table } from "@tanstack/react-table";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  ListFilter,
  Trash2,
} from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import * as React from "react";

import { DataTableRangeFilter } from "./data-table-range-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Faceted,
  FacetedBadgeList,
  FacetedContent,
  FacetedEmpty,
  FacetedGroup,
  FacetedInput,
  FacetedItem,
  FacetedList,
  FacetedTrigger,
} from "@/components/ui/faceted";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dataTableConfig } from "./data-table-config";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getDefaultFilterOperator, getFilterOperators } from "@/utils/data-table-utils";
import { formatDate } from "@/lib/format";
import { getFiltersStateParser } from "./parsers";
import { cn } from "@/lib/utils";
import type {
  ExtendedColumnFilter,
  FilterOperator,
  JoinOperator,
} from "../../types/data-table-types";

const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;
const FILTER_SHORTCUT_KEY = "f";
const REMOVE_FILTER_SHORTCUTS = ["backspace", "delete"];

interface DataTableFilterListProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  table: Table<TData>;
  debounceMs?: number;
  throttleMs?: number;
  shallow?: boolean;
}

export function DataTableFilterList<TData>({
  table,
  debounceMs = DEBOUNCE_MS,
  throttleMs = THROTTLE_MS,
  shallow = true,
  ...props
}: DataTableFilterListProps<TData>) {
  const id = React.useId();
  const labelId = React.useId();
  const descriptionId = React.useId();
  const [open, setOpen] = React.useState(false);
  const addButtonRef = React.useRef<HTMLButtonElement>(null);

  const columns = React.useMemo(() => {
    return table
      .getAllColumns()
      .filter((column) => column.columnDef.enableColumnFilter);
  }, [table]);

  const filterFieldMapper = React.useMemo(() => {
    const idToQueryField = new Map<string, string>();
    const queryFieldToId = new Map<string, string>();
    const validQueryFields = new Set<string>();

    for (const column of columns) {
      const id = column.id;
      const queryField = column.columnDef.meta?.apiField ?? id;
      idToQueryField.set(id, queryField);
      validQueryFields.add(id);
      validQueryFields.add(queryField);
      if (!queryFieldToId.has(queryField)) {
        queryFieldToId.set(queryField, id);
      }
    }

    return {
      validQueryFields: Array.from(validQueryFields),
      toQueryField: (field: string) => idToQueryField.get(field) ?? field,
      fromQueryField: (field: string) => queryFieldToId.get(field) ?? field,
    };
  }, [columns]);

  const [filters, setFilters] = useQueryState(
    table.options.meta?.queryKeys?.filters ?? "filters",
    getFiltersStateParser<TData>(filterFieldMapper.validQueryFields, {
      toQueryField: filterFieldMapper.toQueryField,
      fromQueryField: filterFieldMapper.fromQueryField,
    })
      .withDefault([])
      .withOptions({
        clearOnDefault: true,
        shallow,
        throttleMs,
      }),
  );

  const [draftFilters, setDraftFilters] = React.useState<
    ExtendedColumnFilter<TData>[]
  >([]);

  // Track fields that should be removed from URL on next sync (e.g., when changing a filter's field)
  const [fieldsToRemove, setFieldsToRemove] = React.useState<Set<string>>(
    () => new Set(),
  );

  // Combine filters - draftFilters override URL filters for the same field
  const allFilters = React.useMemo(() => {
    const draftFields = new Set(draftFilters.map((f) => f.field));
    const appliedFilters = filters.filter((f) => !draftFields.has(f.field));
    return [...appliedFilters, ...draftFilters];
  }, [filters, draftFilters]);

  const isActiveFilterValue = React.useCallback(
    (value: string | string[]) => {
      if (Array.isArray(value)) {
        return value.some((v) => (v ?? "").toString().trim().length > 0);
      }
      return (value ?? "").toString().trim().length > 0;
    },
    [],
  );

  const [joinOperator, setJoinOperator] = useQueryState(
    table.options.meta?.queryKeys?.joinOperator ?? "",
    parseAsStringEnum(["and", "or"]).withDefault("and").withOptions({
      clearOnDefault: true,
      shallow,
    }),
  );

  const usedFields = React.useMemo(
    () =>
      new Set<Extract<keyof TData, string>>(allFilters.map((filter) => filter.field)),
    [allFilters],
  );

  const hasAvailableFields = React.useMemo(
    () => columns.some((column) => !usedFields.has(column.id as Extract<keyof TData, string>)),
    [columns, usedFields],
  );

  const getOperatorsForField = React.useCallback(
    (fieldId: string) => {
      const column = columns.find((col) => col.id === fieldId);
      const columnMeta = column?.columnDef.meta;
      const operators = columnMeta?.operators || getFilterOperators(columnMeta?.variant ?? "text");
      const defaultOperator =
        operators[0]?.value || getDefaultFilterOperator(columnMeta?.variant ?? "text");
      return { operators, defaultOperator };
    },
    [columns],
  );

  const onFilterAdd = React.useCallback(() => {
    const column = columns[0];

    if (!column) return;

    const columnMeta = column.columnDef.meta;
    const operators = columnMeta?.operators || getFilterOperators(columnMeta?.variant ?? "text");
    const defaultOperator = operators[0]?.value || getDefaultFilterOperator(columnMeta?.variant ?? "text");

    if (allFilters.length === 0) {
      setDraftFilters((prev) => [
        ...prev,
        {
          field: column.id as Extract<keyof TData, string>,
          value: "",
          operator: defaultOperator,
        } as ExtendedColumnFilter<TData>,
      ]);
      return;
    }

    if (!hasAvailableFields) return;

    const fallbackOperator = getDefaultFilterOperator("text");

    setDraftFilters((prev) => [
      ...prev,
      {
        field: "" as Extract<keyof TData, string>,
        value: "",
        operator: fallbackOperator,
      } as ExtendedColumnFilter<TData>,
    ]);
  }, [allFilters.length, columns, hasAvailableFields]);

  const onFilterUpdate = React.useCallback(
    (
      field: string,
      updates: Partial<ExtendedColumnFilter<TData>>,
    ) => {
      // Check if this is a field change (changing which column is being filtered)
      const isFieldChange = updates.field && updates.field !== field;

      if (isFieldChange) {
        if (updates.field && usedFields.has(updates.field)) {
          return;
        }
      }

      if (isFieldChange) {
        // For field changes, update the draft filter with the new field
        setDraftFilters((prevDrafts) => {
          const index = prevDrafts.findIndex((f) => f.field === field);
          if (index !== -1) {
            const next = [...prevDrafts];
            const { defaultOperator } = updates.field
              ? getOperatorsForField(updates.field)
              : { defaultOperator: prevDrafts[index].operator };
            next[index] = {
              ...prevDrafts[index],
              ...updates,
              operator: updates.field ? defaultOperator : prevDrafts[index].operator,
              value: updates.field ? "" : prevDrafts[index].value,
            } as ExtendedColumnFilter<TData>;
            return next;
          }

          // If it's in applied filters, move it to drafts with new field
          const appliedIndex = filters.findIndex((f) => f.field === field);
          if (appliedIndex !== -1) {
            // Mark the old field for removal and add updated draft with new field
            setFieldsToRemove((prev) => {
              const next = new Set(prev);
              next.add(field);
              return next;
            });
            const { defaultOperator } = updates.field
              ? getOperatorsForField(updates.field)
              : { defaultOperator: filters[appliedIndex].operator };
            return [
              ...prevDrafts,
              {
                ...filters[appliedIndex],
                ...updates,
                operator: updates.field ? defaultOperator : filters[appliedIndex].operator,
                value: updates.field ? "" : filters[appliedIndex].value,
              } as ExtendedColumnFilter<TData>,
            ];
          }

          return prevDrafts;
        });
        return;
      }

      // For value/operator changes, update in drafts first
      setDraftFilters((prevDrafts) => {
        const index = prevDrafts.findIndex((f) => f.field === field);
        if (index !== -1) {
          const next = [...prevDrafts];
          next[index] = {
            ...prevDrafts[index],
            ...updates,
          } as ExtendedColumnFilter<TData>;
          return next;
        }

        // If it's in applied filters, move to drafts for editing
        const appliedFilter = filters.find((f) => f.field === field);
        if (appliedFilter) {
          return [
            ...prevDrafts,
            {
              ...appliedFilter,
              ...updates,
            } as ExtendedColumnFilter<TData>,
          ];
        }

        return prevDrafts;
      });
    },
    [columns, filters, setFilters, usedFields],
  );

  // Sync draft filters to URL when they have active values
  const syncFiltersToUrl = React.useCallback(() => {
    const activeFilters = draftFilters.filter((f) => isActiveFilterValue(f.value));
    if (activeFilters.length === 0 && draftFilters.length > 0) return;

    // Get applied filters that aren't being edited
    const draftFields = new Set(draftFilters.map((f) => f.field));
    // Exclude applied filters that are being edited (same field) or explicitly marked for removal
    const unchangedApplied = filters.filter(
      (f) => !draftFields.has(f.field) && !fieldsToRemove.has(f.field),
    );

    // Combine and update URL
    const newFilters = [...unchangedApplied, ...activeFilters];

    // Only update if there's a real change
    const currentJson = JSON.stringify(filters);
    const newJson = JSON.stringify(newFilters);
    if (currentJson !== newJson) {
      void setFilters(newFilters.length > 0 ? newFilters : null);
      // Clear pending removals after successful sync
      if (fieldsToRemove.size > 0) {
        setFieldsToRemove(new Set());
      }
    }

    // Keep empty drafts in draft state, remove synced ones
    setDraftFilters((prev) =>
      prev.filter((f) => !isActiveFilterValue(f.value))
    );
  }, [draftFilters, filters, setFilters, isActiveFilterValue, fieldsToRemove]);

  // Debounced sync to URL
  const debouncedSyncToUrl = useDebouncedCallback(syncFiltersToUrl, debounceMs);

  // Trigger sync when draft filters change
  React.useEffect(() => {
    if (draftFilters.some((f) => isActiveFilterValue(f.value))) {
      debouncedSyncToUrl();
    }
  }, [draftFilters, debouncedSyncToUrl, isActiveFilterValue]);

  const onFilterRemove = React.useCallback(
    (field: string) => {
      setDraftFilters((prev) => prev.filter((f) => f.field !== field));

      const updatedFilters = filters.filter((filter) => filter.field !== field);
      void setFilters(updatedFilters);
      requestAnimationFrame(() => {
        addButtonRef.current?.focus();
      });
    },
    [filters, setFilters],
  );

  const onFiltersReset = React.useCallback(() => {
    void setFilters(null);
    void setJoinOperator("and");
    setDraftFilters([]);
  }, [setFilters, setJoinOperator]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement &&
          event.target.contentEditable === "true")
      ) {
        return;
      }

      if (
        event.key.toLowerCase() === FILTER_SHORTCUT_KEY &&
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey
      ) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onTriggerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        REMOVE_FILTER_SHORTCUTS.includes(event.key.toLowerCase()) &&
        allFilters.length > 0
      ) {
        event.preventDefault();
        onFilterRemove(allFilters[allFilters.length - 1]?.field ?? "");
      }
    },
    [allFilters, onFilterRemove],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`h-9 font-normal ${filters.length > 0
            ? "min-w-9 px-2 gap-1.5"
            : "w-9 p-0"
            }`}
          onKeyDown={onTriggerKeyDown}
        >
          <ListFilter className="text-muted-foreground h-4 w-4" />
          {filters.length > 0 && (
            <Badge
              variant="secondary"
              className="h-[18.24px] rounded-[3.2px] px-[5.12px] font-mono font-normal text-[10.4px]"
            >
              {filters.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-describedby={descriptionId}
        aria-labelledby={labelId}
        className="flex w-full max-w-(--radix-popover-content-available-width) flex-col gap-3.5 p-4 sm:min-w-[380px]"
        {...props}
      >
        <div className="flex flex-col gap-1">
          <h4 id={labelId} className="font-medium leading-none">
            {allFilters.length > 0 ? "Filters" : "No filters applied"}
          </h4>
          <p
            id={descriptionId}
            className={cn(
              "text-muted-foreground text-sm",
              allFilters.length > 0 && "sr-only",
            )}
          >
            {allFilters.length > 0
              ? "Modify filters to refine your rows."
              : "Add filters to refine your rows."}
          </p>
        </div>
        {allFilters.length > 0 ? (
          <ul className="flex max-h-[300px] flex-col gap-2 overflow-y-auto p-1">
            {allFilters.map((filter, index) => (
              <DataTableFilterItem<TData>
                key={`${filter.field}-${index}`}
                filter={filter}
                index={index}
                filterItemId={`${id}-filter-${filter.field}-${index}`}
                joinOperator={joinOperator}
                setJoinOperator={setJoinOperator}
                columns={columns}
                usedFields={usedFields}
                getOperatorsForField={getOperatorsForField}
                onFilterUpdate={onFilterUpdate}
                onFilterRemove={onFilterRemove}
              />
            ))}
          </ul>
        ) : null}
        <div className="flex w-full items-center gap-2">
          <Button
            size="sm"
            className="rounded"
            ref={addButtonRef}
            onClick={onFilterAdd}
            disabled={columns.length === 0 || (allFilters.length > 0 && !hasAvailableFields)}
          >
            Add filter
          </Button>
          {allFilters.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded"
              onClick={onFiltersReset}
            >
              Reset filters
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DataTableFilterItemProps<TData> {
  filter: ExtendedColumnFilter<TData>;
  index: number;
  filterItemId: string;
  joinOperator: JoinOperator;
  setJoinOperator: (value: JoinOperator) => void;
  columns: Column<TData>[];
  usedFields: Set<Extract<keyof TData, string>>;
  getOperatorsForField: (fieldId: string) => { operators: { value: FilterOperator; label: string }[]; defaultOperator: FilterOperator };
  onFilterUpdate: (
    field: string,
    updates: Partial<ExtendedColumnFilter<TData>>,
  ) => void;
  onFilterRemove: (field: string) => void;
}

function DataTableFilterItem<TData>({
  filter,
  index,
  filterItemId,
  joinOperator,
  setJoinOperator,
  columns,
  usedFields,
  getOperatorsForField,
  onFilterUpdate,
  onFilterRemove,
}: DataTableFilterItemProps<TData>) {
  const [showFieldSelector, setShowFieldSelector] = React.useState(false);
  const [showOperatorSelector, setShowOperatorSelector] = React.useState(false);
  const [showValueSelector, setShowValueSelector] = React.useState(false);

  // Local state for text input to prevent UI jank
  const initialTextValue =
    typeof filter.value === "string"
      ? filter.value
      : typeof filter.value === "number"
        ? String(filter.value)
        : Array.isArray(filter.value) && filter.value[0] != null
          ? String(filter.value[0])
          : "";
  const [localTextValue, setLocalTextValue] = React.useState(initialTextValue);
  const debouncedUpdateRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync local text value when filter.value changes externally
  React.useEffect(() => {
    const next =
      typeof filter.value === "string"
        ? filter.value
        : typeof filter.value === "number"
          ? String(filter.value)
          : Array.isArray(filter.value) && filter.value[0] != null
            ? String(filter.value[0])
            : "";
    setLocalTextValue(next);
  }, [filter.value]);

  const column = columns.find((column) => column.id === filter.field);
  const isFieldSelected = Boolean(column);
  const columnVariant = column?.columnDef.meta?.variant ?? "text";

  const joinOperatorListboxId = `${filterItemId}-join-operator-listbox`;
  const fieldListboxId = `${filterItemId}-field-listbox`;
  const operatorListboxId = `${filterItemId}-operator-listbox`;
  const inputId = `${filterItemId}-input`;

  const columnMeta = column?.columnDef.meta;
  const filterOperators = columnMeta?.operators || getFilterOperators(columnVariant);

  // Handle text input changes with debouncing
  const handleTextInputChange = React.useCallback(
    (value: string) => {
      // Update local state immediately for smooth UI
      setLocalTextValue(value);

      // Clear existing timeout
      if (debouncedUpdateRef.current) {
        clearTimeout(debouncedUpdateRef.current);
      }

      // Debounce the actual filter update
      debouncedUpdateRef.current = setTimeout(() => {
        onFilterUpdate(filter.field, { value });
      }, 500);
    },
    [onFilterUpdate, filter.field]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debouncedUpdateRef.current) {
        clearTimeout(debouncedUpdateRef.current);
      }
    };
  }, []);

  const onItemKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLLIElement>) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (showFieldSelector || showOperatorSelector || showValueSelector) {
        return;
      }

      if (REMOVE_FILTER_SHORTCUTS.includes(event.key.toLowerCase())) {
        event.preventDefault();
        onFilterRemove(filter.field);
      }
    },
    [
      filter.field,
      showFieldSelector,
      showOperatorSelector,
      showValueSelector,
      onFilterRemove,
    ],
  );

  return (
    <li
      id={filterItemId}
      tabIndex={-1}
      className="flex items-center gap-2"
      onKeyDown={onItemKeyDown}
    >
      <div className="min-w-[72px] text-center">
        {index === 0 ? (
          <span className="text-muted-foreground text-sm">Where</span>
        ) : index === 1 ? (
          <Select
            value={joinOperator}
            onValueChange={(value: JoinOperator) => setJoinOperator(value)}
          >
            <SelectTrigger
              aria-label="Select join operator"
              aria-controls={joinOperatorListboxId}
              size="sm"
              className="rounded lowercase"
            >
              <SelectValue placeholder={joinOperator} />
            </SelectTrigger>
            <SelectContent
              id={joinOperatorListboxId}
              position="popper"
              className="min-w-(--radix-select-trigger-width) lowercase"
            >
              {dataTableConfig.joinOperators.map((joinOperator) => (
                <SelectItem key={joinOperator} value={joinOperator}>
                  {joinOperator}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground text-sm">
            {joinOperator}
          </span>
        )}
      </div>
      <Popover open={showFieldSelector} onOpenChange={setShowFieldSelector}>
        <PopoverTrigger asChild>
          <Button
            aria-controls={fieldListboxId}
            variant="outline"
            size="sm"
            className="h-8 w-32 justify-between rounded font-normal"
          >
            <span className="truncate">
              {columns.find((column) => column.id === filter.field)?.columnDef
                .meta?.label ?? "Select field"}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          id={fieldListboxId}
          align="start"
          className="w-40 p-0"
          onOpenAutoFocus={(e) => {
            // Allow CommandInput to receive focus
            const target = e.currentTarget as HTMLElement;
            if (target) {
              const input = target.querySelector('[data-slot="command-input"]') as HTMLInputElement;
              if (input) {
                e.preventDefault();
                input.focus();
              }
            }
          }}
        >
          <Command>
            <CommandInput placeholder="Search fields..." />
            <CommandList>
              <CommandEmpty>No fields found.</CommandEmpty>
              <CommandGroup>
                {columns.map((column) => {
                  const isFieldUsedElsewhere =
                    usedFields.has(column.id as Extract<keyof TData, string>) &&
                    column.id !== filter.field;

                  return (
                    <CommandItem
                      key={column.id}
                      value={`${column.id} ${column.columnDef.meta?.label ?? ""}`}
                      disabled={isFieldUsedElsewhere}
                      onSelect={() => {
                        if (isFieldUsedElsewhere) return;
                        const { defaultOperator } = getOperatorsForField(column.id as string);

                        onFilterUpdate(filter.field, {
                          field: column.id as Extract<keyof TData, string>,
                          operator: defaultOperator,
                          value: "",
                        });

                        setShowFieldSelector(false);
                      }}
                    >
                      <span className="truncate">
                        {column.columnDef.meta?.label}
                      </span>
                      <Check
                        className={cn(
                          "ml-auto",
                          column.id === filter.field ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Select
        open={showOperatorSelector}
        onOpenChange={setShowOperatorSelector}
        value={filter.operator}
        disabled={!isFieldSelected}
        onValueChange={(value: FilterOperator) =>
          onFilterUpdate(filter.field, {
            operator: value,
            value:
              value === "isEmpty" || value === "isNotEmpty"
                ? ""
                : filter.value,
          })
        }
      >
        <SelectTrigger
          aria-controls={operatorListboxId}
          size="sm"
          className="w-32 rounded lowercase"
        >
          <div className="truncate">
            <SelectValue placeholder={filter.operator} />
          </div>
        </SelectTrigger>
        <SelectContent id={operatorListboxId}>
          {filterOperators.map((operator) => (
            <SelectItem
              key={operator.value}
              value={operator.value}
              className="lowercase"
            >
              {operator.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="min-w-36 flex-1">
        {onFilterInputRender({
          filter,
          inputId,
          column,
          columnMeta,
          isFieldSelected,
          onFilterUpdate,
          localTextValue,
          handleTextInputChange,
          showValueSelector,
          setShowValueSelector,
        })}
      </div>
      <Button
        aria-controls={filterItemId}
        variant="outline"
        size="icon"
        className="size-8 rounded"
        onClick={() => onFilterRemove(filter.field)}
      >
        <Trash2 />
      </Button>
    </li>
  );
}

function onFilterInputRender<TData>({
  filter,
  inputId,
  column,
  columnMeta,
  isFieldSelected,
  onFilterUpdate,
  localTextValue,
  handleTextInputChange,
  showValueSelector,
  setShowValueSelector,
}: {
  filter: ExtendedColumnFilter<TData>;
  inputId: string;
  column: Column<TData> | undefined;
  columnMeta?: ColumnMeta<TData, unknown>;
  isFieldSelected: boolean;
  onFilterUpdate: (
    field: string,
    updates: Partial<ExtendedColumnFilter<TData>>,
  ) => void;
  localTextValue: string;
  handleTextInputChange: (value: string) => void;
  showValueSelector: boolean;
  setShowValueSelector: (value: boolean) => void;
}) {
  if (!column || !columnMeta || !isFieldSelected) {
    return (
      <Input
        id={inputId}
        disabled
        aria-label="Select a field to filter"
        className="h-8! w-full rounded"
        placeholder="Select a field first"
      />
    );
  }

  if (filter.operator === "isEmpty" || filter.operator === "isNotEmpty") {
    return (
      <div
        id={inputId}
        role="status"
        aria-label={`${columnMeta?.label} filter is ${filter.operator === "isEmpty" ? "empty" : "not empty"
          }`}
        aria-live="polite"
        className="h-8! w-full rounded border bg-transparent dark:bg-input/30"
      />
    );
  }

  switch (columnMeta?.variant) {
    case "text":
    case "number":
    case "range": {
      if (
        (columnMeta?.variant === "range" && filter.operator === "isBetween") ||
        filter.operator === "isBetween"
      ) {
        return (
          <DataTableRangeFilter
            filter={filter}
            column={column}
            inputId={inputId}
            onFilterUpdate={onFilterUpdate}
          />
        );
      }

      const isNumber =
        columnMeta?.variant === "number" || columnMeta?.variant === "range";

      return (
        <Input
          id={inputId}
          type={isNumber ? "number" : "text"}
          aria-label={`${columnMeta?.label} filter value`}
          aria-describedby={`${inputId}-description`}
          inputMode={isNumber ? "numeric" : undefined}
          placeholder={columnMeta?.placeholder ?? "Enter a value..."}
          className="h-8! w-full rounded"
          value={localTextValue}
          onChange={(event) => handleTextInputChange(event.target.value)}
        />
      );
    }

    case "boolean": {
      if (Array.isArray(filter.value)) return null;

      const inputListboxId = `${inputId}-listbox`;

      return (
        <Select
          open={showValueSelector}
          onOpenChange={setShowValueSelector}
          value={filter.value}
          onValueChange={(value) =>
            onFilterUpdate(filter.field, {
              value,
            })
          }
        >
          <SelectTrigger
            id={inputId}
            aria-controls={inputListboxId}
            aria-label={`${columnMeta?.label} boolean filter`}
            size="sm"
            className="w-full rounded"
          >
            <SelectValue placeholder={filter.value ? "True" : "False"} />
          </SelectTrigger>
          <SelectContent id={inputListboxId}>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    case "select":
    case "multiSelect": {
      const inputListboxId = `${inputId}-listbox`;

      const multiple = columnMeta?.variant === "multiSelect";
      const selectedValues = multiple
        ? Array.isArray(filter.value)
          ? filter.value
          : []
        : typeof filter.value === "string"
          ? filter.value
          : undefined;

      return (
        <Faceted
          open={showValueSelector}
          onOpenChange={setShowValueSelector}
          value={selectedValues || []}
          onValueChange={(value) => {
            onFilterUpdate(filter.field, {
              value: value || [],
            });
            if (columnMeta?.closeOnSelect) {
              setShowValueSelector(false);
            }
          }}
          multiple={multiple}
        >
          <FacetedTrigger asChild>
            <Button
              id={inputId}
              aria-controls={inputListboxId}
              aria-label={`${columnMeta?.label} filter value${multiple ? "s" : ""}`}
              variant="outline"
              size="sm"
              className="h-8 w-full min-h-8 rounded font-normal"
            >
              <FacetedBadgeList
                options={columnMeta?.options}
                placeholder={
                  columnMeta?.placeholder ??
                  `Select option${multiple ? "s" : ""}...`
                }
              />
            </Button>
          </FacetedTrigger>
          <FacetedContent id={inputListboxId} className="w-[200px]">
            <FacetedInput
              aria-label={`Search ${columnMeta?.label} options`}
              placeholder={columnMeta?.placeholder ?? "Search options..."}
            />
            <FacetedList className="max-h-[420px]">
              <FacetedEmpty>No options found.</FacetedEmpty>
              <FacetedGroup>
                {columnMeta?.options?.map((option) => (
                  <FacetedItem key={option.value} value={option.value}>
                    {option.icon && <option.icon />}
                    <span>{option.label}</span>
                    {option.count && (
                      <span className="ml-auto font-mono text-xs">
                        {option.count}
                      </span>
                    )}
                  </FacetedItem>
                ))}
              </FacetedGroup>
            </FacetedList>
          </FacetedContent>
        </Faceted>
      );
    }

    case "date":
    case "dateRange": {
      const inputListboxId = `${inputId}-listbox`;

      const dateValue = Array.isArray(filter.value)
        ? filter.value.filter(Boolean)
        : [filter.value, filter.value].filter(Boolean);

      const displayValue =
        filter.operator === "isBetween" && dateValue.length === 2
          ? `${formatDate(new Date(Number(dateValue[0])))} - ${formatDate(
            new Date(Number(dateValue[1])),
          )}`
          : dateValue[0]
            ? formatDate(new Date(Number(dateValue[0])))
            : "Pick a date";

      return (
        <Popover open={showValueSelector} onOpenChange={setShowValueSelector}>
          <PopoverTrigger asChild>
            <Button
              id={inputId}
              aria-controls={inputListboxId}
              aria-label={`${columnMeta?.label} date filter`}
              variant="outline"
              size="sm"
              className={cn(
                "h-8 w-full justify-start rounded text-left font-normal",
                !filter.value && "text-muted-foreground",
              )}
            >
              <CalendarIcon />
              <span className="truncate">{displayValue}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id={inputListboxId}
            align="start"
            className="w-auto p-0"
          >
            {filter.operator === "isBetween" ? (
              <Calendar
                aria-label={`Select ${columnMeta?.label} date range`}
                autoFocus
                captionLayout="dropdown"
                mode="range"
                selected={
                  dateValue.length === 2
                    ? {
                      from: new Date(Number(dateValue[0])),
                      to: new Date(Number(dateValue[1])),
                    }
                    : {
                      from: new Date(),
                      to: new Date(),
                    }
                }
                onSelect={(date) => {
                  onFilterUpdate(filter.field, {
                    value: date
                      ? [
                        (date.from?.getTime() ?? "").toString(),
                        (date.to?.getTime() ?? "").toString(),
                      ]
                      : [],
                  });
                }}
              />
            ) : (
              <Calendar
                aria-label={`Select ${columnMeta?.label} date`}
                autoFocus
                captionLayout="dropdown"
                mode="single"
                selected={
                  dateValue[0] ? new Date(Number(dateValue[0])) : undefined
                }
                onSelect={(date) => {
                  onFilterUpdate(filter.field, {
                    value: (date?.getTime() ?? "").toString(),
                  });
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      );
    }

    default:
      return null;
  }
}
