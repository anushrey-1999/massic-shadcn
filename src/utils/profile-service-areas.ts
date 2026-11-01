import type { JobServiceArea, ServiceAreaType } from "@/types/profile-v2";

export function normalizeJobServiceAreas(
  value: unknown,
  serviceAreaType?: ServiceAreaType | null
): JobServiceArea[] {
  if (!Array.isArray(value)) return [];
  const defaultKind = serviceAreaType === "city_local"
    ? "city"
    : serviceAreaType === "state_regional"
      ? "state"
      : "region";
  const kinds: JobServiceArea["kind"][] = [
    "city", "state", "region", "colloquial", "island",
  ];

  return value.flatMap((item) => {
    const area = typeof item === "string" ? { name: item } : item;
    if (!area || typeof area !== "object") return [];
    const name = typeof area.name === "string" ? area.name.trim() : "";
    if (!name) return [];
    return [{
      name,
      kind: kinds.includes(area.kind) ? area.kind : defaultKind,
      rank: Number.isInteger(area.rank) && area.rank >= 1 ? area.rank : undefined,
    }];
  }).map((area, index) => ({ ...area, rank: area.rank ?? index + 1 }));
}
