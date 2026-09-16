/**
 * Serializes a value with object keys sorted at every depth, so two structurally
 * equal values always produce the same string. Used to compare form snapshots
 * where key order is not stable across renders or API responses.
 */
export function stableStringify(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map(normalize);
    }
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, entry]) => [key, normalize(entry)])
      );
    }
    return input;
  };

  return JSON.stringify(normalize(value));
}
