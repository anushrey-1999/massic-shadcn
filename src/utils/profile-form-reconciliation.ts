import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { stableStringify } from "@/utils/stable-stringify";

type Row = NonNullable<BusinessInfoFormData["offeringsList"]>[number];
const editableFields = ["name", "description", "offeringType", "link"] as const;
const nameKey = (row: Row) =>
  String(row.name ?? "")
    .trim()
    .toLowerCase();
const same = (a: unknown, b: unknown) =>
  stableStringify(a) === stableStringify(b);
const text = (value: string | undefined) => value ?? "";

export function newOfferingClientId(): string {
  return crypto.randomUUID();
}

/** Match by the previous server name, so a local rename retains its identity. */
export function identifyServerOfferings(
  incoming: Row[],
  previous: Row[],
  current: Row[],
): Row[] {
  const used = new Set<string>();
  return incoming.map((row) => {
    const before = previous.find(
      (item) =>
        nameKey(item) === nameKey(row) &&
        item.clientId &&
        !used.has(item.clientId),
    );
    const local = current.find(
      (item) =>
        nameKey(item) === nameKey(row) &&
        item.clientId &&
        !used.has(item.clientId),
    );
    const beforeStillPresent =
      before?.clientId &&
      current.some((item) => item.clientId === before?.clientId);
    const clientId =
      (beforeStillPresent
        ? before?.clientId
        : (local?.clientId ?? before?.clientId)) ?? newOfferingClientId();
    used.add(clientId);
    return { ...row, clientId };
  });
}

function mergeUrls(
  previous: string[],
  current: string[],
  incoming: string[],
): string[] {
  const removed = new Set(previous.filter((url) => !current.includes(url)));
  return [
    ...new Set([
      ...current.filter(
        (url) => !previous.includes(url) || incoming.includes(url),
      ),
      ...incoming.filter((url) => !removed.has(url)),
    ]),
  ];
}

function mergeOffering(
  previous: Row | undefined,
  current: Row,
  incoming: Row,
): Row {
  const result = { ...current };
  for (const field of editableFields) {
    const unchanged = previous
      ? text(current[field]) === text(previous[field])
      : !text(current[field]).trim();
    if (unchanged) result[field] = incoming[field];
  }
  result.existingUrls = mergeUrls(
    previous?.existingUrls ?? [],
    current.existingUrls ?? [],
    incoming.existingUrls ?? [],
  );
  return result;
}

export function reconcileOfferings(
  previous: Row[],
  current: Row[],
  incoming: Row[],
): Row[] {
  if (same(previous, current)) return incoming;
  const beforeById = new Map(previous.map((row) => [row.clientId, row]));
  const incomingById = new Map(incoming.map((row) => [row.clientId, row]));
  const result: Row[] = [];
  // Keep local order and removals. Unedited rows removed on the server disappear.
  for (const row of current) {
    const before = row.clientId ? beforeById.get(row.clientId) : undefined;
    const next = row.clientId ? incomingById.get(row.clientId) : undefined;
    if (next) result.push(mergeOffering(before, row, next));
    else if (!before || !same(row, before)) result.push(row);
  }
  for (const row of incoming) {
    if (result.some((item) => item.clientId === row.clientId)) continue;
    if (beforeById.has(row.clientId)) continue; // Locally deleted.
    const matching = result.findIndex((item) => nameKey(item) === nameKey(row));
    if (matching >= 0) {
      result[matching] = mergeOffering(
        beforeById.get(result[matching].clientId),
        result[matching],
        row,
      );
    } else result.push(row);
  }
  return result;
}

/** Commit only dialog edits, retaining fields/URLs fetched while it was open. */
export function commitOfferingDraft<T extends Row>(
  items: T[],
  draft: T,
  initial: T | null,
): T[] {
  const index = initial?.clientId
    ? items.findIndex((row) => row.clientId === initial.clientId)
    : items.findIndex((row) => nameKey(row) === nameKey(initial ?? draft));
  if (index < 0) {
    if (initial) return items; // Do not resurrect a row removed while editing.
    return [
      ...items,
      { ...draft, clientId: draft.clientId ?? newOfferingClientId() },
    ];
  }
  const updated = { ...items[index] };
  for (const field of editableFields) {
    if (
      initial
        ? text(draft[field]) !== text(initial[field])
        : text(draft[field]).trim()
    ) {
      updated[field] = draft[field];
    }
  }
  return items.map((row, position) => (position === index ? updated : row));
}

/** Keep local removals/old names across saves while the background fill advances. */
export function rememberOfferingRemovals(
  previous: Row[],
  current: Row[],
  retired: Row[],
): Row[] {
  const remembered = retired.filter(
    (row) => !current.some((item) => nameKey(item) === nameKey(row)),
  );
  for (const row of previous) {
    const live = current.find((item) => item.clientId === row.clientId);
    if (
      (!live || nameKey(live) !== nameKey(row)) &&
      !current.some((item) => nameKey(item) === nameKey(row)) &&
      !remembered.some((item) => nameKey(item) === nameKey(row))
    ) {
      remembered.push({
        ...row,
        clientId: live ? newOfferingClientId() : row.clientId,
      });
    }
  }
  return remembered;
}

export function reconcileProfileForm(
  previous: BusinessInfoFormData | null,
  current: BusinessInfoFormData,
  incoming: BusinessInfoFormData,
  retired: Row[] = [],
) {
  const known = [
    ...(previous?.offeringsList ?? []),
    ...retired.filter(
      (row) =>
        !previous?.offeringsList?.some(
          (item) => item.clientId === row.clientId,
        ),
    ),
  ];
  const baseline: BusinessInfoFormData = {
    ...incoming,
    offeringsList: identifyServerOfferings(
      incoming.offeringsList ?? [],
      known,
      current.offeringsList ?? [],
    ),
  };
  if (!previous) return { baseline, values: baseline };
  const values = { ...current };
  for (const key of Object.keys(baseline) as Array<
    keyof BusinessInfoFormData
  >) {
    if (key === "offeringsList") {
      values.offeringsList = reconcileOfferings(
        known,
        current.offeringsList ?? [],
        baseline.offeringsList ?? [],
      );
    } else if (same(current[key], previous[key])) {
      Object.assign(values, { [key]: baseline[key] });
    }
  }
  return { baseline, values };
}
