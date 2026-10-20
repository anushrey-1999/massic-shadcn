import type { AppearanceValues, CustomerAgentConfig } from "@/types/customer-agent";

/** Versioned widget base, e.g. https://widget.massic.io/v1. */
const WIDGET_BASE_URL = (
  process.env.NEXT_PUBLIC_WIDGET_URL || "https://widget.seedinternaldev.xyz/v1"
).replace(/\/+$/, "");

export const WIDGET_ORIGIN = new URL(WIDGET_BASE_URL).origin;
export const WIDGET_FRAME_URL = `${WIDGET_BASE_URL}/frame.html`;

export function installSnippet(siteKey: string): string {
  return `<script async src="${WIDGET_BASE_URL}/loader.js" data-site-key="${siteKey}"></script>`;
}

const ORIGIN_PATTERN = /^https:\/\/(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(:\d{1,5})?$/;

/**
 * Normalizes user input to an exact HTTPS origin (`https://shop.example.com`).
 * A wildcard subdomain is kept only when typed explicitly (`https://*.example.com`).
 */
export function parseDomain(input: string): { origin: string } | { error: string } {
  let value = input.trim().toLowerCase();
  if (!value) return { error: "Enter a domain." };
  if (value.startsWith("http://")) return { error: "Use an https:// address." };
  if (!value.startsWith("https://")) value = `https://${value}`;
  const origin = value.replace(/^(https:\/\/[^/?#]+).*$/, "$1");
  if (!ORIGIN_PATTERN.test(origin)) return { error: "Enter a domain like example.com." };
  return { origin };
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

export function pickAppearance({ theme, content, visibility }: CustomerAgentConfig): AppearanceValues {
  return { theme, content, visibility };
}

/**
 * Public widget config the frame renders, built from saved facts plus unsaved appearance edits.
 * The widget reads action links from `business`, so the Behavior-owned links are merged in, as the gateway does.
 */
export function previewConfig(config: CustomerAgentConfig, appearance: AppearanceValues) {
  return {
    site_id: config.site_id,
    enabled: true,
    business: {
      ...config.business,
      booking_url: config.behavior.booking_url,
      quote_url: config.behavior.quote_url,
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
