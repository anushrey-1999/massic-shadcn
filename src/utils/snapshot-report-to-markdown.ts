import type { ExpressPitch } from "@/hooks/use-pitch-reports";
import type { ProfileTag } from "@/components/organisms/SnapshotReport/ProfileStrip";
import type { Competitor } from "@/components/organisms/SnapshotReport/TopCompetitorsBlock";

type QuickEvaluation = {
  techStack?: {
    cms?: string | null;
    cdnProvider?: string | null;
    hostingProvider?: string | null;
  };
  analytics?: {
    hasGSC?: boolean;
    hasGA4?: boolean;
    hasGTM?: boolean;
    detectedPixels?: unknown[];
  };
  domain_info?: {
    domainAge?: number | null;
    domainRegistrar?: string | null;
  };
  businessInfo?: {
    socialMediaLinks?: Record<string, string | null | undefined> | null;
    revenueModel?: string | null;
    ctaButtons?: unknown[] | null;
  };
  meta?: {
    pageTitle?: string | null;
    metaDescription?: string | null;
    h1Tags?: string[] | null;
    schemaOrgTypes?: string[] | null;
  };
};

function stripProtocol(url: string): string {
  return String(url || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function isNonNullObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toQuickEvaluation(value: unknown): QuickEvaluation | null {
  if (!isNonNullObject(value)) return null;
  const nested = (value as any).quick_evaluation;
  if (isNonNullObject(nested)) return nested as QuickEvaluation;
  return value as QuickEvaluation;
}

function line(value: unknown): string {
  const s = String(value ?? "").trim();
  return s ? s : "";
}

function boolDetected(v: unknown): "Detected" | "Not detected" {
  return v ? "Detected" : "Not detected";
}

function formatDomainAgeYears(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "Not detected";
  const fixed = n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
  return `${fixed} years`;
}

type CtaButton = { text?: string; url?: string };

function toCtaButton(value: unknown): CtaButton | null {
  if (!isNonNullObject(value)) return null;
  const text = line((value as any).text);
  const url = line((value as any).url);
  if (!text && !url) return null;
  return { text, url };
}

function formatCtaLabel(cta: CtaButton): string {
  const text = line(cta.text);
  const url = line(cta.url);
  if (text && url) return `${text} → ${url}`;
  return text || url;
}

function markdownTable(rows: Array<[string, string]>): string {
  const safe = rows.filter((r) => r[0] && r[1]);
  if (!safe.length) return "";
  const header = `| ${safe.map(([k]) => k).join(" | ")} |`;
  const sep = `| ${safe.map(() => "---").join(" | ")} |`;
  const values = `| ${safe.map(([, v]) => v).join(" | ")} |`;
  return [header, sep, values].join("\n");
}

export function snapshotReportToMarkdown(args: {
  expressPitch: ExpressPitch;
  generatedAt?: string;
  profileTags?: ProfileTag[];
  quickEvaluation?: unknown;
  competitors?: Competitor[];
  footerSummary?: string;
}): string {
  const { expressPitch, generatedAt, profileTags, quickEvaluation, competitors, footerSummary } =
    args;

  const url = line(expressPitch?.url);
  const displayUrl = stripProtocol(url);
  const tierLabel = line(expressPitch?.tier_label);
  const why = line(expressPitch?.why);

  const tactics = Array.isArray(expressPitch?.tactics) ? expressPitch.tactics : [];
  const sortedTactics = [...tactics].sort((a: any, b: any) => Number(a?.priority) - Number(b?.priority));

  const parts: string[] = [];
  parts.push(`# SEO Snapshot Report`);

  if (displayUrl || url) parts.push(displayUrl || url);
  if (generatedAt) parts.push(`Generated: ${generatedAt}`);

  if (tierLabel) parts.push(`## ${tierLabel}`);
  if (why) parts.push(why);

  const tags = Array.isArray(profileTags) ? profileTags : [];
  if (tags.length) {
    parts.push(`## Profile`);
    for (const t of tags) {
      const k = line(t?.label);
      const v = line(t?.value);
      if (!k || !v) continue;
      parts.push(`- **${k}**: ${v}`);
    }
  }

  const qe = toQuickEvaluation(quickEvaluation);
  if (qe) {
    parts.push(`## Quick evaluation`);

    const techTop = markdownTable([
      ["CMS", line(qe.techStack?.cms) || "Not detected"],
      ["CDN", line(qe.techStack?.cdnProvider) || "Not detected"],
      ["Hosting", line(qe.techStack?.hostingProvider) || "Not detected"],
    ]);
    const techBottom = markdownTable([
      ["Registrar", line(qe.domain_info?.domainRegistrar) || "Not detected"],
      ["Domain age", formatDomainAgeYears(qe.domain_info?.domainAge)],
      ["Revenue model", line(qe.businessInfo?.revenueModel) || "Not detected"],
    ]);
    if (techTop || techBottom) {
      parts.push(`### Tech stack`);
      if (techTop) parts.push(techTop);
      if (techBottom) parts.push(techBottom);
    }

    const pixels = Array.isArray(qe.analytics?.detectedPixels) ? qe.analytics?.detectedPixels : [];
    parts.push(`### Analytics & tracking`);
    parts.push(`- **GSC**: ${boolDetected(qe.analytics?.hasGSC)}`);
    parts.push(`- **GA4**: ${boolDetected(qe.analytics?.hasGA4)}`);
    parts.push(`- **GTM**: ${boolDetected(qe.analytics?.hasGTM)}`);
    parts.push(`- **Pixels**: ${pixels.length ? String(pixels.length) : "None"}`);

    parts.push(`### On-page SEO`);
    parts.push(`- **Page title**: ${line(qe.meta?.pageTitle) || "_Missing_"}`);
    parts.push(`- **Meta description**: ${line(qe.meta?.metaDescription) || "_Missing_"}`);
    const h1 = Array.isArray(qe.meta?.h1Tags) ? qe.meta?.h1Tags?.[0] : null;
    parts.push(`- **H1**: ${line(h1) || "_Missing_"}`);
    const schema = Array.isArray(qe.meta?.schemaOrgTypes) ? qe.meta?.schemaOrgTypes : [];
    parts.push(`- **Schema**: ${schema.length ? schema.join(", ") : "_None detected_"}`);

    const ctasRaw = Array.isArray(qe.businessInfo?.ctaButtons) ? qe.businessInfo?.ctaButtons : [];
    const ctas = ctasRaw
      .map((v) => (typeof v === "string" ? { text: line(v) } : toCtaButton(v)))
      .filter(Boolean) as CtaButton[];
    const seenCtas = new Set<string>();
    const dedupedCtas: string[] = [];
    for (const c of ctas) {
      const label = formatCtaLabel(c);
      const key = label.toLowerCase();
      if (!label || seenCtas.has(key)) continue;
      seenCtas.add(key);
      dedupedCtas.push(label);
    }
    parts.push(`### CTAs detected`);
    if (dedupedCtas.length) {
      for (const v of dedupedCtas) {
        parts.push(`- ${v}`);
      }
    } else {
      parts.push(`- None`);
    }

    const socialLinks = qe.businessInfo?.socialMediaLinks;
    const socialEntries =
      socialLinks && typeof socialLinks === "object"
        ? Object.entries(socialLinks)
            .map(([k, v]) => [line(k), line(v)] as const)
            .filter(([k, v]) => k && v)
        : [];
    parts.push(`### Social & presence`);
    if (socialEntries.length) {
      for (const [k, v] of socialEntries) {
        parts.push(`- **${k}**: ${v}`);
      }
    } else {
      parts.push(`- None`);
    }
  }

  const comp = Array.isArray(competitors) ? competitors : [];
  if (comp.length) {
    parts.push(`## Top competitors`);
    comp.forEach((c, idx) => {
      const website = line((c as any)?.website);
      if (!website) return;
      parts.push(`${idx + 1}. ${stripProtocol(website)}`);
    });
  }

  if (sortedTactics.length) {
    parts.push(`## Recommended tactics — priority order`);
    for (const t of sortedTactics) {
      const priority = Number((t as any).priority);
      const title = line((t as any).tactic);
      const context = line((t as any).context);
      const label = title ? `**${title}**` : `**Tactic ${Number.isFinite(priority) ? priority : ""}**`;
      const body = context ? `\n\n${context}` : "";
      parts.push(`${Number.isFinite(priority) ? priority : ""}. ${label}${body}`.trim());
    }
  }

  if (footerSummary) {
    parts.push(`---`);
    parts.push(`Powered by MASSIC — ${String(footerSummary).trim()}`);
  }

  return parts.filter(Boolean).join("\n\n").trim();
}

