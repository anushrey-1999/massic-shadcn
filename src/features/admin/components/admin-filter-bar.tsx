"use client";

import { useQuery } from "@tanstack/react-query";
import { Filter, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminFilters } from "../api/admin-api";
import { useAdminQueryState } from "../hooks/use-admin-query-state";

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value?: string) => void;
}) {
  return (
    <Select
      value={value || "__all"}
      onValueChange={(next) => onChange(next === "__all" ? undefined : next)}
    >
      <SelectTrigger className="h-8 min-w-[132px] rounded-md bg-white/85 text-xs transition-colors hover:border-general-primary/35">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">All {label.toLowerCase()}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AdminFilterBar() {
  const { agencyId, industry, plan, status, setQuery } = useAdminQueryState();
  const query = useQuery({
    queryKey: ["admin", "filters"],
    queryFn: getAdminFilters,
    staleTime: 60_000,
  });
  const active = Boolean(agencyId || industry || plan || status);
  return (
    <div
      className="admin-toolbar mb-5 flex min-h-10 flex-wrap items-center gap-2 rounded-lg border p-2 shadow-xs"
      aria-label="Admin filters"
    >
      <span className="inline-flex items-center gap-1.5 px-1 text-xs font-medium text-general-muted-foreground">
        {query.isLoading ? (
          <Loader2 className="size-3.5 animate-spin text-general-primary" />
        ) : (
          <Filter className="size-3.5 text-general-primary" />
        )}
        Filters
      </span>
      {query.data?.data && (
        <>
          <FilterSelect
            label="Agencies"
            value={agencyId}
            options={query.data.data.agencies}
            onChange={(value) => setQuery({ agencyId: value || null })}
          />
          <FilterSelect
            label="Industries"
            value={industry}
            options={query.data.data.industries.map((value) => ({
              value,
              label: value,
            }))}
            onChange={(value) => setQuery({ industry: value || null })}
          />
          <FilterSelect
            label="Plans"
            value={plan}
            options={query.data.data.plans.map((value) => ({
              value,
              label: value,
            }))}
            onChange={(value) => setQuery({ plan: value || null })}
          />
          <FilterSelect
            label="Signals"
            value={status}
            options={query.data.data.statuses.map((value) => ({
              value,
              label: value
                .replace("_", " ")
                .replace(/^./, (char) => char.toUpperCase()),
            }))}
            onChange={(value) => setQuery({ status: value || null })}
          />
        </>
      )}
      {active && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 text-xs transition-colors hover:bg-general-primary/8 hover:text-general-primary"
          onClick={() =>
            setQuery({
              agencyId: null,
              industry: null,
              plan: null,
              status: null,
            })
          }
        >
          <RotateCcw />
          Clear
        </Button>
      )}
    </div>
  );
}
