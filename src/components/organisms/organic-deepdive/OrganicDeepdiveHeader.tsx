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
  const getBadgeParts = () => {
    switch (filter.dimension) {
      case "query":
        if (filter.label) {
          return { label: "Topic", value: filter.label };
        }
        if (Array.isArray(filter.expression)) {
          return { label: "Queries", value: `${filter.expression.length} terms` };
        }
        return { label: "Query", value: filter.expression };
      case "page":
        return { label: "Page", value: filter.expression };
      case "content_group":
        return { label: "Group", value: filter.expression };
      case "keyword_scope":
        return {
          label: "Keyword",
          value: filter.expression === "branded" ? "Branded queries" : "Non-branded queries",
        };
      default:
        return { label: "Filter", value: filter.expression };
    }
  };
  const badgeParts = getBadgeParts();

  return (
    <div className="flex flex-row items-center self-stretch">
      <button
        type="button"
        className="flex h-6 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2E6A56] px-3 transition-colors hover:bg-[#255745]"
        onClick={() => onRemove(filter.dimension)}
      >
        <span className="flex min-w-0 items-center gap-1.5 font-sans text-sm leading-normal tracking-[0.07px]">
          <span className="shrink-0 font-medium text-white/65">{badgeParts.label}</span>
          <span className="max-w-[320px] truncate font-semibold text-white">
            {badgeParts.value}
          </span>
        </span>
        <X className="h-4 w-4 shrink-0 text-white/70" strokeWidth={2} />
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
    <div className="mb-4 flex w-full items-center justify-between rounded-lg border border-[#6EC1A6] bg-[#2E6A561A] px-2 py-2">
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
