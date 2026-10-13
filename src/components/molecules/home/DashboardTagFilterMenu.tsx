"use client";

import { useState } from "react";
import { Check, Filter, Pencil, Tag } from "lucide-react";

import { DashboardTagsSheet } from "@/components/molecules/home/DashboardTagsSheet";
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
import type { useDashboardTags } from "@/hooks/use-dashboard-tags";
import { cn } from "@/lib/utils";
import type { BusinessProfile } from "@/store/business-store";

type DashboardTagsController = ReturnType<typeof useDashboardTags>;

type DashboardTagFilterMenuProps = {
  selectedTagIds: string[];
  onSelectedTagIdsChange: (value: string[]) => void;
  showHiddenTag: boolean;
  onShowHiddenTagChange: (value: boolean) => void;
  profiles: BusinessProfile[];
  dashboardTags: DashboardTagsController;
  variant?: "home" | "sidebar";
};

const MENU_CONTENT_CLASS =
  "border-general-border min-w-[220px] rounded-md bg-white p-1 shadow-lg";
const MENU_ITEM_CLASS =
  "text-general-unofficial-foreground-alt focus:text-general-foreground h-[34px] cursor-pointer gap-2 rounded-md px-2.5 text-sm focus:bg-secondary";

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
    ? values.filter(item => item !== value)
    : [...values, value];
}

export function DashboardTagFilterMenu({
  selectedTagIds,
  onSelectedTagIdsChange,
  showHiddenTag,
  onShowHiddenTagChange,
  profiles,
  dashboardTags,
  variant = "home",
}: DashboardTagFilterMenuProps) {
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [tagSheetMode, setTagSheetMode] = useState<"list" | "create">("list");
  const { tags, isLoading, isError } = dashboardTags;

  const hiddenTag = tags.find(tag => tag.systemKey === "hidden") || null;
  const regularTags = tags.filter(tag => !tag.systemKey);
  const selectedTagSet = new Set(selectedTagIds);
  const tagCount = regularTags.filter(tag => selectedTagSet.has(tag.id)).length;
  const areAllRegularTagsVisible = tagCount === regularTags.length;
  const activeTagFilterCount = tagCount + (showHiddenTag ? 1 : 0);
  const isSidebar = variant === "sidebar";

  const tagsLabel =
    tags.length === 0
      ? "Create a tag"
      : tagCount === 0 && !showHiddenTag
        ? "All non-Hidden businesses shown"
        : areAllRegularTagsVisible && !showHiddenTag
          ? "All tagged businesses shown"
          : `${tagCount} regular ${
              tagCount === 1 ? "tag" : "tags"
            } selected${showHiddenTag ? ", Hidden shown" : ""}`;

  const openTagSheet = (mode: "list" | "create") => {
    setTagSheetMode(mode);
    setTagSheetOpen(true);
  };

  const trigger = (
    <button
      type="button"
      aria-label={tagsLabel}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center bg-foreground-light transition-colors",
        "hover:bg-sidebar-accent/80 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        isSidebar
          ? cn(
              "size-6 rounded-sm",
              activeTagFilterCount > 0 && "bg-sidebar-accent/80"
            )
          : cn(
              "size-9 rounded-md border bg-white hover:bg-secondary",
              activeTagFilterCount > 0
                ? "border-general-border-four shadow-sm"
                : "border-general-border-three shadow-xs"
            )
      )}
    >
      {isSidebar ? (
        <Filter
          className="size-3.5"
          aria-hidden
        />
      ) : (
        <Tag
          className="size-[13.25px] text-general-muted-foreground"
          strokeWidth={1.5}
          aria-hidden
        />
      )}
      {activeTagFilterCount > 0 ? (
        <span
          className={cn(
            "bg-general-foreground absolute inline-flex items-center justify-center rounded-full font-medium leading-none text-white",
            isSidebar
              ? "-top-1 -right-1 h-3.5 min-w-3.5 px-0.5 text-[9px]"
              : "-top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
          )}
        >
          {activeTagFilterCount}
        </span>
      ) : null}
    </button>
  );

  const menuTrigger = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          {tags.length === 0 ? (
            <span onClick={() => openTagSheet("create")}>{trigger}</span>
          ) : (
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tagsLabel}</TooltipContent>
    </Tooltip>
  );

  return (
    <>
      {isLoading ? (
        <Skeleton className={cn(isSidebar ? "size-6 rounded-sm" : "size-9 rounded-md")} />
      ) : isError ? (
        <div className={cn(!isSidebar && "text-general-muted-foreground flex min-h-9 items-center gap-2 text-sm")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Retry loading tags"
                onClick={() => void dashboardTags.refetch()}
                className={cn(
                  "inline-flex shrink-0 cursor-pointer items-center justify-center bg-foreground-light hover:bg-sidebar-accent/80",
                  isSidebar
                    ? "size-6 rounded-sm"
                    : "size-9 rounded-md border border-general-border-three bg-white shadow-xs hover:bg-secondary"
                )}
              >
                {isSidebar ? (
                  <Filter className="size-3.5" />
                ) : (
                  <Tag className="size-[13.25px] text-general-muted-foreground" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>Retry loading tags</TooltipContent>
          </Tooltip>
          {!isSidebar ? (
            <button
              type="button"
              onClick={() => void dashboardTags.refetch()}
              className="text-general-foreground cursor-pointer font-medium underline-offset-4 hover:underline"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : tags.length === 0 ? (
        menuTrigger
      ) : (
        <DropdownMenu>
          {menuTrigger}
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className={MENU_CONTENT_CLASS}
          >
            <DropdownMenuItem
              role="menuitemcheckbox"
              aria-checked={areAllRegularTagsVisible}
              onSelect={event => {
                event.preventDefault();
                onSelectedTagIdsChange(
                  areAllRegularTagsVisible ? [] : regularTags.map(tag => tag.id)
                );
              }}
              className={MENU_ITEM_CLASS}
            >
              <MenuCheckbox checked={areAllRegularTagsVisible} />
              <span className="truncate">All tags</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-general-border" />

            {regularTags.map(tag => {
              const checked = selectedTagSet.has(tag.id);
              return (
                <DropdownMenuItem
                  key={tag.id}
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  onSelect={event => {
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

            {hiddenTag ? (
              <>
                <DropdownMenuSeparator className="bg-general-border" />
                <DropdownMenuItem
                  role="menuitemcheckbox"
                  aria-checked={showHiddenTag}
                  onSelect={event => {
                    event.preventDefault();
                    onShowHiddenTagChange(!showHiddenTag);
                  }}
                  className={MENU_ITEM_CLASS}
                >
                  <MenuCheckbox checked={showHiddenTag} />
                  <span className="truncate">{hiddenTag.name}</span>
                  <span className="text-general-muted-foreground ml-auto shrink-0 pl-4 text-xs tabular-nums">
                    {hiddenTag.businessCount}
                  </span>
                </DropdownMenuItem>
              </>
            ) : null}

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
