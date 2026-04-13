import type { ExpressPitch } from "@/hooks/use-pitch-reports";

function stripProtocol(url: string): string {
  return String(url || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function expressPitchToMarkdown(pitch: ExpressPitch): string {
  const url = String(pitch?.url || "").trim();
  const displayUrl = stripProtocol(url);
  const tier = pitch?.tier != null && Number.isFinite(Number(pitch.tier)) ? `T${Number(pitch.tier)}` : "";
  const tierLabel = String(pitch?.tier_label || "").trim();
  const why = String(pitch?.why || "").trim();

  const tactics = Array.isArray(pitch?.tactics) ? pitch.tactics : [];
  const sorted = [...tactics].sort((a, b) => Number(a.priority) - Number(b.priority));

  const parts: string[] = [];
  parts.push(`# SEO Snapshot Report`);

  if (displayUrl || url) {
    parts.push(`${displayUrl || url}`);
  }

  if (tierLabel) {
    parts.push(`## ${tierLabel}`);
  } else if (tier) {
    parts.push(`## Snapshot Tier`);
  }

  if (tier) {
    parts.push(`**Tier:** ${tier}`);
  }

  if (why) {
    parts.push(why);
  }

  if (sorted.length) {
    parts.push(`## Recommended tactics — priority order`);
    for (const t of sorted) {
      const priority = Number(t.priority);
      const title = String(t.tactic || "").trim();
      const context = String(t.context || "").trim();
      const label = title ? `**${title}**` : `**Tactic ${Number.isFinite(priority) ? priority : ""}**`;
      const body = context ? `\n\n${context}` : "";
      parts.push(`${Number.isFinite(priority) ? priority : ""}. ${label}${body}`.trim());
    }
  }

  return parts.join("\n\n").trim();
}

