"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Edit3,
  Plus,
  Search,
  Tag,
  Tags,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteFavicon } from "@/components/organisms/WebChannels/platform-icon";
import type {
  DashboardTag,
  DashboardTagInput,
} from "@/hooks/use-dashboard-tags";
import type { BusinessProfile } from "@/store/business-store";
import { cn } from "@/lib/utils";

type EditorMode = "list" | "create" | "edit";

type DashboardTagControlsProps = {
  tags: DashboardTag[];
  profiles: BusinessProfile[];
  selectedTagId: string | null;
  onSelectedTagChange: (tagId: string | null) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  createTag: (input: DashboardTagInput) => Promise<DashboardTag>;
  updateTag: (variables: {
    tagId: string;
    input: DashboardTagInput;
  }) => Promise<DashboardTag>;
  deleteTag: (tagId: string) => Promise<string>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
};

function profileName(profile: BusinessProfile) {
  return profile.Name || profile.DisplayName || profile.Website || "Untitled business";
}

function profileDomain(profile: BusinessProfile) {
  const value = String(profile.Website || "").trim();
  if (!value) return "No website";
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(
      /^www\./,
      ""
    );
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function sameBusinessIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const aSet = new Set(a);
  return b.every(id => aSet.has(id));
}

export function DashboardTagControls({
  tags,
  profiles,
  selectedTagId,
  onSelectedTagChange,
  isLoading,
  isError,
  onRetry,
  createTag,
  updateTag,
  deleteTag,
  isCreating,
  isUpdating,
  isDeleting,
}: DashboardTagControlsProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<EditorMode>("list");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [businessSearch, setBusinessSearch] = useState("");
  const [tagToDelete, setTagToDelete] = useState<DashboardTag | null>(null);

  const sortedProfiles = useMemo(
    () =>
      [...profiles].sort((a, b) =>
        profileName(a).localeCompare(profileName(b), undefined, {
          sensitivity: "base",
        })
      ),
    [profiles]
  );

  const visibleProfiles = useMemo(() => {
    const query = businessSearch.trim().toLowerCase();
    if (!query) return sortedProfiles;
    return sortedProfiles.filter(profile => {
      return (
        profileName(profile).toLowerCase().includes(query) ||
        profileDomain(profile).toLowerCase().includes(query)
      );
    });
  }, [businessSearch, sortedProfiles]);

  const editingTag = tags.find(tag => tag.id === editingTagId) || null;
  const isSaving = isCreating || isUpdating;
  const normalizedName = tagName.trim().replace(/\s+/g, " ");
  const isDirty =
    mode === "create" ||
    (editingTag != null &&
      (normalizedName !== editingTag.name ||
        !sameBusinessIds(selectedBusinessIds, editingTag.businessIds)));
  const canSave = Boolean(normalizedName) && isDirty && !isSaving;
  const selectedSet = useMemo(
    () => new Set(selectedBusinessIds),
    [selectedBusinessIds]
  );
  const allVisibleSelected =
    visibleProfiles.length > 0 &&
    visibleProfiles.every(profile => selectedSet.has(profile.UniqueId));
  const someVisibleSelected = visibleProfiles.some(profile =>
    selectedSet.has(profile.UniqueId)
  );

  const resetToList = () => {
    setMode("list");
    setEditingTagId(null);
    setTagName("");
    setSelectedBusinessIds([]);
    setBusinessSearch("");
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) resetToList();
  };

  const openEditor = (tag?: DashboardTag) => {
    setMode(tag ? "edit" : "create");
    setEditingTagId(tag?.id || null);
    setTagName(tag?.name || "");
    setSelectedBusinessIds(tag?.businessIds || []);
    setBusinessSearch("");
  };

  const toggleBusiness = (businessId: string, checked: boolean) => {
    setSelectedBusinessIds(current => {
      if (checked) return current.includes(businessId) ? current : [...current, businessId];
      return current.filter(id => id !== businessId);
    });
  };

  const toggleVisibleBusinesses = () => {
    const visibleIds = visibleProfiles.map(profile => profile.UniqueId);
    setSelectedBusinessIds(current => {
      if (allVisibleSelected) {
        const visibleSet = new Set(visibleIds);
        return current.filter(id => !visibleSet.has(id));
      }
      return [...new Set([...current, ...visibleIds])];
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    const input = {
      name: normalizedName,
      businessIds: selectedBusinessIds,
    };

    if (mode === "edit" && editingTagId) {
      await updateTag({ tagId: editingTagId, input });
    } else {
      await createTag(input);
    }
    resetToList();
  };

  const handleDelete = async () => {
    if (!tagToDelete || isDeleting) return;
    const deletedId = tagToDelete.id;
    await deleteTag(deletedId);
    if (selectedTagId === deletedId) onSelectedTagChange(null);
    setTagToDelete(null);
  };

  return (
    <>
      <section
        aria-label="Dashboard tags"
        className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5 shadow-xs sm:flex-nowrap"
      >
        <div className="flex shrink-0 items-center gap-2 px-1 text-sm font-medium text-foreground">
          <Tags className="size-4 text-muted-foreground" aria-hidden />
          <span>Tags</span>
        </div>
        <div className="hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />

        {isLoading ? (
          <div className="order-3 flex w-full min-w-0 flex-none items-center gap-2 px-1 sm:order-none sm:w-auto sm:flex-1">
            <Skeleton className="h-7 w-24 rounded-md" />
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
        ) : isError ? (
          <div className="order-3 flex w-full min-w-0 flex-none items-center gap-2 px-1 text-sm text-muted-foreground sm:order-none sm:w-auto sm:flex-1">
            <span>Tags are unavailable.</span>
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="order-3 flex w-full min-w-0 flex-none items-center gap-1.5 overflow-x-auto px-1 py-0.5 sm:order-none sm:w-auto sm:flex-1">
            {tags.length > 0 ? (
              <button
                type="button"
                onClick={() => onSelectedTagChange(null)}
                aria-pressed={selectedTagId === null}
                className={cn(
                  "inline-flex h-7 shrink-0 cursor-pointer items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedTagId === null
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                All businesses
              </button>
            ) : null}
            {tags.map(tag => {
              const isSelected = tag.id === selectedTagId;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onSelectedTagChange(tag.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-foreground bg-secondary text-foreground"
                      : "border-border bg-white text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <span>{tag.name}</span>
                  <span
                    className={cn(
                      "inline-flex min-w-4 items-center justify-center rounded px-1 text-[10px] leading-4",
                      isSelected ? "bg-foreground text-background" : "bg-secondary text-foreground"
                    )}
                  >
                    {tag.businessCount}
                  </span>
                </button>
              );
            })}
            {tags.length === 0 ? (
              <span className="px-1 text-xs text-muted-foreground">No tags yet</span>
            ) : null}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setSheetOpen(true);
            if (tags.length === 0) openEditor();
          }}
          disabled={isLoading}
          className="ml-auto shrink-0"
        >
          {tags.length === 0 ? <Plus /> : <Tag />}
          {tags.length === 0 ? "Create tag" : "Manage"}
        </Button>
      </section>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-[480px]">
          {mode === "list" ? (
            <>
              <SheetHeader className="border-b border-border px-5 py-4 pr-12">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <SheetTitle className="text-base font-medium">Manage tags</SheetTitle>
                    <SheetDescription>
                      Create groups to focus the home dashboard.
                    </SheetDescription>
                  </div>
                  <Button type="button" size="sm" onClick={() => openEditor()}>
                    <Plus />
                    New tag
                  </Button>
                </div>
              </SheetHeader>

              <ScrollArea className="min-h-0 flex-1">
                {tags.length === 0 ? (
                  <div className="flex h-full min-h-72 flex-col items-center justify-center px-8 text-center">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-secondary">
                      <Tags className="size-5 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="text-sm font-medium">No tags yet</p>
                    <p className="mt-1 max-w-64 text-sm text-muted-foreground">
                      Group related businesses so you can focus the dashboard in one click.
                    </p>
                    <Button type="button" size="sm" className="mt-4" onClick={() => openEditor()}>
                      <Plus />
                      Create your first tag
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {tags.map(tag => (
                      <div
                        key={tag.id}
                        className="group flex min-h-14 items-center gap-3 px-5 py-2.5 transition-colors hover:bg-secondary/60"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-white">
                          <Tag className="size-4 text-muted-foreground" aria-hidden />
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditor(tag)}
                          className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="block truncate text-sm font-medium">{tag.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {tag.businessCount} {tag.businessCount === 1 ? "business" : "businesses"}
                          </span>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditor(tag)}
                          aria-label={`Edit ${tag.name}`}
                          title="Edit tag"
                        >
                          <Edit3 />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setTagToDelete(tag)}
                          aria-label={`Delete ${tag.name}`}
                          title="Delete tag"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <>
              <SheetHeader className="border-b border-border px-5 py-4 pr-12">
                <div className="flex items-start gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={resetToList}
                    aria-label="Back to tags"
                    className="-ml-2"
                  >
                    <ArrowLeft />
                  </Button>
                  <div className="space-y-1">
                    <SheetTitle className="text-base font-medium">
                      {mode === "create" ? "Create tag" : "Edit tag"}
                    </SheetTitle>
                    <SheetDescription>
                      Choose the businesses this tag should show on Home.
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="border-b border-border px-5 py-4">
                <label htmlFor="dashboard-tag-name" className="mb-1.5 block text-sm font-medium">
                  Tag name
                </label>
                <Input
                  id="dashboard-tag-name"
                  value={tagName}
                  onChange={event => setTagName(event.target.value)}
                  maxLength={40}
                  placeholder="e.g. Priority clients"
                  autoFocus
                  disabled={isSaving}
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Keep it short and easy to scan.</span>
                  <span>{tagName.length}/40</span>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-3 border-b border-border px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Businesses</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedBusinessIds.length} selected
                      </p>
                    </div>
                    {profiles.length > 0 ? (
                      <button
                        type="button"
                        onClick={toggleVisibleBusinesses}
                        disabled={visibleProfiles.length === 0 || isSaving}
                        className="ml-auto cursor-pointer text-xs font-medium text-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {allVisibleSelected ? "Clear visible" : "Select visible"}
                      </button>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      value={businessSearch}
                      onChange={event => setBusinessSearch(event.target.value)}
                      placeholder="Search businesses"
                      className="pl-9"
                      disabled={isSaving || profiles.length === 0}
                    />
                  </div>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                  {profiles.length === 0 ? (
                    <div className="flex min-h-56 items-center justify-center px-8 text-center text-sm text-muted-foreground">
                      Add a business before creating a tag.
                    </div>
                  ) : visibleProfiles.length === 0 ? (
                    <div className="flex min-h-56 items-center justify-center px-8 text-center text-sm text-muted-foreground">
                      No businesses match “{businessSearch}”.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 bg-secondary/40 px-5 py-2 transition-colors hover:bg-secondary">
                        <Checkbox
                          checked={
                            allVisibleSelected
                              ? true
                              : someVisibleSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={toggleVisibleBusinesses}
                          disabled={isSaving}
                          aria-label="Select all visible businesses"
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          Select all visible ({visibleProfiles.length})
                        </span>
                      </label>
                      {visibleProfiles.map(profile => {
                        const checked = selectedSet.has(profile.UniqueId);
                        const name = profileName(profile);
                        const domain = profileDomain(profile);
                        return (
                          <label
                            key={profile.UniqueId}
                            className={cn(
                              "flex min-h-14 cursor-pointer items-center gap-3 px-5 py-2.5 transition-colors hover:bg-secondary/60",
                              checked && "bg-secondary/40"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={value =>
                                toggleBusiness(profile.UniqueId, value === true)
                              }
                              disabled={isSaving}
                              aria-label={`Select ${name}`}
                            />
                            <SiteFavicon siteUrl={profile.Website} className="size-8" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {domain}
                              </span>
                            </span>
                            {checked ? (
                              <Check className="size-4 shrink-0 text-general-primary" aria-hidden />
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <SheetFooter className="flex-row items-center justify-end border-t border-border bg-white px-5 py-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetToList}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={!canSave}>
                  {isSaving ? "Saving…" : mode === "create" ? "Create tag" : "Save changes"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(tagToDelete)} onOpenChange={open => !open && setTagToDelete(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-medium">Delete this tag?</AlertDialogTitle>
            <AlertDialogDescription>
              “{tagToDelete?.name}” will be removed for everyone in this agency. The businesses themselves will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete tag"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
