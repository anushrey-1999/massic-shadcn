"use client";

import type { ColumnSort, SortDirection, Table } from "@tanstack/react-table";
import {
  ArrowDownUp,
  ChevronsUpDown,
  Trash2,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { dataTableConfig } from "@/components/filter-table/data-table-config";
import { cn } from "@/lib/utils";

const SORT_SHORTCUT_KEY = "s";
const REMOVE_SORT_SHORTCUTS = ["backspace", "delete"];

interface UnifiedSortListProps<TLeftData, TRightData> {
  leftTable: Table<TLeftData>;
  rightTable: Table<TRightData>;
  columnMapping?: Record<string, string>; // Maps left column IDs to right column IDs
}

export function UnifiedSortList<TLeftData, TRightData>({
  leftTable,
  rightTable,
  columnMapping = {},
}: UnifiedSortListProps<TLeftData, TRightData>) {
  const id = React.useId();
  const labelId = React.useId();
  const descriptionId = React.useId();
  const [open, setOpen] = React.useState(false);
  const addButtonRef = React.useRef<HTMLButtonElement>(null);

  // Combine sorting from both tables
  const leftSorting = leftTable.getState().sorting;
  const rightSorting = rightTable.getState().sorting;
  const combinedSorting = React.useMemo(() => {
    const sorts: Array<ColumnSort & { tableType: 'left' | 'right'; displayId: string }> = [];
    leftSorting.forEach(sort => {
      sorts.push({ ...sort, tableType: 'left', displayId: `left:${sort.id}` });
    });
    rightSorting.forEach(sort => {
      sorts.push({ ...sort, tableType: 'right', displayId: `right:${sort.id}` });
    });
    return sorts;
  }, [leftSorting, rightSorting]);

  // Combine columns from both tables
  const { columnLabels, columns } = React.useMemo(() => {
    const labels = new Map<string, string>();
    const sortingIds = new Set(combinedSorting.map((s) => s.displayId));
    const availableColumns: { id: string; label: string; table: 'left' | 'right' }[] = [];

    // Add left table columns
    for (const column of leftTable.getAllColumns()) {
      if (!column.getCanSort()) continue;
      const label = column.columnDef.meta?.label ?? column.id;
      const columnId = `left:${column.id}`;
      labels.set(columnId, label);
      if (!sortingIds.has(columnId)) {
        availableColumns.push({ id: columnId, label, table: 'left' });
      }
    }

    // Add right table columns
    for (const column of rightTable.getAllColumns()) {
      if (!column.getCanSort()) continue;
      const label = column.columnDef.meta?.label ?? column.id;
      const columnId = `right:${column.id}`;
      labels.set(columnId, label);
      if (!sortingIds.has(columnId)) {
        availableColumns.push({ id: columnId, label, table: 'right' });
      }
    }

    return {
      columnLabels: labels,
      columns: availableColumns,
    };
  }, [combinedSorting, leftTable, rightTable]);

  const onSortAdd = React.useCallback(() => {
    const firstColumn = columns[0];
    if (!firstColumn) return;

    const columnId = firstColumn.id.replace(/^(left|right):/, '');
    if (firstColumn.table === 'left') {
      leftTable.setSorting((prev) => [
        ...prev,
        { id: columnId, desc: false },
      ]);
    } else {
      rightTable.setSorting((prev) => [
        ...prev,
        { id: columnId, desc: false },
      ]);
    }
  }, [columns, leftTable, rightTable]);

  const onSortUpdate = React.useCallback(
    (sortId: string, updates: Partial<ColumnSort>) => {
      const [tableType, actualColumnId] = sortId.split(':');
      const newSortId = updates.id ? updates.id : sortId;
      const [newTableType, newActualColumnId] = newSortId.includes(':') 
        ? newSortId.split(':') 
        : [tableType, newSortId];

      if (newTableType === 'left') {
        leftTable.setSorting((prev) => {
          const filtered = prev.filter(s => s.id !== actualColumnId);
          return [...filtered, { id: newActualColumnId, desc: updates.desc ?? false }];
        });
        // Sync to right table if mapped
        if (columnMapping[newActualColumnId]) {
          rightTable.setSorting((prev) => {
            const filtered = prev.filter(s => s.id !== columnMapping[newActualColumnId]);
            return [...filtered, { id: columnMapping[newActualColumnId], desc: updates.desc ?? false }];
          });
        }
      } else {
        rightTable.setSorting((prev) => {
          const filtered = prev.filter(s => s.id !== actualColumnId);
          return [...filtered, { id: newActualColumnId, desc: updates.desc ?? false }];
        });
      }
    },
    [leftTable, rightTable, columnMapping],
  );

  const onSortRemove = React.useCallback(
    (sortId: string) => {
      const [tableType, actualColumnId] = sortId.split(':');
      if (tableType === 'left') {
        leftTable.setSorting((prev) => prev.filter((item) => item.id !== actualColumnId));
        // Remove from right if mapped
        if (columnMapping[actualColumnId]) {
          rightTable.setSorting((prev) => prev.filter((item) => item.id !== columnMapping[actualColumnId]));
        }
      } else {
        rightTable.setSorting((prev) => prev.filter((item) => item.id !== actualColumnId));
      }
    },
    [leftTable, rightTable, columnMapping],
  );

  const onSortingReset = React.useCallback(
    () => {
      leftTable.setSorting(leftTable.initialState.sorting);
      rightTable.setSorting(rightTable.initialState.sorting);
    },
    [leftTable, rightTable],
  );

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
        event.key.toLowerCase() === SORT_SHORTCUT_KEY &&
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
        REMOVE_SORT_SHORTCUTS.includes(event.key.toLowerCase()) &&
        combinedSorting.length > 0
      ) {
        event.preventDefault();
        onSortingReset();
      }
    },
    [combinedSorting.length, onSortingReset],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-normal"
          onKeyDown={onTriggerKeyDown}
        >
          <ArrowDownUp className="text-muted-foreground" />
          Sort
          {combinedSorting.length > 0 && (
            <Badge
              variant="secondary"
              className="h-[18.24px] rounded-[3.2px] px-[5.12px] font-mono font-normal text-[10.4px]"
            >
              {combinedSorting.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        className="flex w-full max-w-(--radix-popover-content-available-width) flex-col gap-3.5 p-4 sm:min-w-[380px]"
      >
        <div className="flex flex-col gap-1">
          <h4 id={labelId} className="font-medium leading-none">
            {combinedSorting.length > 0 ? "Sort by" : "No sorting applied"}
          </h4>
          <p
            id={descriptionId}
            className={cn(
              "text-muted-foreground text-sm",
              combinedSorting.length > 0 && "sr-only",
            )}
          >
            {combinedSorting.length > 0
              ? "Modify sorting to organize your rows."
              : "Add sorting to organize your rows."}
          </p>
        </div>
        {combinedSorting.length > 0 && (
          <ul className="flex max-h-[300px] flex-col gap-2 overflow-y-auto p-1">
            {combinedSorting.map((sort) => (
              <UnifiedSortItem
                key={sort.displayId}
                sort={sort}
                sortId={sort.displayId}
                sortItemId={`${id}-sort-${sort.displayId}`}
                columns={columns}
                columnLabels={columnLabels}
                onSortUpdate={onSortUpdate}
                onSortRemove={onSortRemove}
              />
            ))}
          </ul>
        )}
        <div className="flex w-full items-center gap-2">
          <Button
            size="sm"
            className="rounded"
            ref={addButtonRef}
            onClick={onSortAdd}
            disabled={columns.length === 0}
          >
            Add sort
          </Button>
          {combinedSorting.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded"
              onClick={onSortingReset}
            >
              Reset sorting
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface UnifiedSortItemProps {
  sort: ColumnSort;
  sortId: string;
  sortItemId: string;
  columns: { id: string; label: string; table: 'left' | 'right' }[];
  columnLabels: Map<string, string>;
  onSortUpdate: (sortId: string, updates: Partial<ColumnSort>) => void;
  onSortRemove: (sortId: string) => void;
}

function UnifiedSortItem({
  sort,
  sortId,
  sortItemId,
  columns,
  columnLabels,
  onSortUpdate,
  onSortRemove,
}: UnifiedSortItemProps) {
  const fieldListboxId = `${sortItemId}-field-listbox`;
  const fieldTriggerId = `${sortItemId}-field-trigger`;
  const directionListboxId = `${sortItemId}-direction-listbox`;

  const [showFieldSelector, setShowFieldSelector] = React.useState(false);
  const [showDirectionSelector, setShowDirectionSelector] =
    React.useState(false);

  const onItemKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLLIElement>) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (showFieldSelector || showDirectionSelector) {
        return;
      }

      if (REMOVE_SORT_SHORTCUTS.includes(event.key.toLowerCase())) {
        event.preventDefault();
        onSortRemove(sortId);
      }
    },
    [sortId, showFieldSelector, showDirectionSelector, onSortRemove],
  );

  const currentLabel = columnLabels.get(sortId) || sort.id.replace(/^(left|right):/, '');

  return (
    <li
      id={sortItemId}
      tabIndex={-1}
      className="flex items-center gap-2"
      onKeyDown={onItemKeyDown}
    >
      <Popover open={showFieldSelector} onOpenChange={setShowFieldSelector}>
        <PopoverTrigger asChild>
          <Button
            id={fieldTriggerId}
            aria-controls={fieldListboxId}
            variant="outline"
            size="sm"
            className="w-44 justify-between rounded font-normal"
          >
            <span className="truncate">{currentLabel}</span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          id={fieldListboxId}
          className="w-(--radix-popover-trigger-width) p-0"
          onOpenAutoFocus={(e) => {
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
                {columns.map((column) => (
                  <CommandItem
                    key={column.id}
                    value={`${column.id} ${column.label}`}
                    onSelect={(value) => {
                      const columnId = value.split(' ')[0];
                      if (columnId) {
                        onSortUpdate(sortId, { id: columnId });
                        setShowFieldSelector(false);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <span className="truncate">{column.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Select
        open={showDirectionSelector}
        onOpenChange={setShowDirectionSelector}
        value={sort.desc ? "desc" : "asc"}
        onValueChange={(value: SortDirection) =>
          onSortUpdate(sortId, { desc: value === "desc" })
        }
      >
        <SelectTrigger
          aria-controls={directionListboxId}
          className="h-8 w-24 rounded data-size:h-8"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          id={directionListboxId}
          className="min-w-(--radix-select-trigger-width)"
        >
          {dataTableConfig.sortOrders.map((order) => (
            <SelectItem key={order.value} value={order.value}>
              {order.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        aria-controls={sortItemId}
        variant="outline"
        size="icon"
        className="size-8 shrink-0 rounded"
        onClick={() => onSortRemove(sortId)}
      >
        <Trash2 />
      </Button>
    </li>
  );
}
