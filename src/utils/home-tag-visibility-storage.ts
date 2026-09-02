const HOME_UNCHECKED_TAGS_PREFIX = "massic:home:unchecked-dashboard-tags";
const LEGACY_HIDDEN_TAGS_PREFIX = "massic:home:hidden-dashboard-tags";

function storageKey(prefix: string, accountId: string) {
  return `${prefix}:${accountId}`;
}

function parseTagIds(value: string | null): string[] {
  const parsed: unknown = JSON.parse(value || "[]");
  return Array.isArray(parsed)
    ? parsed.filter((id): id is string => typeof id === "string")
    : [];
}

export function readUncheckedHomeTagIds(accountId: string): string[] {
  if (typeof window === "undefined" || !accountId) return [];

  try {
    const current = window.localStorage.getItem(
      storageKey(HOME_UNCHECKED_TAGS_PREFIX, accountId)
    );
    if (current !== null) return parseTagIds(current);

    return parseTagIds(
      window.localStorage.getItem(
        storageKey(LEGACY_HIDDEN_TAGS_PREFIX, accountId)
      )
    );
  } catch {
    return [];
  }
}

export function writeUncheckedHomeTagIds(
  accountId: string,
  uncheckedTagIds: string[]
) {
  if (typeof window === "undefined" || !accountId) return;

  try {
    window.localStorage.setItem(
      storageKey(HOME_UNCHECKED_TAGS_PREFIX, accountId),
      JSON.stringify([...new Set(uncheckedTagIds)])
    );
  } catch {
    // Keep the current in-memory selection when browser storage is unavailable.
  }
}
