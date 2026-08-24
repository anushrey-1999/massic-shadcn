"use client";

import { forwardRef, useId, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  ChartLine,
  Check,
  ChevronDown,
  History,
  type LucideIcon,
  Pencil,
  Plus,
  Tag,
  X,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardTagsSheet } from "@/components/molecules/home/DashboardTagsSheet";
import type { useDashboardTags } from "@/hooks/use-dashboard-tags";
import type { BusinessProfile } from "@/store/business-store";
import { cn } from "@/lib/utils";

export const HOME_PERIODS = [
  { label: "7 Days", value: "7 days" },
  { label: "14 Days", value: "14 days" },
  { label: "28 Days", value: "28 days" },
  { label: "3 Months", value: "3 months" },
  { label: "6 Months", value: "6 months" },
  { label: "12 Months", value: "12 months" },
] as const;

export type HomePeriodValue = (typeof HOME_PERIODS)[number]["value"];

export const HOME_SIGNAL_FILTERS = [
  { value: "red", label: "Check", dotClassName: "bg-[#E24B4A]" },
  { value: "amber", label: "Dip", dotClassName: "bg-[#D88A10]" },
  { value: "gray", label: "No Signal", dotClassName: "bg-[#708091]" },
  { value: "green", label: "Strong", dotClassName: "bg-[#639922]" },
] as const;

export type HomeSignalFilterValue =
  (typeof HOME_SIGNAL_FILTERS)[number]["value"];

export type HomeSignalCounts = Record<HomeSignalFilterValue, number>;

type DashboardTagsController = ReturnType<typeof useDashboardTags>;

type HomeFilterBarProps = {
  selectedSignals: HomeSignalFilterValue[];
  onSelectedSignalsChange: (value: HomeSignalFilterValue[]) => void;
  signalCounts: HomeSignalCounts;

  period: HomePeriodValue;
  onPeriodChange: (value: HomePeriodValue) => void;

  showActive: boolean;
  onShowActiveChange: (value: boolean) => void;
  showOnboarding: boolean;
  onShowOnboardingChange: (value: boolean) => void;

  selectedTagIds: string[];
  onSelectedTagIdsChange: (value: string[]) => void;

  profiles: BusinessProfile[];
  dashboardTags: DashboardTagsController;
};

/** Selections beyond this many collapse into a "+N more" badge on the trigger. */
const MAX_VISIBLE_SELECTIONS = 2;

/**
 * Shared chrome for every control in the bar so the dropdown triggers, the stage
 * box and the ghost "New tag" button all land on the same 36px baseline.
 */
const CONTROL_BASE_CLASS =
  "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-4 py-[7.5px] text-sm leading-[1.5] font-medium tracking-[0.07px] whitespace-nowrap transition-colors";

const TRIGGER_CLASS = cn(
  CONTROL_BASE_CLASS,
  "text-general-foreground cursor-pointer justify-center border bg-white",
  "hover:bg-secondary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

const MENU_CONTENT_CLASS =
  "border-general-border min-w-[220px] rounded-md bg-white p-1 shadow-lg";

const MENU_ITEM_CLASS =
  "text-general-unofficial-foreground-alt focus:text-general-foreground h-[34px] cursor-pointer gap-2 rounded-md px-2.5 text-sm focus:bg-secondary";

/** Icons stay muted regardless of selection; only the label carries emphasis. */
const ICON_CLASS = "text-general-muted-foreground size-[13.25px] shrink-0";

type FilterTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  /** Darkens the border and lifts the shadow once the filter narrows results. */
  selected?: boolean;
  children: ReactNode;
};

const FilterTrigger = forwardRef<HTMLButtonElement, FilterTriggerProps>(
  function FilterTrigger(
    { icon: Icon, selected = false, className, children, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          TRIGGER_CLASS,
          selected
            ? "border-general-border-four shadow-sm"
            : "border-general-border-three shadow-xs",
          className
        )}
        {...props}
      >
        <Icon className={ICON_CLASS} strokeWidth={1.5} aria-hidden />
        <span className="flex items-center gap-1.5">{children}</span>
        <ChevronDown className={ICON_CLASS} strokeWidth={1.5} aria-hidden />
      </button>
    );
  }
);

function SignalDot({ className }: { className: string }) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", className)}
      aria-hidden
    />
  );
}

function TriggerBadge({ children }: { children: ReactNode }) {
  return (
    <span className="bg-secondary text-general-secondary-foreground inline-flex min-h-6 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 py-[3px] text-[10px] leading-[1.5] font-medium tracking-[0.15px] whitespace-nowrap">
      {children}
    </span>
  );
}

type SelectionChip = {
  key: string;
  label: string;
  dotClassName?: string;
};

/** Trigger summary for a multi-select filter: first few chips, then an overflow count. */
function SelectionSummary({ items }: { items: SelectionChip[] }) {
  const visible = items.slice(0, MAX_VISIBLE_SELECTIONS);
  const overflow = items.length - visible.length;

  return (
    <span className="flex items-center gap-1">
      {visible.map((item) => (
        <TriggerBadge key={item.key}>
          {item.dotClassName ? <SignalDot className={item.dotClassName} /> : null}
          {item.label}
        </TriggerBadge>
      ))}
      {overflow > 0 ? <TriggerBadge>+{overflow} more</TriggerBadge> : null}
    </span>
  );
}

/** Right-hand cluster of a menu row: optional count, then the selection check. */
function MenuTrailing({
  count,
  checked,
}: {
  count?: number;
  checked: boolean;
}) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-2.5 pl-4">
      {count === undefined ? null : (
        <span className="text-general-muted-foreground text-xs tabular-nums">
          {count}
        </span>
      )}
      <Check
        className={cn(
          "text-general-primary size-4",
          checked ? "opacity-100" : "opacity-0"
        )}
        strokeWidth={2}
        aria-hidden
      />
    </span>
  );
}

function MenuCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
        checked
          ? "border-general-primary bg-general-primary text-white"
          : "border-general-border-three bg-white"
      )}
      aria-hidden
    >
      {checked ? <Check className="size-3" strokeWidth={2.5} /> : null}
    </span>
  );
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function HomeFilterBar({
  selectedSignals,
  onSelectedSignalsChange,
  signalCounts,
  period,
  onPeriodChange,
  showActive,
  onShowActiveChange,
  showOnboarding,
  onShowOnboardingChange,
  selectedTagIds,
  onSelectedTagIdsChange,
  profiles,
  dashboardTags,
}: HomeFilterBarProps) {
  const showActiveId = useId();
  const showOnboardingId = useId();
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [tagSheetMode, setTagSheetMode] = useState<"list" | "create">("list");

  const { tags, isLoading: tagsLoading, isError: tagsError } = dashboardTags;

  // Keep the menu order rather than click order so the trigger reads predictably.
  const selectedSignalOptions = HOME_SIGNAL_FILTERS.filter((option) =>
    selectedSignals.includes(option.value)
  );
  const signalCount = selectedSignalOptions.length;

  const selectedPeriodLabel =
    HOME_PERIODS.find((option) => option.value === period)?.label ??
    HOME_PERIODS[3].label;

  const selectedTagSet = new Set(selectedTagIds);
  const selectedTagOptions = tags.filter((tag) => selectedTagSet.has(tag.id));
  const tagCount = selectedTagOptions.length;

  const hasActiveFilters = signalCount > 0 || tagCount > 0;

  const openTagSheet = (mode: "list" | "create") => {
    setTagSheetMode(mode);
    setTagSheetOpen(true);
  };

  const clearFilters = () => {
    onSelectedSignalsChange([]);
    onSelectedTagIdsChange([]);
  };

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-3"
        role="group"
        aria-label="Dashboard filters"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterTrigger icon={ChartLine} selected={signalCount > 0}>
              {signalCount === 0 ? (
                "Signal"
              ) : signalCount === 1 ? (
                <>
                  <SignalDot className={selectedSignalOptions[0].dotClassName} />
                  {selectedSignalOptions[0].label}
                </>
              ) : (
                <SelectionSummary
                  items={selectedSignalOptions.map((option) => ({
                    key: option.value,
                    label: option.label,
                    dotClassName: option.dotClassName,
                  }))}
                />
              )}
            </FilterTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className={MENU_CONTENT_CLASS}
          >
            <DropdownMenuItem
              role="menuitemradio"
              aria-checked={signalCount === 0}
              onSelect={() => onSelectedSignalsChange([])}
              className={MENU_ITEM_CLASS}
            >
              <span className="truncate">All signals</span>
              <MenuTrailing checked={signalCount === 0} />
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-general-border" />

            {HOME_SIGNAL_FILTERS.map((option) => {
              const checked = selectedSignals.includes(option.value);
              return (
                <DropdownMenuItem
                  key={option.value}
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  // Keep the menu open so several signals can be picked in one pass.
                  onSelect={(event) => {
                    event.preventDefault();
                    onSelectedSignalsChange(
                      toggleValue(selectedSignals, option.value)
                    );
                  }}
                  className={MENU_ITEM_CLASS}
                >
                  <MenuCheckbox checked={checked} />
                  <SignalDot className={option.dotClassName} />
                  <span className="truncate">{option.label}</span>
                  <span className="text-general-muted-foreground ml-auto shrink-0 pl-4 text-xs tabular-nums">
                    {signalCounts[option.value]}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {tagsLoading ? (
          <Skeleton className="h-9 w-[104px] rounded-md" />
        ) : tagsError ? (
          <div className="text-general-muted-foreground flex min-h-9 items-center gap-2 text-sm">
            <span>Tags are unavailable.</span>
            <button
              type="button"
              onClick={() => void dashboardTags.refetch()}
              className="text-general-foreground cursor-pointer font-medium underline-offset-4 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : tags.length === 0 ? (
          <button
            type="button"
            onClick={() => openTagSheet("create")}
            className={cn(
              CONTROL_BASE_CLASS,
              "border-general-border-three text-general-foreground cursor-pointer justify-center border border-dashed bg-transparent",
              "hover:bg-secondary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
            )}
          >
            <Plus className={ICON_CLASS} strokeWidth={1.5} aria-hidden />
            New tag
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterTrigger icon={Tag} selected={tagCount > 0}>
                {tagCount === 0 ? (
                  "Tags"
                ) : (
                  <SelectionSummary
                    items={selectedTagOptions.map((tag) => ({
                      key: tag.id,
                      label: tag.name,
                    }))}
                  />
                )}
              </FilterTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={6}
              className={MENU_CONTENT_CLASS}
            >
              <DropdownMenuItem
                role="menuitemradio"
                aria-checked={tagCount === 0}
                onSelect={() => onSelectedTagIdsChange([])}
                className={MENU_ITEM_CLASS}
              >
                <span className="truncate">All tags</span>
                <MenuTrailing checked={tagCount === 0} />
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-general-border" />

              {tags.map((tag) => {
                const checked = selectedTagSet.has(tag.id);
                return (
                  <DropdownMenuItem
                    key={tag.id}
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    // Keep the menu open so several tags can be picked in one pass.
                    onSelect={(event) => {
                      event.preventDefault();
                      onSelectedTagIdsChange(toggleValue(selectedTagIds, tag.id));
                    }}
                    className={MENU_ITEM_CLASS}
                  >
                    <MenuCheckbox checked={checked} />
                    <span className="truncate">{tag.name}</span>
                    <span className="text-general-muted-foreground ml-auto shrink-0 pl-4 text-xs tabular-nums">
                      {tag.businessCount}
                    </span>
                  </DropdownMenuItem>
                );
              })}

              <DropdownMenuSeparator className="bg-general-border" />

              <DropdownMenuItem
                onSelect={() => openTagSheet("list")}
                className={MENU_ITEM_CLASS}
              >
                <Pencil className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                <span>Manage tags</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterTrigger icon={History}>{selectedPeriodLabel}</FilterTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className={MENU_CONTENT_CLASS}
          >
            {HOME_PERIODS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                role="menuitemradio"
                aria-checked={period === option.value}
                onSelect={() => onPeriodChange(option.value)}
                className={MENU_ITEM_CLASS}
              >
                <span className="truncate">{option.label}</span>
                <MenuTrailing checked={period === option.value} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className={cn(
              CONTROL_BASE_CLASS,
              // 12px bar gap + 12px here matches the 24px gutter in the design.
              "text-general-unofficial-foreground-alt ml-3 cursor-pointer bg-transparent",
              "hover:bg-secondary hover:text-general-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
            )}
          >
            <X className={ICON_CLASS} strokeWidth={1.5} aria-hidden />
            Clear filters
          </button>
        ) : null}

        {/*
          Stage is a view switch rather than a filter: both sections can be shown
          at once, so it stays a checkbox pair instead of a single-choice menu,
          and sits apart from the filters on the trailing edge of the bar.
        */}
        <div
          className={cn(
            CONTROL_BASE_CLASS,
            "border-general-border-three ml-auto gap-4 border bg-white shadow-xs"
          )}
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id={showActiveId}
              checked={showActive}
              onCheckedChange={(checked) => onShowActiveChange(checked === true)}
            />
            <label
              htmlFor={showActiveId}
              className="text-general-foreground cursor-pointer"
            >
              Active
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={showOnboardingId}
              checked={showOnboarding}
              onCheckedChange={(checked) =>
                onShowOnboardingChange(checked === true)
              }
            />
            <label
              htmlFor={showOnboardingId}
              className="text-general-foreground cursor-pointer"
            >
              Onboarding
            </label>
          </div>
        </div>
      </div>

      <DashboardTagsSheet
        open={tagSheetOpen}
        onOpenChange={setTagSheetOpen}
        initialMode={tagSheetMode}
        tags={tags}
        profiles={profiles}
        selectedTagIds={selectedTagIds}
        onSelectedTagIdsChange={onSelectedTagIdsChange}
        createTag={dashboardTags.createTag}
        updateTag={dashboardTags.updateTag}
        deleteTag={dashboardTags.deleteTag}
        isCreating={dashboardTags.isCreating}
        isUpdating={dashboardTags.isUpdating}
        isDeleting={dashboardTags.isDeleting}
      />
    </>
  );
}
