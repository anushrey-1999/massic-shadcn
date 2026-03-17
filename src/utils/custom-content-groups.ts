export type CustomContentGroupOperator =
  | "contains"
  | "equals"
  | "doesnt_contain"
  | "doesnt_equal";

export type ContentGroupFilterSource = "custom" | "default";

export interface CustomContentGroupCondition {
  operator: CustomContentGroupOperator;
  values: string[];
}

export interface CustomContentGroup {
  name: string;
  conditions: CustomContentGroupCondition[];
}

export interface CustomContentGroupPreview {
  count: number;
  pages: string[];
  remainingCount: number;
}

export const CUSTOM_CONTENT_GROUP_OPERATOR_OPTIONS: Array<{
  value: CustomContentGroupOperator;
  label: string;
}> = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
  { value: "doesnt_contain", label: "Doesn't contain" },
  { value: "doesnt_equal", label: "Doesn't equal" },
];

function looksLikeHost(candidate: string): boolean {
  return /^(localhost(:\d+)?|[^/?]+\.[^/?]+(:\d+)?)$/i.test(candidate);
}

export function normalizeContentGroupChipValue(value: string): string | null {
  let raw = String(value || "").trim();
  if (!raw) return null;

  if (raw.startsWith("sc-domain:")) {
    raw = raw.slice("sc-domain:".length);
  }

  const hashIndex = raw.indexOf("#");
  if (hashIndex >= 0) {
    raw = raw.slice(0, hashIndex);
  }

  let withoutOrigin = raw;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(withoutOrigin)) {
    withoutOrigin = withoutOrigin.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "");
  } else if (withoutOrigin.startsWith("//")) {
    withoutOrigin = withoutOrigin.replace(/^\/\/[^/]*/, "");
  } else if (!withoutOrigin.startsWith("/") && !withoutOrigin.startsWith("?")) {
    const splitIndex = withoutOrigin.search(/[/?]/);
    const hostCandidate = splitIndex >= 0 ? withoutOrigin.slice(0, splitIndex) : withoutOrigin;

    if (looksLikeHost(hostCandidate)) {
      withoutOrigin = splitIndex >= 0 ? withoutOrigin.slice(splitIndex) : "/";
    }
  }

  if (!withoutOrigin) return "/";

  if (withoutOrigin.startsWith("?")) {
    withoutOrigin = `/${withoutOrigin}`;
  } else if (!withoutOrigin.startsWith("/")) {
    withoutOrigin = `/${withoutOrigin}`;
  }

  const queryIndex = withoutOrigin.indexOf("?");
  const pathPart = queryIndex >= 0 ? withoutOrigin.slice(0, queryIndex) : withoutOrigin;
  const queryPart = queryIndex >= 0 ? withoutOrigin.slice(queryIndex + 1) : null;

  let normalizedPath = pathPart.replace(/\/+/g, "/");
  if (!normalizedPath.startsWith("/")) {
    normalizedPath = `/${normalizedPath}`;
  }
  if (normalizedPath.length > 1) {
    normalizedPath = normalizedPath.replace(/\/+$/g, "");
  }

  const normalized = queryPart === null ? normalizedPath : `${normalizedPath}?${queryPart}`;
  return normalized.toLowerCase();
}

export function normalizeCustomContentGroupsFromApi(rawGroups: unknown): CustomContentGroup[] {
  if (!Array.isArray(rawGroups)) return [];

  return rawGroups
    .map((rawGroup): CustomContentGroup | null => {
      const name = String((rawGroup as any)?.name ?? (rawGroup as any)?.Name ?? "").trim();
      const rawConditions = Array.isArray((rawGroup as any)?.conditions)
        ? (rawGroup as any).conditions
        : Array.isArray((rawGroup as any)?.Conditions)
          ? (rawGroup as any).Conditions
          : [];

      const conditions = rawConditions
        .map((rawCondition: any): CustomContentGroupCondition | null => {
          const operator = String(
            rawCondition?.operator ??
            rawCondition?.Operator ??
            rawCondition?.condition ??
            rawCondition?.Condition ??
            ""
          )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/['"]/g, "") as CustomContentGroupOperator;

          const rawValues = Array.isArray(rawCondition?.values)
            ? rawCondition.values
            : Array.isArray(rawCondition?.Values)
              ? rawCondition.Values
              : [
                  ...(rawCondition?.value ? [rawCondition.value] : []),
                  ...(rawCondition?.Value ? [rawCondition.Value] : []),
                ];

          const values = rawValues
            .map((value: string) => normalizeContentGroupChipValue(value))
            .filter((value: string | null): value is string => Boolean(value));

          if (!name || values.length === 0) return null;

          return {
            operator,
            values,
          };
        })
        .filter(
          (condition: CustomContentGroupCondition | null): condition is CustomContentGroupCondition =>
            Boolean(condition)
        );

      if (!name || conditions.length === 0) return null;

      return {
        name,
        conditions,
      };
    })
    .filter((group: CustomContentGroup | null): group is CustomContentGroup => Boolean(group));
}

export function serializeCustomContentGroupsForApi(groups: CustomContentGroup[]) {
  return groups.map((group) => ({
    name: group.name.trim(),
    conditions: group.conditions
      .map((condition) => ({
        operator: condition.operator,
        condition: condition.operator,
        values: condition.values
          .map((value) => normalizeContentGroupChipValue(value))
          .filter((value: string | null): value is string => Boolean(value)),
      }))
      .filter((condition) => condition.values.length > 0)
      .map((condition) => ({
        ...condition,
        value: condition.values[0] || "",
      })),
  }));
}

export function createEmptyCustomContentGroup(): CustomContentGroup {
  return {
    name: "",
    conditions: [
      {
        operator: "contains",
        values: [],
      },
    ],
  };
}

export function getCustomContentGroupOperatorLabel(operator: CustomContentGroupOperator): string {
  return (
    CUSTOM_CONTENT_GROUP_OPERATOR_OPTIONS.find((option) => option.value === operator)?.label ||
    operator
  );
}
