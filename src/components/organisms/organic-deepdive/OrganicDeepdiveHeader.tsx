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
        if (filter.label) {
          return `Topic: ${filter.label}`;
        }
        if (Array.isArray(filter.expression)) {
          return `Queries: ${filter.expression.length} terms`;
        }
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
      <button
        type="button"
        className="bg-white border border-general-border rounded-md flex gap-1.5 items-center justify-center h-6 px-2.5 cursor-pointer hover:bg-blue-50 transition-colors"
        onClick={() => onRemove(filter.dimension)}
      >
        <span className="font-sans font-medium text-xs text-general-foreground text-center leading-none max-w-[320px] truncate">
          {getLabel()}
        </span>
        <X className="h-3 w-3 text-neutral-400" strokeWidth={2} />
      </button>
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
    <div className="flex items-center justify-between p-0.5 w-full bg-blue-50 rounded-md border border-blue-100 mb-3">
      <div />

      {filters.length > 0 && (
        <div className="flex gap-1.5 items-center">
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
