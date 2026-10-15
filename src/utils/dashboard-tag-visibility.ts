import type { DashboardTag } from "@/hooks/use-dashboard-tags";
import type { BusinessProfile } from "@/store/business-store";

export type DashboardTagSelection = {
  showAllBusinesses: boolean;
  selectedTagIds: string[];
  showUntagged: boolean;
  showHiddenTag: boolean;
};

export function defaultDashboardTagSelection(): DashboardTagSelection {
  return {
    showAllBusinesses: true,
    selectedTagIds: [],
    showUntagged: false,
    showHiddenTag: false,
  };
}

export function normalizeDashboardTagSelection(
  selection: DashboardTagSelection,
  regularTagIds: string[]
): DashboardTagSelection {
  if (selection.showAllBusinesses) {
    return { ...selection, selectedTagIds: [], showUntagged: false };
  }

  const knownIds = new Set(regularTagIds);
  const selectedTagIds = [...new Set(selection.selectedTagIds)].filter(id =>
    knownIds.has(id)
  );
  const lostLastTag =
    selection.selectedTagIds.length > 0 && selectedTagIds.length === 0;
  const showAllBusinesses =
    selectedTagIds.length === 0 &&
    !selection.showUntagged &&
    (lostLastTag || !selection.showHiddenTag);

  return { ...selection, selectedTagIds, showAllBusinesses };
}

type SelectionAction =
  | { type: "all"; checked: boolean }
  | { type: "tags"; ids: string[] }
  | { type: "untagged"; checked: boolean }
  | { type: "hidden"; checked: boolean }
  | { type: "reset" };

export function updateDashboardTagSelection(
  selection: DashboardTagSelection,
  action: SelectionAction
): DashboardTagSelection {
  switch (action.type) {
    case "all":
      return action.checked
        ? {
            ...selection,
            showAllBusinesses: true,
            selectedTagIds: [],
            showUntagged: false,
          }
        : { ...selection, showAllBusinesses: !selection.showHiddenTag };
    case "tags": {
      const selectedTagIds = [...new Set(action.ids)];
      return {
        ...selection,
        selectedTagIds,
        showAllBusinesses: selectedTagIds.length === 0 && !selection.showUntagged,
      };
    }
    case "untagged":
      return {
        ...selection,
        showUntagged: action.checked,
        showAllBusinesses:
          !action.checked && selection.selectedTagIds.length === 0,
      };
    case "hidden":
      return {
        ...selection,
        showHiddenTag: action.checked,
        showAllBusinesses:
          selection.showAllBusinesses ||
          (!action.checked &&
            !selection.showUntagged &&
            selection.selectedTagIds.length === 0),
      };
    case "reset":
      return defaultDashboardTagSelection();
  }
}

export function getDashboardTagBusinessSets(
  tags: DashboardTag[],
  profiles: BusinessProfile[]
) {
  const eligibleBusinessIds = new Set(
    profiles
      .filter(profile => profile.IsActive !== false)
      .map(profile => profile.UniqueId)
  );
  const hiddenBusinessIds = new Set(
    tags.filter(tag => tag.systemKey === "hidden").flatMap(tag => tag.businessIds)
  );
  const taggedBusinessIds = new Set(
    tags.filter(tag => !tag.systemKey).flatMap(tag => tag.businessIds)
  );
  const untaggedBusinessIds = new Set(
    [...eligibleBusinessIds].filter(
      id => !hiddenBusinessIds.has(id) && !taggedBusinessIds.has(id)
    )
  );
  const regularTagCounts = Object.fromEntries(
    tags
      .filter(tag => !tag.systemKey)
      .map(tag => [
        tag.id,
        new Set(
          tag.businessIds.filter(
            id => eligibleBusinessIds.has(id) && !hiddenBusinessIds.has(id)
          )
        ).size,
      ])
  );

  return {
    hiddenBusinessIds,
    untaggedBusinessIds,
    counts: {
      allBusinesses: [...eligibleBusinessIds].filter(
        id => !hiddenBusinessIds.has(id)
      ).length,
      untagged: untaggedBusinessIds.size,
      hidden: [...eligibleBusinessIds].filter(id => hiddenBusinessIds.has(id)).length,
      regularTags: regularTagCounts,
    },
  };
}

export function matchesDashboardTagSelection(
  businessId: string | null | undefined,
  selection: DashboardTagSelection,
  selectedBusinessIds: Set<string>,
  businessSets: ReturnType<typeof getDashboardTagBusinessSets>
) {
  if (businessId && businessSets.hiddenBusinessIds.has(businessId)) {
    return selection.showHiddenTag;
  }
  if (selection.showAllBusinesses) return true;
  if (!businessId) return false;
  return (
    selectedBusinessIds.has(businessId) ||
    (selection.showUntagged && businessSets.untaggedBusinessIds.has(businessId))
  );
}
