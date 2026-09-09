"use client";

import * as React from "react";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LOCAL_ICONS: Record<string, string> = {
  facebook: "/icons/facebook.png",
  "facebook group": "/icons/facebook.png",
  "facebook groups": "/icons/facebook.png",
  instagram: "/icons/instagram.png",
  linkedin: "/icons/linkedin.png",
  quora: "/icons/quora.svg",
  twitter: "/icons/twitter.png",
  x: "/icons/twitter.png",
  youtube: "/icons/youtube.png",
  tiktok: "/icons/tiktok.png",
  reddit: "/icons/reddit.png",
};

const FAVICON_DOMAINS: Record<string, string> = {
  pinterest: "pinterest.com",
  threads: "threads.net",
  bluesky: "bsky.app",
};

export function getChannelIconSource(channelName?: string | null): string | null {
  const normalized = channelName?.toLowerCase().trim();
  if (!normalized) return null;
  if (LOCAL_ICONS[normalized]) return LOCAL_ICONS[normalized];
  const domain = FAVICON_DOMAINS[normalized];
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32` : null;
}

export function ChannelIcon({ channel, className }: { channel?: string | null; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  const src = getChannelIconSource(channel);

  return <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded border border-border/70 bg-white shadow-xs", className)} aria-hidden="true">
    {src && !failed ? <img src={src} alt="" className="size-3.5 object-contain" loading="lazy" onError={() => setFailed(true)} /> : <Share2 className="size-3 text-muted-foreground" />}
  </span>;
}
