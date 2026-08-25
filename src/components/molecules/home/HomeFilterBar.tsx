"use client";

import { forwardRef, useId, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  Check,
  ChevronDown,
  History,
  type LucideIcon,
  Pencil,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const ALL_SIGNAL_PILL = {
  value: "all",
  label: "All",
  dotClassName: "",
  activeClassName:
    "border border-[#9CC3B0] bg-[#3E6F61] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.55)_inset]",
  inactiveClassName: "border border-transparent bg-[#EEF3F1] text-[#3E6F61]",
  countClassName: "text-white/85",
} as const;

export const HOME_SIGNAL_FILTERS = [
  {
    value: "red",
    label: "Check",
    dotClassName: "bg-[#E24B4A]",
    activeClassName: "border border-[#F4B8B8] bg-[#FDECEC] text-[#E24B4A]",
    inactiveClassName: "border border-transparent bg-[#FDECEC] text-[#E24B4A]",
    countClassName: "text-[#E24B4A]/80",
  },
  {
    value: "amber",
    label: "Dip",
    dotClassName: "bg-[#D88A10]",
    activeClassName: "border border-[#F7D496] bg-[#FFF3D8] text-[#D88A10]",
    inactiveClassName: "border border-transparent bg-[#FFF3D8] text-[#D88A10]",
    countClassName: "text-[#D88A10]/80",
  },
  {
    value: "gray",
    label: "No Signal",
    dotClassName: "bg-[#708091]",
    activeClassName: "border border-[#DBDEE3] bg-[#ECEFF2] text-[#708091]",
    inactiveClassName: "border border-transparent bg-[#ECEFF2] text-[#708091]",
    countClassName: "text-[#708091]/80",
  },
  {
    value: "green",
    label: "Strong",
    dotClassName: "bg-[#639922]",
    activeClassName: "border border-[#D7E8BF] bg-[#EEF6E4] text-[#639922]",
    inactiveClassName: "border border-transparent bg-[#EEF6E4] text-[#639922]",
    countClassName: "text-[#639922]/80",
  },
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

/**
 * Shared chrome for every control in the bar so the dropdown triggers, the stage
 * box and the ghost "Clear filters" button all land on the same 36px baseline.
 */
const CONTROL_BASE_CLASS =
  "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-4 py-[7.5px] text-sm leading-[1.5] font-medium tracking-[0.07px] whitespace-nowrap transition-colors";

const TRIGGER_CLASS = cn(
  CONTROL_BASE_CLASS,
  "text-general-foreground cursor-pointer justify-center border bg-white",
  "hover:bg-secondary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

const ICON_TRIGGER_CLASS = cn(
  "relative inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white transition-colors",
  "hover:bg-secondary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

const MENU_CONTENT_CLASS =
  "border-general-border min-w-[220px] rounded-md bg-white p-1 shadow-lg";

const MENU_ITEM_CLASS =
  "text-general-unofficial-foreground-alt focus:text-general-foreground h-[34px] cursor-pointer gap-2 rounded-md px-2.5 text-sm focus:bg-secondary";

const SIGNAL_PILL_CLASS =
  "inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-3 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none";

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

type TagIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  count?: number;
};

const TagIconButton = forwardRef<HTMLButtonElement, TagIconButtonProps>(
  function TagIconButton(
    { selected = false, count = 0, className, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          ICON_TRIGGER_CLASS,
          selected
            ? "border-general-border-four shadow-sm"
            : "border-general-border-three shadow-xs",
          className
        )}
        {...props}
      >
        <Tag className={ICON_CLASS} strokeWidth={1.5} aria-hidden />
        {count > 0 ? (
          <span className="bg-general-foreground absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-medium text-white">
            {count}
          </span>
        ) : null}
      </button>
    );
  }
);

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

  const isAllSignals = selectedSignals.length === 0;
  const selectedSignal =
    selectedSignals.length === 1 ? selectedSignals[0] : null;
  const signalCount = isAllSignals ? 0 : selectedSignals.length;

  const selectedPeriodLabel =
    HOME_PERIODS.find((option) => option.value === period)?.label ??
    HOME_PERIODS[3].label;

  const selectedTagSet = new Set(selectedTagIds);
  const tagCount = tags.filter((tag) => selectedTagSet.has(tag.id)).length;

  const hasActiveFilters = signalCount > 0 || tagCount > 0;

  const openTagSheet = (mode: "list" | "create") => {
    setTagSheetMode(mode);
    setTagSheetOpen(true);
  };

  const clearFilters = () => {
    onSelectedSignalsChange([]);
    onSelectedTagIdsChange([]);
  };

  const selectSignal = (value: HomeSignalFilterValue | "all") => {
    onSelectedSignalsChange(value === "all" ? [] : [value]);
  };

  const tagsLabel =
    tagCount > 0
      ? `Tags, ${tagCount} selected`
      : tags.length === 0
        ? "Create a tag"
        : "Filter by tags";

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-3"
        role="group"
        aria-label="Dashboard filters"
      >
        <div
          className="flex items-center gap-2 overflow-x-auto rounded-full p-1"
          role="radiogroup"
          aria-label="Signal filters"
        >
          <button
            type="button"
            role="radio"
            aria-checked={isAllSignals}
            onClick={() => selectSignal("all")}
            className={cn(
              SIGNAL_PILL_CLASS,
              isAllSignals
                ? ALL_SIGNAL_PILL.activeClassName
                : ALL_SIGNAL_PILL.inactiveClassName
            )}
          >
            {ALL_SIGNAL_PILL.label}
          </button>

          {HOME_SIGNAL_FILTERS.map((option) => {
            const isActive = selectedSignal === option.value;
            const count = signalCounts[option.value];

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => selectSignal(option.value)}
                className={cn(
                  SIGNAL_PILL_CLASS,
                  isActive ? option.activeClassName : option.inactiveClassName
                )}
              >
                <SignalDot className={option.dotClassName} />
                <span>{option.label}</span>
                <span
                  className={cn("text-[13px] font-medium", option.countClassName)}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

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
              "text-general-unofficial-foreground-alt cursor-pointer bg-transparent",
              "hover:bg-secondary hover:text-general-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
            )}
          >
            <X className={ICON_CLASS} strokeWidth={1.5} aria-hidden />
            Clear filters
          </button>
        ) : null}

        {/*
          Tags and stage sit on the trailing edge: tags is an icon-only filter,
          while Active/Onboarding remain a view switch rather than a filter.
        */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {tagsLoading ? (
            <Skeleton className="size-9 rounded-md" />
          ) : tagsError ? (
            <div className="text-general-muted-foreground flex min-h-9 items-center gap-2 text-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TagIconButton
                    aria-label="Retry loading tags"
                    onClick={() => void dashboardTags.refetch()}
                  />
                </TooltipTrigger>
                <TooltipContent>Retry loading tags</TooltipContent>
              </Tooltip>
              <button
                type="button"
                onClick={() => void dashboardTags.refetch()}
                className="text-general-foreground cursor-pointer font-medium underline-offset-4 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : tags.length === 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <TagIconButton
                  aria-label={tagsLabel}
                  onClick={() => openTagSheet("create")}
                />
              </TooltipTrigger>
              <TooltipContent>{tagsLabel}</TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <DropdownMenuTrigger asChild>
                      <TagIconButton
                        aria-label={tagsLabel}
                        selected={tagCount > 0}
                        count={tagCount}
                      />
                    </DropdownMenuTrigger>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{tagsLabel}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align="end"
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
                        onSelectedTagIdsChange(
                          toggleValue(selectedTagIds, tag.id)
                        );
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
                  <Pencil
                    className="size-4 shrink-0"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span>Manage tags</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div
            className={cn(
              CONTROL_BASE_CLASS,
              "border-general-border-three gap-4 border bg-white shadow-xs"
            )}
          >
            <div className="flex items-center gap-2">
              <Checkbox
                id={showActiveId}
                checked={showActive}
                onCheckedChange={(checked) =>
                  onShowActiveChange(checked === true)
                }
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
