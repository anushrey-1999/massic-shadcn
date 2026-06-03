"use client";

import * as React from "react";
import { LinkIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCE_DOMAIN_HINTS: Array<[RegExp, string]> = [
  [/google|gmb|google\s*business|google\s*maps|maps\.google/i, "google.com"],
  [/bing|microsoft\s*bing/i, "bing.com"],
  [/yahoo/i, "yahoo.com"],
  [/duckduckgo|duck\s*duck\s*go/i, "duckduckgo.com"],
  [/ecosia/i, "ecosia.org"],
  [/brave/i, "brave.com"],
  [/yandex/i, "yandex.com"],
  [/baidu/i, "baidu.com"],
  [/chatgpt/i, "chatgpt.com"],
  [/openai/i, "openai.com"],
  [/perplexity/i, "perplexity.ai"],
  [/claude/i, "claude.ai"],
  [/anthropic/i, "anthropic.com"],
  [/gemini|bard/i, "gemini.google.com"],
  [/copilot/i, "copilot.microsoft.com"],
  [/facebook|fb\.com|m\.facebook|l\.facebook/i, "facebook.com"],
  [/instagram|l\.instagram/i, "instagram.com"],
  [/linkedin|lnkd/i, "linkedin.com"],
  [/(^|\s|\/)x($|\s|\/)|twitter|t\.co/i, "x.com"],
  [/tiktok/i, "tiktok.com"],
  [/youtube|youtu\.be/i, "youtube.com"],
  [/reddit/i, "reddit.com"],
  [/pinterest/i, "pinterest.com"],
  [/quora/i, "quora.com"],
  [/yelp/i, "yelp.com"],
  [/nextdoor/i, "nextdoor.com"],
  [/apple\s*maps|maps\.apple/i, "apple.com"],
];

function normalizeSourceName(sourceName: string) {
  return sourceName
    .trim()
    .toLowerCase()
    .replace(/^\(+|\)+$/g, "")
    .replace(/\s*\/\s*(organic|cpc|referral|none|direct|email|social|paid|display).*$/i, "");
}

function domainFromSource(sourceName: string) {
  const normalized = normalizeSourceName(sourceName);
  if (!normalized || normalized === "direct" || normalized === "not set") return null;

  for (const [pattern, domain] of SOURCE_DOMAIN_HINTS) {
    if (pattern.test(sourceName) || pattern.test(normalized)) return domain;
  }

  const domainCandidate = normalized.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i)?.[1];
  return domainCandidate ?? null;
}

function isSearchLike(sourceName: string) {
  return /google|bing|yahoo|duckduckgo|search|organic|chatgpt|openai|perplexity|claude|gemini|copilot/i.test(sourceName);
}

interface SourceFaviconProps {
  sourceName: string;
  className?: string;
  fallback?: "search" | "link" | "auto";
}

export function SourceFavicon({ sourceName, className, fallback = "auto" }: SourceFaviconProps) {
  const [failed, setFailed] = React.useState(false);
  const domain = domainFromSource(sourceName);
  const FallbackIcon = fallback === "search" || (fallback === "auto" && isSearchLike(sourceName))
    ? Search
    : LinkIcon;

  if (!domain || failed) {
    return <FallbackIcon className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground", className)} />;
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
      alt=""
      className={cn("h-4 w-4 shrink-0 rounded-sm", className)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
