"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Edit3,
  EyeOff,
  Lock,
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
import { SiteFavicon } from "@/components/organisms/WebChannels/platform-icon";
import type {
  DashboardTag,
  DashboardTagInput,
} from "@/hooks/use-dashboard-tags";
import type { BusinessProfile } from "@/store/business-store";
import { cn } from "@/lib/utils";

type EditorMode = "list" | "create" | "edit";

type DashboardTagsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Screen the sheet lands on each time it is opened. */
  initialMode: "list" | "create";
  tags: DashboardTag[];
  profiles: BusinessProfile[];
  selectedTagIds: string[];
  onSelectedTagIdsChange: (tagIds: string[]) => void;
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

export function DashboardTagsSheet({
  open,
  onOpenChange,
  initialMode,
  tags,
  profiles,
  selectedTagIds,
  onSelectedTagIdsChange,
  createTag,
  updateTag,
  deleteTag,
  isCreating,
  isUpdating,
  isDeleting,
}: DashboardTagsSheetProps) {
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
  const hiddenTag = tags.find(tag => tag.systemKey === "hidden") || null;
  const isHiddenEditing = editingTag?.systemKey === "hidden";
  const isSaving = isCreating || isUpdating;
  const normalizedName = tagName.trim().replace(/\s+/g, " ");
  const isReservedName =
    !isHiddenEditing && normalizedName.toLowerCase() === "hidden";
  const isDirty =
    mode === "create" ||
    (editingTag != null &&
      (normalizedName !== editingTag.name ||
        !sameBusinessIds(selectedBusinessIds, editingTag.businessIds)));
  const canSave =
    Boolean(normalizedName) && !isReservedName && isDirty && !isSaving;
  const hiddenBusinessIds = useMemo(
    () => new Set(hiddenTag?.businessIds || []),
    [hiddenTag?.businessIds]
  );
  const regularTagCountByBusinessId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tag of tags) {
      if (tag.systemKey === "hidden") continue;
      for (const businessId of tag.businessIds) {
        counts.set(businessId, (counts.get(businessId) || 0) + 1);
      }
    }
    return counts;
  }, [tags]);
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

  const handleSheetOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetToList();
  };

  const openEditor = (tag?: DashboardTag) => {
    setMode(tag ? "edit" : "create");
    setEditingTagId(tag?.id || null);
    setTagName(tag?.name || "");
    setSelectedBusinessIds(tag?.businessIds || []);
    setBusinessSearch("");
  };

  // Apply `initialMode` on the open transition only, so re-renders while the
  // sheet is open never yank the user back out of the editor.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      if (initialMode === "create") openEditor();
      else resetToList();
    }
    wasOpenRef.current = open;
  }, [open, initialMode]);

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

    try {
      if (mode === "edit" && editingTagId) {
        await updateTag({ tagId: editingTagId, input });
      } else {
        await createTag(input);
      }
      resetToList();
    } catch {
      // Mutation toasts provide the error; keep the editor open for correction.
    }
  };

  const handleDelete = async () => {
    if (!tagToDelete || isDeleting) return;
    const deletedId = tagToDelete.id;
    try {
      await deleteTag(deletedId);
      if (selectedTagIds.includes(deletedId)) {
        onSelectedTagIdsChange(selectedTagIds.filter(id => id !== deletedId));
      }
      setTagToDelete(null);
    } catch {
      // Mutation toasts provide the error; leave confirmation open for retry.
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
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
                          {tag.systemKey === "hidden" ? (
                            <EyeOff
                              className="size-4 text-muted-foreground"
                              aria-hidden
                            />
                          ) : (
                            <Tag
                              className="size-4 text-muted-foreground"
                              aria-hidden
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditor(tag)}
                          className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                            {tag.name}
                            {tag.systemKey === "hidden" ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                <Lock className="size-2.5" aria-hidden />
                                System
                              </span>
                            ) : null}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {tag.businessCount} {tag.businessCount === 1 ? "business" : "businesses"}
                          </span>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditor(tag)}
                          aria-label={
                            tag.systemKey === "hidden"
                              ? "Manage Hidden businesses"
                              : `Edit ${tag.name}`
                          }
                          title={
                            tag.systemKey === "hidden"
                              ? "Manage businesses"
                              : "Edit tag"
                          }
                        >
                          <Edit3 />
                        </Button>
                        {tag.systemKey === "hidden" ? null : (
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
                        )}
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
                      {mode === "create"
                        ? "Create tag"
                        : isHiddenEditing
                          ? "Manage Hidden"
                          : "Edit tag"}
                    </SheetTitle>
                    <SheetDescription>
                      {isHiddenEditing
                        ? "Hidden businesses stay off Home unless Hidden is temporarily enabled."
                        : "Choose the businesses this tag should show on Home."}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {isHiddenEditing ? (
                <div className="border-b border-border bg-secondary/40 px-5 py-3">
                  <div className="flex items-start gap-2">
                    <Lock
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <p className="text-xs text-muted-foreground">
                      Hidden is a protected system tag. Adding a business here
                      removes it from every regular tag and deletes any regular
                      tag left empty.
                    </p>
                  </div>
                </div>
              ) : (
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
                    aria-invalid={isReservedName}
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span className={cn(isReservedName && "text-destructive")}>
                      {isReservedName
                        ? "Hidden is reserved for the system tag."
                        : "Keep it short and easy to scan."}
                    </span>
                    <span>{tagName.length}/40</span>
                  </div>
                </div>
              )}

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-3 border-b border-border px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Businesses</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedBusinessIds.length} selected
                        {isHiddenEditing
                          ? " · selected businesses will be hidden"
                          : " · selecting a hidden business restores it"}
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
                        const isCurrentlyHidden = hiddenBusinessIds.has(
                          profile.UniqueId
                        );
                        const regularTagCount =
                          regularTagCountByBusinessId.get(profile.UniqueId) || 0;
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
                            {isHiddenEditing && regularTagCount > 0 ? (
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                In {regularTagCount}{" "}
                                {regularTagCount === 1 ? "tag" : "tags"}
                              </span>
                            ) : !isHiddenEditing && isCurrentlyHidden ? (
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                Hidden
                              </span>
                            ) : null}
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
                  {isSaving
                    ? "Saving…"
                    : mode === "create"
                      ? "Create tag"
                      : isHiddenEditing
                        ? "Save Hidden"
                        : "Save changes"}
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
