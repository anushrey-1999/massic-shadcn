import { formatDistanceToNowStrict } from "date-fns";
import { businessDomain } from "@/lib/business-domain-match";
import type { AppearanceValues, CustomerAgentConfig, VisitorCredits } from "@/types/customer-agent";

/** Page the test chat pretends to run on; the profile website may be stored as a GSC property. */
export function businessPageUrl(website: string | null | undefined): string {
  const domain = businessDomain(website);
  return domain ? `https://${domain}` : "https://example.com";
}

export type AgentStatusKind = "live" | "not_installed" | "not_seen" | "no_credits" | "off";

export type AgentStatus = {
  kind: AgentStatusKind;
  badge: string;
  text: string;
};

/** A site not seen for this long is treated as no longer installed. */
const LIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function originHost(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

/** One status the whole page agrees on: switched off, out of credits, installed or not. */
export function agentStatus(
  credits: Pick<VisitorCredits, "enabled" | "balance_usd">,
  install: CustomerAgentConfig["install"],
  now: number = Date.now(),
): AgentStatus {
  if (!credits.enabled) return { kind: "off", badge: "Off", text: "Hidden from your website" };
  if (!(credits.balance_usd > 0)) {
    return { kind: "no_credits", badge: "Out of credits", text: "Hidden from your website" };
  }
  const seenAt = parseDate(install.last_seen_at);
  if (!seenAt) return { kind: "not_installed", badge: "Not installed", text: "Add the code to your website" };
  if (now - seenAt.getTime() > LIVE_WINDOW_MS) {
    return { kind: "not_seen", badge: "Not detected", text: "Not seen on your website recently" };
  }
  const host = originHost(install.last_seen_origin);
  const seen = `seen ${formatDistanceToNowStrict(seenAt, { addSuffix: true })}`;
  return { kind: "live", badge: "Live", text: host ? `On ${host} · ${seen}` : `On your website · ${seen}` };
}

/** Share of the allowance still left, 0–100. Balances above the allowance count as 100% left. */
export function creditsLeftPercent(balanceUsd: number, allowanceUsd: number): number {
  if (!(allowanceUsd > 0) || !Number.isFinite(balanceUsd)) return balanceUsd > 0 ? 100 : 0;
  const left = (balanceUsd / allowanceUsd) * 100;
  return Math.round(Math.min(100, Math.max(0, left)));
}

/** Versioned widget base, e.g. https://widget.massic.io/v1. */
const WIDGET_BASE_URL = (
  process.env.NEXT_PUBLIC_WIDGET_URL || "https://widget.seedinternaldev.xyz/v1"
).replace(/\/+$/, "");

export const WIDGET_ORIGIN = new URL(WIDGET_BASE_URL).origin;
export const WIDGET_FRAME_URL = `${WIDGET_BASE_URL}/frame.html`;

export function installSnippet(siteId: string, siteKey: string): string {
  return `<script async src="${WIDGET_BASE_URL}/loader.js" data-site-id="${siteId}" data-site-key="${siteKey}"></script>`;
}

function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Best WCAG contrast the widget can reach on this accent (it picks white or near-black text). */
export function accentContrast(accent: string): number {
  const l = luminance(accent);
  return Math.max(1.05 / (l + 0.05), (l + 0.05) / (luminance("#111113") + 0.05));
}

export function pickAppearance({ appearance }: CustomerAgentConfig): AppearanceValues {
  return {
    ...appearance,
    theme: {
      ...appearance.theme,
      mode: "auto",
      show_powered_by: true,
      launcher: {
        ...appearance.theme.launcher,
        style:
          appearance.theme.launcher.style === "logo"
            ? "icon"
            : appearance.theme.launcher.style,
      },
    },
  };
}

/**
 * Public widget config the frame renders, built from saved facts plus unsaved appearance edits.
 */
export function previewConfig(config: CustomerAgentConfig, appearance: AppearanceValues) {
  return {
    site_id: config.site_id,
    business: {
      name: config.business.name,
      logo_url: config.business.logo_url,
      phone: config.business.phone,
      email: config.business.email,
      booking_url: null,
      quote_url: null,
    },
    ...appearance,
  };
}

const CHANNEL = "massic-widget";
const PROTOCOL_VERSION = 1;

export function widgetMessage(type: string, payload: unknown) {
  return { channel: CHANNEL, v: PROTOCOL_VERSION, type, payload };
}

/** Returns the message type when `event` is a widget envelope from `frame`. */
export function readWidgetMessage(event: MessageEvent, frame: HTMLIFrameElement | null): string | null {
  if (!frame || event.source !== frame.contentWindow || event.origin !== WIDGET_ORIGIN) return null;
  const data = event.data as { channel?: unknown; v?: unknown; type?: unknown } | null;
  if (!data || data.channel !== CHANNEL || data.v !== PROTOCOL_VERSION || typeof data.type !== "string") {
    return null;
  }
  return data.type;
}
