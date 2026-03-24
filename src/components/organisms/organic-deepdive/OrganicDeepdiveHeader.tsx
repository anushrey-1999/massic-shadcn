"use client";

import { X } from "lucide-react";
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
      case "keyword_scope":
        return filter.expression === "branded"
          ? "Branded queries"
          : "Non-branded queries";
      default:
        return filter.expression;
    }
  };

  return (
    <div className="flex flex-row items-center self-stretch">
      <div
        className="bg-white border border-general-border rounded-lg flex gap-1.5 items-center justify-center min-h-6 px-2 py-1.5 cursor-pointer hover:bg-blue-50 transition-colors"
        onClick={() => onRemove(filter.dimension)}
      >
        <X className="h-3 w-3 text-neutral-400" strokeWidth={2} />
        <span className="font-sans font-medium text-xs text-general-foreground text-center tracking-wide leading-normal max-w-[320px] truncate">
          {getLabel()}
        </span>
      </div>
    </div>
  );
}

interface OrganicDeepdiveHeaderProps {
  filters: DeepdiveFilter[];
  onRemoveFilter: (dimension: FilterDimension) => void;
}

export function OrganicDeepdiveHeader({
  filters,
  onRemoveFilter,
}: OrganicDeepdiveHeaderProps) {
  return (
    <div className="flex items-center justify-between py-2 w-full bg-blue-50 rounded-lg px-2 border border-blue-100 mb-4">
      <div />

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
