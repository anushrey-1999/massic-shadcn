import {
  defaultDashboardTagSelection,
  normalizeDashboardTagSelection,
  type DashboardTagSelection,
} from "@/utils/dashboard-tag-visibility";

const SELECTION_PREFIX = "massic:home:dashboard-tag-selection:v1";
const HOME_UNCHECKED_TAGS_PREFIX = "massic:home:unchecked-dashboard-tags";
const LEGACY_HIDDEN_TAGS_PREFIX = "massic:home:hidden-dashboard-tags";

function storageKey(prefix: string, accountId: string) {
  return `${prefix}:${accountId}`;
}

function isTagIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(id => typeof id === "string");
}

function isSelection(value: unknown): value is DashboardTagSelection {
  if (!value || typeof value !== "object") return false;
  const selection = value as Partial<DashboardTagSelection>;
  return (
    typeof selection.showAllBusinesses === "boolean" &&
    typeof selection.showUntagged === "boolean" &&
    typeof selection.showHiddenTag === "boolean" &&
    isTagIds(selection.selectedTagIds)
  );
}

export function readHomeTagSelection(
  accountId: string,
  regularTagIds: string[]
): DashboardTagSelection {
  if (typeof window === "undefined" || !accountId) {
    return defaultDashboardTagSelection();
  }

  try {
    const current = window.localStorage.getItem(
      storageKey(SELECTION_PREFIX, accountId)
    );
    if (current !== null) {
      const parsed: unknown = JSON.parse(current);
      return isSelection(parsed)
        ? normalizeDashboardTagSelection(parsed, regularTagIds)
        : defaultDashboardTagSelection();
    }

    const legacy =
      window.localStorage.getItem(storageKey(HOME_UNCHECKED_TAGS_PREFIX, accountId)) ??
      window.localStorage.getItem(storageKey(LEGACY_HIDDEN_TAGS_PREFIX, accountId));
    if (legacy === null) return defaultDashboardTagSelection();
    const uncheckedIds: unknown = JSON.parse(legacy);
    if (!isTagIds(uncheckedIds)) return defaultDashboardTagSelection();
    const uncheckedSet = new Set(uncheckedIds);
    const selectedTagIds = regularTagIds.filter(id => !uncheckedSet.has(id));
    if (selectedTagIds.length === 0 || selectedTagIds.length === regularTagIds.length) {
      return defaultDashboardTagSelection();
    }
    return {
      ...defaultDashboardTagSelection(),
      showAllBusinesses: false,
      selectedTagIds,
    };
  } catch {
    return defaultDashboardTagSelection();
  }
}

export function writeHomeTagSelection(
  accountId: string,
  selection: DashboardTagSelection
) {
  if (typeof window === "undefined" || !accountId) return;

  try {
    window.localStorage.setItem(
      storageKey(SELECTION_PREFIX, accountId),
      JSON.stringify(selection)
    );
  } catch {
    // Keep the shared in-memory selection when browser storage is unavailable.
  }
}
