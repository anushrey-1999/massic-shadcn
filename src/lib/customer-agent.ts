import type { AppearanceValues, CustomerAgentConfig } from "@/types/customer-agent";

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
  return appearance;
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
