"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const FAVICON_URL = "https://www.google.com/s2/favicons?domain=";

const PLATFORM_DOMAINS = {
  wordpress: "wordpress.com",
  webflow: "webflow.com",
  shopify: "shopify.com",
} as const;

export type PlatformKey = keyof typeof PLATFORM_DOMAINS;

function FaviconImage({
  domain,
  size = "md",
  className,
}: {
  domain: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [error, setError] = React.useState(false);
  const px = size === "sm" ? 16 : 24;

  if (!domain || error) {
    return (
      <span
        className={cn(
          "font-mono font-medium uppercase text-general-muted-foreground",
          size === "sm" ? "text-[10px]" : "text-xs",
          className
        )}
      >
        {domain?.charAt(0) || "?"}
      </span>
    );
  }

  return (
    <img
      src={`${FAVICON_URL}${domain}&sz=64`}
      alt=""
      width={px}
      height={px}
      className={cn(size === "sm" ? "size-4" : "size-6", "object-contain", className)}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

export function PlatformIcon({
  platform,
  className,
}: {
  platform: PlatformKey;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg border border-general-border bg-white",
        className
      )}
      aria-hidden
    >
      <FaviconImage domain={PLATFORM_DOMAINS[platform]} />
    </div>
  );
}

export function SiteFavicon({
  siteUrl,
  className,
}: {
  siteUrl?: string | null;
  className?: string;
}) {
  const host = React.useMemo(() => {
    if (!siteUrl) return "";
    try {
      const normalized = siteUrl.trim().startsWith("http") ? siteUrl.trim() : `https://${siteUrl.trim()}`;
      return new URL(normalized).hostname.replace(/^www\./, "");
    } catch {
      return siteUrl.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
    }
  }, [siteUrl]);

  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border border-general-border bg-white",
        className
      )}
      aria-hidden
    >
      <FaviconImage domain={host} size="sm" />
    </div>
  );
}
