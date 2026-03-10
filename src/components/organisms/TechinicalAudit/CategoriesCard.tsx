"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { CATEGORY_META, type CategoryKey } from "./types";

function CriticalBadge({ count }: { count: number }) {
  return (
    <Badge className="rounded-lg border-transparent bg-red-100 px-2 py-1 text-[10px] font-medium tracking-[0.015em] text-red-600 hover:bg-red-100">
      {count} critical
    </Badge>
  );
}

function WarningBadge({ count }: { count: number }) {
  return (
    <Badge className="rounded-lg border-transparent bg-amber-100 px-2 py-1 text-[10px] font-medium tracking-[0.015em] text-amber-700 hover:bg-amber-100">
      {count} warning
    </Badge>
  );
}

function NoticeBadge({ count }: { count: number }) {
  return (
    <Badge className="rounded-lg border-transparent bg-[#F5F5F5] px-2 py-1 text-[10px] font-medium tracking-[0.015em] text-general-muted-foreground hover:bg-[#F5F5F5]">
      {count} notice
    </Badge>
  );
}

function CategoryTile({
  category,
  totalCount,
  criticalCount,
  warningCount,
  noticeCount,
  isSelected,
  onToggle,
}: {
  category: CategoryKey;
  totalCount: number;
  criticalCount: number;
  warningCount: number;
  noticeCount: number;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const Icon = CATEGORY_META[category].icon;
  const label = CATEGORY_META[category].label;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full cursor-pointer rounded-lg border border-general-border bg-white p-4 text-left transition-colors",
        isSelected
          ? "border-general-primary bg-linear-to-r from-general-primary/5 to-general-primary-gradient-to/5"
          : "border-border hover:border-general-primary hover:bg-background"
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "h-6 w-6",
            isSelected ? "text-general-primary" : "text-general-border-three"
          )}
        />
        <Typography
          variant="p"
          className={cn(
            "text-base font-mono",
            isSelected ? "text-general-primary" : "text-general-muted-foreground"
          )}
        >
          {label}
        </Typography>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Typography variant="h2" className="text-general-foreground">
          {totalCount}
        </Typography>
        <CriticalBadge count={criticalCount} />
        <WarningBadge count={warningCount} />
        <NoticeBadge count={noticeCount} />
      </div>
    </button>
  );
}

export function CategoriesCard({
  selectedCategory,
  categoryCounts,
  categories,
  onCategoryToggle,
}: {
  selectedCategory: CategoryKey | null;
  categoryCounts: Record<
    CategoryKey,
    { total: number; critical: number; warning: number; notice: number }
  >;
  categories?: CategoryKey[];
  onCategoryToggle: (key: CategoryKey) => void;
}) {
  const visibleCategories = React.useMemo(() => {
    const base = Object.keys(CATEGORY_META) as CategoryKey[];
    if (!categories) return base;
    return categories;
  }, [categories]);

  return (
    <Card className="flex-1 gap-3 rounded-xl border-none  px-3 py-3 shadow-none">
      <div className="flex items-center justify-between">
        <Typography variant="p" className="text-base font-mono text-general-foreground">
          Categories
        </Typography>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {visibleCategories.map((key) => (
          <CategoryTile
            key={key}
            category={key}
            totalCount={categoryCounts[key].total}
            criticalCount={categoryCounts[key].critical}
            warningCount={categoryCounts[key].warning}
            noticeCount={categoryCounts[key].notice}
            isSelected={selectedCategory === key}
            onToggle={() => onCategoryToggle(key)}
          />
        ))}
      </div>
    </Card>
  );
}

