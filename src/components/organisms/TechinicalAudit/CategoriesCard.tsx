"use client";

import * as React from "react";
import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { CATEGORY_META, type CategoryKey } from "./types";

function CriticalBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge className="rounded-lg border-transparent bg-red-100 px-2 py-1 text-[10px] font-medium tracking-[0.015em] text-red-600 hover:bg-red-100">
      {count} critical
    </Badge>
  );
}

function CategoryTile({
  category,
  totalCount,
  criticalCount,
  isSelected,
  onToggle,
}: {
  category: CategoryKey;
  totalCount: number;
  criticalCount: number;
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
        "cursor-pointer rounded-lg border border-general-border bg-white p-4 text-left transition-colors",
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
      </div>
    </button>
  );
}

export function CategoriesCard({
  selectedCategory,
  categoryCounts,
  lastUpdatedLabel,
  onCategoryToggle,
  onRegenerate,
}: {
  selectedCategory: CategoryKey | null;
  categoryCounts: Record<CategoryKey, { total: number; critical: number }>;
  lastUpdatedLabel: string;
  onCategoryToggle: (key: CategoryKey) => void;
  onRegenerate?: () => void;
}) {
  const categories = React.useMemo(
    () => Object.keys(CATEGORY_META) as CategoryKey[],
    []
  );
  const [regenerateOpen, setRegenerateOpen] = React.useState(false);

  return (
    <Card className="flex-1 gap-3 rounded-xl border-none bg-foreground-light px-3 py-3 shadow-none">
      <div className="flex items-center justify-between">
        <Typography variant="p" className="text-base font-mono text-general-foreground">
          Categories
        </Typography>

        <div className="flex items-center gap-3">
          <Typography
            variant="p"
            className="text-base font-mono text-general-muted-foreground"
          >
            {lastUpdatedLabel}
          </Typography>
          <Button
            className="gap-2"
            onClick={() => setRegenerateOpen(true)}
            variant='default'
            type="button"
            size="sm"
          >
            <RotateCw className="h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {categories.map((key) => (
          <CategoryTile
            key={key}
            category={key}
            totalCount={categoryCounts[key].total}
            criticalCount={categoryCounts[key].critical}
            isSelected={selectedCategory === key}
            onToggle={() => onCategoryToggle(key)}
          />
        ))}
      </div>

      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-4 rounded-xl border border-border bg-white p-6 sm:max-w-[640px]"
        >
          <DialogHeader className="gap-0">
            <DialogTitle className="font-sans text-2xl font-semibold tracking-[-0.48px] text-general-foreground">
              Regenerate Technical Audit?
            </DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="space-y-8">
            <div className="space-y-2 font-sans">
              <p className="text-sm leading-normal tracking-[0.07px] text-[rgba(0,0,0,0.87)]">
                Your plan includes 1 technical audit per month, which you’ve already used.
                <br />
                Regenerating now will refresh the audit using credits. Your current results
                won’t change until you confirm.
              </p>
              <p className="text-xs leading-normal tracking-[0.18px] text-general-muted-foreground">
                Note: Results update only if new or changed issues are found. If nothing has
                changed, you’ll see the same audit.
              </p>
            </div>

            <Button
              type="button"
              className="h-10 w-full rounded-lg font-sans text-sm font-medium"
              onClick={() => {
                onRegenerate?.();
                setRegenerateOpen(false);
              }}
            >
              Apply 10 Credits &amp; Regenerate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

