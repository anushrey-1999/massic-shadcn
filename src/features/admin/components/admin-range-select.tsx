"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminRangeKey } from "../types";

export const ADMIN_RANGES: Array<{ value: AdminRangeKey; label: string }> = [
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_28_days", label: "Last 28 days" },
  { value: "mtd", label: "Month to date" },
  { value: "last_month", label: "Last month" },
  { value: "qtd", label: "Quarter to date" },
  { value: "ytd", label: "Year to date" },
  { value: "lifetime", label: "Lifetime" },
];

export function AdminRangeSelect({
  value,
  onChange,
  disabled,
}: {
  value: AdminRangeKey;
  onChange: (value: AdminRangeKey) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as AdminRangeKey)}
      disabled={disabled}
    >
      <SelectTrigger className="h-9 w-[156px] rounded-md border-general-border bg-white/90 text-sm shadow-xs transition-colors hover:border-general-primary/35">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {ADMIN_RANGES.map((range) => (
          <SelectItem key={range.value} value={range.value}>
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
