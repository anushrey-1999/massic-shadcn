"use client";

import type { Column } from "@tanstack/react-table";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ExtendedColumnFilter } from "../../types/data-table-types";

interface DataTableRangeFilterProps<TData> extends React.ComponentProps<"div"> {
  filter: ExtendedColumnFilter<TData>;
  column: Column<TData>;
  inputId: string;
  onFilterUpdate: (
    filterId: string,
    updates: Partial<Omit<ExtendedColumnFilter<TData>, "filterId">>,
  ) => void;
}

export function DataTableRangeFilter<TData>({
  filter,
  column,
  inputId,
  onFilterUpdate,
  className,
  ...props
}: DataTableRangeFilterProps<TData>) {
  const meta = column.columnDef.meta;

  const [min, max] = React.useMemo(() => {
    const range = column.columnDef.meta?.range;
    if (range) return range;

    const values = column.getFacetedMinMaxValues();
    if (!values) return [0, 100];

    return [values[0], values[1]];
  }, [column]);

  const step = meta?.step ?? 1;
  const decimalPlaces = step < 1 ? Math.ceil(-Math.log10(step)) : 0;

  const formatValue = React.useCallback(
    (value: string | number | undefined) => {
      if (value === undefined || value === "") return "";
      const numValue = Number(value);
      return Number.isNaN(numValue)
        ? ""
        : numValue.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: decimalPlaces,
        });
    },
    [decimalPlaces],
  );

  const value = React.useMemo(() => {
    if (Array.isArray(filter.value)) return filter.value.map(formatValue);
    return [formatValue(filter.value), ""];
  }, [filter.value, formatValue]);

  const unit = meta?.unit;
  const isFreeForm = Boolean(meta?.placeholder);

  const onRangeValueChange = React.useCallback(
    (value: string, isMin?: boolean) => {
      const currentValues = Array.isArray(filter.value) ? filter.value : ["", ""];
      const otherValue = isMin ? (currentValues[1] ?? "") : (currentValues[0] ?? "");

      if (isFreeForm) {
        onFilterUpdate(filter.field, {
          value: isMin ? [value, otherValue] : [otherValue, value],
        });
        return;
      }

      const numValue = Number(value);
      if (
        value === "" ||
        (!Number.isNaN(numValue) &&
          (isMin
            ? numValue >= min && numValue <= (Number(otherValue) || max)
            : numValue <= max && numValue >= (Number(otherValue) || min)))
      ) {
        onFilterUpdate(filter.field, {
          value: isMin ? [value, otherValue] : [otherValue, value],
        });
      }
    },
    [filter.field, filter.value, min, max, onFilterUpdate, isFreeForm],
  );

  const renderInput = (
    id: string,
    ariaLabel: string,
    slot: string,
    defaultVal: string,
    isMin: boolean,
  ) => {
    const placeholder = isFreeForm
      ? (meta?.placeholder ?? "")
      : (isMin ? min.toString() : max.toString());

    const input = isFreeForm ? (
      <Input
        id={id}
        type="text"
        aria-label={ariaLabel}
        data-slot={slot}
        placeholder={placeholder}
        className="h-8! w-full rounded"
        defaultValue={defaultVal}
        onChange={(event) => onRangeValueChange(event.target.value, isMin)}
      />
    ) : (
      <Input
        id={id}
        type="number"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        data-slot={slot}
        inputMode={decimalPlaces > 0 ? "decimal" : "numeric"}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={cn("h-8! w-full rounded", unit && "pr-7")}
        defaultValue={defaultVal}
        onChange={(event) => onRangeValueChange(event.target.value, isMin)}
      />
    );

    if (!unit) return input;

    return (
      <div className="relative w-full">
        {input}
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    );
  };

  return (
    <div
      data-slot="range"
      className={cn("flex w-full items-center gap-2", className)}
      {...props}
    >
      {renderInput(`${inputId}-min`, `${meta?.label} minimum value`, "range-min", value[0], true)}
      <span className="sr-only shrink-0 text-muted-foreground">to</span>
      {renderInput(`${inputId}-max`, `${meta?.label} maximum value`, "range-max", value[1], false)}
    </div>
  );
}
