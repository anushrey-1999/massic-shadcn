import { toast } from "sonner";

const stagingPreviewStorageKey = (contentId: string) => `massic:webflow-staging-preview:${contentId}`;

export function persistWebflowStagingPreviewSession(contentId: string, url: string) {
  try {
    sessionStorage.setItem(stagingPreviewStorageKey(contentId), url);
  } catch {
    // ignore quota / private mode
  }
}

export function readWebflowStagingPreviewSession(contentId: string): string | null {
  try {
    return sessionStorage.getItem(stagingPreviewStorageKey(contentId));
  } catch {
    return null;
  }
}

export function clearWebflowStagingPreviewSession(contentId: string) {
  try {
    sessionStorage.removeItem(stagingPreviewStorageKey(contentId));
  } catch {
    // ignore
  }
}

export const WEBFLOW_STAGING_PUBLISH_OPEN_DELAY_MS = 7000;
export const WEBFLOW_STAGING_VIEW_OPEN_DELAY_MS = 2000;
export const WEBFLOW_LIVE_VIEW_OPEN_DELAY_MS = 1200;

type OpenWebflowPreviewOptions = {
  delayMs?: number;
  subject?: string;
  waitingHint?: string;
};

export function openWebflowPreviewInNewTab(url: string, options: OpenWebflowPreviewOptions = {}) {
  const totalMs = options.delayMs ?? WEBFLOW_LIVE_VIEW_OPEN_DELAY_MS;
  const subject = options.subject ?? "page";
  const waitingHint =
    options.waitingHint ??
    (totalMs >= WEBFLOW_STAGING_PUBLISH_OPEN_DELAY_MS
      ? "Webflow may need a few seconds to finish publishing to staging."
      : "Opening in a new tab.");

  const startedAt = Date.now();
  const toastId = toast.loading(`Opening ${subject}...`, {
    description: `${waitingHint} ${Math.ceil(totalMs / 1000)}s remaining.`,
    duration: totalMs + 800,
  });

  const tick = () => {
    const remainingMs = Math.max(0, totalMs - (Date.now() - startedAt));
    const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
    toast.loading(`Opening ${subject}...`, {
      id: toastId,
      description: `${waitingHint} ${remainingSec}s remaining.`,
      duration: remainingMs + 800,
    });
    if (remainingMs > 0) {
      window.setTimeout(tick, 300);
      return;
    }
    toast.dismiss(toastId);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  window.setTimeout(tick, 300);
}
