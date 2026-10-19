function readableDetails(value: unknown): string[] {
  if (typeof value === "string") {
    if (/^[{[]/.test(value.trim())) {
      try {
        return readableDetails(JSON.parse(value));
      } catch {
        /* Keep ordinary text. */
      }
    }
    return value.trim() && value !== "[object Object]" ? [value.trim()] : [];
  }
  if (Array.isArray(value)) return value.flatMap(readableDetails);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const message = record.msg ?? record.message ?? record.detail ?? record.error;
  if (message !== undefined && message !== value) {
    const location = Array.isArray(record.loc)
      ? record.loc
          .filter((part) => part !== "body" && part !== "query")
          .join(" · ")
          .replaceAll("_", " ")
      : "";
    return readableDetails(message).map((text) =>
      location ? `${location}: ${text}` : text,
    );
  }
  return Object.entries(record).flatMap(([field, detail]) =>
    readableDetails(detail).map(
      (text) => `${field.replaceAll("_", " ")}: ${text}`,
    ),
  );
}

export function apiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const candidate = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
    code?: string;
    cause?: unknown;
  } | null;
  const data = candidate?.response?.data;
  const details = readableDetails(data);
  if (details.length) return [...new Set(details)].join("\n");
  if (candidate?.cause) return apiErrorMessage(candidate.cause, fallback);
  if (candidate?.response?.status === 409)
    return "The business is currently processing. Wait for it to finish and try again.";
  if (candidate?.response?.status === 403)
    return "You do not have access to this action for this business.";
  if (candidate?.response?.status === 401)
    return "Your session has expired. Sign in again to continue.";
  if (candidate?.code === "ECONNABORTED")
    return "The request timed out. Check the business status before trying again.";
  if (candidate?.code === "ERR_NETWORK")
    return "Unable to connect. Check your connection and try again.";
  if (
    candidate?.message &&
    !/^Request failed with status code/.test(candidate.message)
  )
    return candidate.message;
  return fallback;
}
