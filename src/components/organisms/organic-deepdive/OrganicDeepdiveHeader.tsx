"use client";

import { Search, X } from "lucide-react";
import { PeriodSelector } from "@/components/molecules/analytics";
import { type TimePeriodValue } from "@/hooks/use-gsc-analytics";
import {
  type DeepdiveFilter,
  type FilterDimension,
} from "@/hooks/use-organic-deepdive-filters";

interface FilterBadgeProps {
  filter: DeepdiveFilter;
  onRemove: (dimension: FilterDimension) => void;
}

function FilterBadge({ filter, onRemove }: FilterBadgeProps) {
  const getLabel = () => {
    switch (filter.dimension) {
      case "query":
        return `Query: ${filter.expression}`;
      case "page":
        return `Page: ${filter.expression}`;
      case "content_group":
        return `Group: ${filter.expression}`;
      default:
        return filter.expression;
    }
  };

  return (
    <div className="flex flex-row items-center self-stretch">
      <div
        className="bg-general-unofficial-outline border border-general-border rounded-lg flex gap-1.5 items-center justify-center min-h-6 px-2 py-1.5 cursor-pointer hover:bg-neutral-100 transition-colors"
        onClick={() => onRemove(filter.dimension)}
      >
        <X className="h-3 w-3 text-neutral-400" strokeWidth={2} />
        <span className="font-sans font-medium text-xs text-general-foreground text-center tracking-wide leading-normal max-w-[150px] truncate">
          {getLabel()}
        </span>
      </div>
    </div>
  );
}

interface OrganicDeepdiveHeaderProps {
  period: TimePeriodValue;
  onPeriodChange: (value: TimePeriodValue) => void;
  filters: DeepdiveFilter[];
  onRemoveFilter: (dimension: FilterDimension) => void;
}

export function OrganicDeepdiveHeader({
  period,
  onPeriodChange,
  filters,
  onRemoveFilter,
}: OrganicDeepdiveHeaderProps) {
  return (
    <div className="flex items-center justify-between py-4 w-full">
      <div className="flex gap-2 items-center">
        <Search className="h-[22px] w-[22px] text-general-muted-foreground" strokeWidth={1.5} />
        <p className="font-mono font-normal leading-normal text-base text-general-muted-foreground">
          Organic Deep Dive
        </p>
        <div className="ml-2">
          <PeriodSelector value={period} onValueChange={onPeriodChange} />
        </div>
      </div>

      {filters.length > 0 && (
        <div className="flex gap-2 items-center">
          {filters.map((filter) => (
            <FilterBadge
              key={filter.dimension}
              filter={filter}
              onRemove={onRemoveFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
