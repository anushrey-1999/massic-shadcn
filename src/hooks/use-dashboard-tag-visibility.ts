"use client";

import { useCallback, useEffect, useMemo } from "react";
import { create } from "zustand";

import type { DashboardTag } from "@/hooks/use-dashboard-tags";
import { useAuthStore } from "@/store/auth-store";
import type { BusinessProfile } from "@/store/business-store";
import {
  defaultDashboardTagSelection,
  getDashboardTagBusinessSets,
  matchesDashboardTagSelection,
  normalizeDashboardTagSelection,
  updateDashboardTagSelection,
  type DashboardTagSelection,
} from "@/utils/dashboard-tag-visibility";
import {
  readHomeTagSelection,
  writeHomeTagSelection,
} from "@/utils/home-tag-visibility-storage";

type TagVisibilityState = {
  accountId: string | null;
  selection: DashboardTagSelection;
  ready: boolean;
  synchronize: (accountId: string, regularTagIds: string[]) => void;
  setSelectedTagIds: (selectedTagIds: string[]) => void;
  setShowAllBusinesses: (checked: boolean) => void;
  setShowUntagged: (checked: boolean) => void;
  setShowHiddenTag: (checked: boolean) => void;
  resetTagVisibility: () => void;
};

const useTagVisibilityStore = create<TagVisibilityState>((set, get) => {
  const updateSelection = (
    action: Parameters<typeof updateDashboardTagSelection>[1]
  ) => {
    const current = get();
    if (!current.ready || !current.accountId) return;
    const selection = updateDashboardTagSelection(current.selection, action);
    writeHomeTagSelection(current.accountId, selection);
    set({ selection });
  };

  return {
    accountId: null,
    selection: defaultDashboardTagSelection(),
    ready: false,
    synchronize: (accountId, regularTagIds) => {
      const current = get();
      const selection =
        current.accountId !== accountId
          ? readHomeTagSelection(accountId, regularTagIds)
          : normalizeDashboardTagSelection(current.selection, regularTagIds);

      if (
        current.accountId !== accountId ||
        !current.ready ||
        JSON.stringify(selection) !== JSON.stringify(current.selection)
      ) {
        writeHomeTagSelection(accountId, selection);
        set({ accountId, selection, ready: true });
      }
    },
    setSelectedTagIds: ids => updateSelection({ type: "tags", ids }),
    setShowAllBusinesses: checked => updateSelection({ type: "all", checked }),
    setShowUntagged: checked => updateSelection({ type: "untagged", checked }),
    setShowHiddenTag: checked => updateSelection({ type: "hidden", checked }),
    resetTagVisibility: () => updateSelection({ type: "reset" }),
  };
});

const DEFAULT_SELECTION = defaultDashboardTagSelection();

type UseDashboardTagVisibilityOptions = {
  tags: DashboardTag[];
  isLoading: boolean;
  isError: boolean;
};

export function useDashboardTagVisibility(
  { tags, isLoading, isError }: UseDashboardTagVisibilityOptions,
  profiles: BusinessProfile[],
  profilesLoading: boolean
) {
  const { user } = useAuthStore();
  const accountId = String(
    user?.accountUniqueId || user?.uniqueId || user?.UniqueId || user?.id || ""
  );
  const {
    accountId: selectionAccountId,
    selection: storedSelection,
    ready,
    synchronize,
    ...actions
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
  const selection = tagFilterReady ? storedSelection : DEFAULT_SELECTION;
  const businessSets = useMemo(
    () => getDashboardTagBusinessSets(tags, profiles),
    [tags, profiles]
  );
  const selectedBusinessIds = useMemo(
    () =>
      new Set(
        tags
          .filter(tag => !tag.systemKey && selection.selectedTagIds.includes(tag.id))
          .flatMap(tag => tag.businessIds)
      ),
    [tags, selection.selectedTagIds]
  );

  const matchesTagVisibility = useCallback(
    (businessId: string | null | undefined) => {
      if (!tagFilterReady) return isError;
      return matchesDashboardTagSelection(
        businessId,
        selection,
        selectedBusinessIds,
        businessSets
      );
    },
    [businessSets, isError, selectedBusinessIds, selection, tagFilterReady]
  );

  const activeTagFilterCount =
    selection.selectedTagIds.length +
    (selection.showUntagged ? 1 : 0) +
    (selection.showHiddenTag ? 1 : 0);

  return {
    ...selection,
    ...actions,
    counts: businessSets.counts,
    activeTagFilterCount,
    tagFilterReady,
    isTagVisibilityLoading:
      profilesLoading || isLoading ||
      (Boolean(accountId) && !tagFilterReady && !isError),
    matchesTagVisibility,
    hasTagVisibilityFilter:
      tagFilterReady &&
      (!selection.showAllBusinesses ||
        (!selection.showHiddenTag && businessSets.counts.hidden > 0)),
  };
}

export type DashboardTagVisibilityController = ReturnType<
  typeof useDashboardTagVisibility
>;
