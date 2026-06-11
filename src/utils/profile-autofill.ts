const ERROR_KEYS = new Set([
  "error",
  "errors",
  "detail",
  "reason",
  "recommendation",
]);

function collectStringLeaves(value: unknown, depth = 0): string[] {
  if (depth > 5 || value == null) {
    return [];
  }

  if (typeof value === "string") {
    const message = value.trim();
    return message ? [message] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringLeaves(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      collectStringLeaves(item, depth + 1)
    );
  }

  return [];
}

function collectAutofillErrors(value: unknown, depth = 0): string[] {
  if (depth > 5 || value == null || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectAutofillErrors(item, depth + 1));
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) => {
    const normalizedKey = key.trim().toLowerCase();

    if (ERROR_KEYS.has(normalizedKey)) {
      return collectStringLeaves(nestedValue, depth + 1);
    }

    if (nestedValue && typeof nestedValue === "object") {
      return collectAutofillErrors(nestedValue, depth + 1);
    }

    return [];
  });
}

export function getAutofillErrorMessage(
  value: unknown,
  fallback = "Failed to autofill profile"
): string {
  const dedupedMessages = Array.from(
    new Set(
      collectAutofillErrors(value)
        .map((message) => message.trim())
        .filter(Boolean)
    )
  );

  if (dedupedMessages.length === 0) {
    return fallback;
  }

  return dedupedMessages.join(" ");
}
