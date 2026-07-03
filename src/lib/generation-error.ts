"use client";

function getErrorPayload(error: any): any {
  const data = error?.response?.data;
  const detail = data?.detail;
  return detail && typeof detail === "object" ? detail : data;
}

function getErrorMessage(error: any): string {
  const payload = getErrorPayload(error);
  if (typeof payload?.message === "string") return payload.message;
  if (typeof error?.response?.data?.detail === "string") return error.response.data.detail;
  if (typeof error?.message === "string") return error.message;
  return "";
}

export function isExecutionCreditError(error: any): boolean {
  if (error?.response?.status !== 403) return false;

  const payload = getErrorPayload(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    Number(payload?.credits_required || 0) > 0 ||
    payload?.credits_available !== undefined ||
    payload?.credits_option !== undefined ||
    payload?.uses_credits === true ||
    payload?.used_credits === true ||
    message.includes("execution credits") ||
    message.includes("insufficient credits")
  );
}

export function getGenerationBlockedMessage(error: any, fallback = "Failed to start generation."): string {
  const payload = getErrorPayload(error);
  const message = getErrorMessage(error);
  const status = String(payload?.subscription_status || "").toLowerCase();

  if (status === "unpaid") return "Subscription payment is unpaid. Update billing to continue.";
  if (status === "cancelled" || status === "canceled") return "Subscription has ended. Reactivate subscription to continue.";
  if (status === "incomplete" || status === "incomplete_expired") return "Complete billing to continue.";
  if (status === "paused") return "Subscription is paused. Reactivate billing to continue.";

  return message || fallback;
}
