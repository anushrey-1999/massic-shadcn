"use client";

import { useCallback, useEffect, useMemo } from "react";
import { create } from "zustand";

import type { DashboardTag } from "@/hooks/use-dashboard-tags";
import { useAuthStore } from "@/store/auth-store";
import {
  readUncheckedHomeTagIds,
  writeUncheckedHomeTagIds,
} from "@/utils/home-tag-visibility-storage";

type TagVisibilityState = {
  accountId: string | null;
  knownRegularTagIds: string[];
  selectedTagIds: string[];
  showHiddenTag: boolean;
  ready: boolean;
  synchronize: (accountId: string, regularTagIds: string[]) => void;
  setSelectedTagIds: (selectedTagIds: string[]) => void;
  setShowHiddenTag: (showHiddenTag: boolean) => void;
};

const useTagVisibilityStore = create<TagVisibilityState>((set, get) => ({
  accountId: null,
  knownRegularTagIds: [],
  selectedTagIds: [],
  showHiddenTag: false,
  ready: false,
  synchronize: (accountId, regularTagIds) => {
    const current = get();

    if (current.accountId !== accountId) {
      const uncheckedTagIds = new Set(readUncheckedHomeTagIds(accountId));
      set({
        accountId,
        knownRegularTagIds: regularTagIds,
        selectedTagIds: regularTagIds.filter(
          tagId => !uncheckedTagIds.has(tagId)
        ),
        showHiddenTag: false,
        ready: true,
      });
      return;
    }

    const nextKnownTagIds = new Set(regularTagIds);
    const previousKnownTagIds = new Set(current.knownRegularTagIds);
    const selectedTagIds = [
      ...current.selectedTagIds.filter(tagId => nextKnownTagIds.has(tagId)),
      ...regularTagIds.filter(tagId => !previousKnownTagIds.has(tagId)),
    ];

    const selectionChanged =
      selectedTagIds.length !== current.selectedTagIds.length ||
      selectedTagIds.some(
        (tagId, index) => tagId !== current.selectedTagIds[index]
      );
    const knownTagsChanged =
      regularTagIds.length !== current.knownRegularTagIds.length ||
      regularTagIds.some(
        (tagId, index) => tagId !== current.knownRegularTagIds[index]
      );

    if (selectionChanged || knownTagsChanged || !current.ready) {
      set({
        knownRegularTagIds: regularTagIds,
        selectedTagIds,
        ready: true,
      });
    }
  },
  setSelectedTagIds: selectedTagIds => set({ selectedTagIds }),
  setShowHiddenTag: showHiddenTag => set({ showHiddenTag }),
}));

type UseDashboardTagVisibilityOptions = {
  tags: DashboardTag[];
  isLoading: boolean;
  isError: boolean;
};

export function useDashboardTagVisibility({
  tags,
  isLoading,
  isError,
}: UseDashboardTagVisibilityOptions) {
  const { user } = useAuthStore();
  const accountId = String(
    user?.accountUniqueId ||
      user?.uniqueId ||
      user?.UniqueId ||
      user?.id ||
      ""
  );
  const {
    accountId: selectionAccountId,
    selectedTagIds,
    showHiddenTag,
    ready,
    synchronize,
    setSelectedTagIds,
    setShowHiddenTag,
  } = useTagVisibilityStore();

  const regularTagIds = useMemo(
    () => tags.filter(tag => !tag.systemKey).map(tag => tag.id),
    [tags]
  );

  useEffect(() => {
    if (!accountId || isLoading || isError) return;
    synchronize(accountId, regularTagIds);
  }, [accountId, isError, isLoading, regularTagIds, synchronize]);

  const tagFilterReady = ready && selectionAccountId === accountId;

  useEffect(() => {
    if (!tagFilterReady || !accountId) return;

    const selectedIds = new Set(selectedTagIds);
    writeUncheckedHomeTagIds(
      accountId,
      regularTagIds.filter(tagId => !selectedIds.has(tagId))
    );
  }, [accountId, regularTagIds, selectedTagIds, tagFilterReady]);

  const hiddenTag = useMemo(
    () => tags.find(tag => tag.systemKey === "hidden") || null,
    [tags]
  );
  const selectedRegularTags = useMemo(
    () =>
      tags.filter(
        tag => !tag.systemKey && selectedTagIds.includes(tag.id)
      ),
    [selectedTagIds, tags]
  );
  const selectedBusinessIds = useMemo(
    () =>
      selectedRegularTags.length > 0
        ? new Set(selectedRegularTags.flatMap(tag => tag.businessIds))
        : null,
    [selectedRegularTags]
  );
  const hiddenBusinessIds = useMemo(
    () => new Set(hiddenTag?.businessIds || []),
    [hiddenTag?.businessIds]
  );

  const matchesTagVisibility = useCallback(
    (businessId: string | null | undefined) => {
      if (!tagFilterReady) return true;

      const isHidden = businessId
        ? hiddenBusinessIds.has(businessId)
        : false;
      if (isHidden) return showHiddenTag;

      if (!selectedBusinessIds) return true;
      return businessId ? selectedBusinessIds.has(businessId) : false;
    },
    [
      hiddenBusinessIds,
      selectedBusinessIds,
      showHiddenTag,
      tagFilterReady,
    ]
  );

  const hasTagVisibilityFilter =
    tagFilterReady &&
    (selectedRegularTags.length > 0 ||
      selectedTagIds.length < regularTagIds.length ||
      (!showHiddenTag && hiddenBusinessIds.size > 0));

  return {
    selectedTagIds: tagFilterReady ? selectedTagIds : [],
    setSelectedTagIds,
    showHiddenTag: tagFilterReady ? showHiddenTag : false,
    setShowHiddenTag,
    tagFilterReady,
    matchesTagVisibility,
    hasTagVisibilityFilter,
  };
}
