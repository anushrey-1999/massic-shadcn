/** Plain-language message for a failed customer agent request. */
export function requestError(error: unknown): string {
  const response = (
    error as {
      response?: { status?: number; data?: { detail?: unknown } };
    }
  )?.response;
  if (response?.status === 404) return "Customer agent isn't available for this business yet.";
  if (response?.status === 409) return "Complete your business profile first.";
  return typeof response?.data?.detail === "string"
    ? response.data.detail
    : (error as Error)?.message || "Please try again.";
}
