export type WebsiteSnapshotMetaProfile = {
  segment?: string | null;
  serve?: string | null;
  sell?: string | null;
  b2b_b2c?: string | null;
  ltv?: string | null;
  brand_terms?: string[];
  ctas?: { text: string; url: string }[];
  usps?: string[];
  offerings?: { name?: string; offering?: string; url?: string }[];
  service_areas?: { name: string; kind?: string | null; rank?: number | null }[];
  locations?: Record<string, unknown>[];
  job_competitors?: string[];
};

export type WebsiteSnapshotMeta = {
  url?: string;
  business_name?: string;
  business_description?: string;
  location?: string;
  phone?: string | null;
  report_date?: string;
  profile?: WebsiteSnapshotMetaProfile;
  run?: {
    job_id?: string;
    dfs_location_name?: string;
    dfs_language_code?: string;
    competitive_set_thin?: boolean;
    selected_competitors?: string[];
    competitors_domain_count?: number;
  };
  trust_signal_sources?: Record<string, "scraped" | "profile">;
};

export type WebsiteSnapshotCallout = {
  tone?: "green" | "amber" | "red" | string;
  title?: string;
  body?: string;
};

export type WebsiteSnapshotTier = {
  tier?: number;
  label?: string;
  reasoning?: string;
  tier_caveat?: string | null;
};

export type WebsiteSnapshotGoal = {
  dominant_cta?: string | null;
  inferred_goal?: string;
  funnel_end?: string;
  /** New key (preferred). */
  body?: string | null;
  /** Old key (backward compatible). */
  goal_body?: string | null;
  funnel_steps?: string[];
};

export type WebsiteSnapshotTrendPoint = { year: number; month: number; etv: number };
export type WebsiteSnapshotTrend = {
  window?: string;
  pct_change?: number;
  direction?: "up" | "down" | "flat" | "not_enough_history" | string;
  points?: WebsiteSnapshotTrendPoint[];
};

export type WebsiteSnapshotTopicWon = {
  cluster?: string;
  term?: string;
  position?: number;
  volume?: number;
  etv?: number;
  url?: string;
};

export type WebsiteSnapshotGaps = {
  near_miss?: { term?: string; volume?: number; position?: number }[];
  missing?: any[];
};

export type WebsiteSnapshotWorkhorse = {
  top_url?: string;
  top_url_etv?: number;
  concentration_ratio?: number;
  pages?: { url?: string; etv?: number; keyword_count?: number; top_terms?: string[] }[];
};

export type WebsiteSnapshotSearch = {
  keywords_count?: number;
  etv?: number;
  pos_1?: number;
  top10?: number;
  striking_distance?: number;
  referring_domains?: number | null;
  paid_value?: number;
  brand_share?: number;
  trend?: WebsiteSnapshotTrend;
  traffic_read?: string;
  topics_won?: WebsiteSnapshotTopicWon[];
  gaps?: WebsiteSnapshotGaps;
  workhorse?: WebsiteSnapshotWorkhorse;
};

export type WebsiteSnapshotCompetitor = {
  domain?: string;
  title?: string;
  etv?: number;
  keyword_count?: number;
  note?: string;
  example?: { url?: string; term?: string; position?: number; why?: string };
};

export type WebsiteSnapshotUnderTheHood = {
  rows?: { layer?: string; verdict?: string; detail?: string }[];
  pills?: { name?: string; status?: "neutral" | "good" | "none" | string }[];
};

export type WebsiteSnapshotIssue = {
  severity?: "high" | "med" | "low" | string;
  title?: string;
  body?: string;
};

export type WebsiteSnapshotLadderRung = {
  rung?: number;
  title?: string;
  headline?: string;
  body?: string;
  status?: "in_place" | "partly" | "needs_work" | "missing" | string;
  example?: string;
};

export type WebsiteSnapshotPlanStep = { step?: number; title?: string; body?: string };

export type WebsiteSnapshotReport = {
  meta?: WebsiteSnapshotMeta;
  overview_callouts?: WebsiteSnapshotCallout[];
  tier?: WebsiteSnapshotTier;
  goal?: WebsiteSnapshotGoal;
  search?: WebsiteSnapshotSearch;
  competitors_intro?: string;
  competitors?: WebsiteSnapshotCompetitor[];
  competitors_throughline?: string;
  under_the_hood?: WebsiteSnapshotUnderTheHood;
  issues?: WebsiteSnapshotIssue[];
  ladder_intro?: string;
  ladder?: WebsiteSnapshotLadderRung[];
  ladder_summary?: string;
  plan?: WebsiteSnapshotPlanStep[];
  takeaway?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isWebsiteSnapshotReportLike(value: unknown): value is WebsiteSnapshotReport {
  if (!isRecord(value)) return false;
  const meta = (value as any).meta;
  return isRecord(meta) && typeof meta.url === "string";
}

function reportRoot(payload: unknown): unknown {
  if (!isRecord(payload)) return null;

  if (isWebsiteSnapshotReportLike(payload)) return payload;

  const direct = (payload as any).report;
  if (isWebsiteSnapshotReportLike(direct)) return direct;

  const outputData = (payload as any).output_data;
  if (isRecord(outputData) && isWebsiteSnapshotReportLike((outputData as any).report)) {
    return (outputData as any).report;
  }

  // Some APIs may nest as `data.report` or `result.report`
  const candidates = [(payload as any).data, (payload as any).result];
  for (const candidate of candidates) {
    if (isRecord(candidate) && isWebsiteSnapshotReportLike((candidate as any).report)) {
      return (candidate as any).report;
    }
  }

  return null;
}

export function normalizeWebsiteSnapshotReport(payload: unknown): WebsiteSnapshotReport | null {
  const root = reportRoot(payload);
  if (!root) return null;
  return root as WebsiteSnapshotReport;
}

function mdLine(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function mdList(values: (string | null | undefined)[]): string[] {
  return values.map((v) => mdLine(String(v ?? ""))).filter(Boolean);
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs >= 1000) return `${Math.round(value).toLocaleString()}%`;
  if (abs >= 100) return `${value.toFixed(0)}%`;
  if (abs >= 10) return `${value.toFixed(1)}%`;
  return `${value.toFixed(2)}%`;
}

export function websiteSnapshotReportToMarkdown(report: WebsiteSnapshotReport): string {
  const meta = report.meta || {};
  const business = mdLine(meta.business_name || "Website Snapshot Report");
  const url = mdLine(meta.url || "");
  const location = mdLine(meta.location || "");
  const phone = mdLine(meta.phone || "");
  const reportDate = mdLine(meta.report_date || "");

  const lines: string[] = [];
  lines.push(`# Website Snapshot - ${business}`);
  const metaLine = mdList([url, location, phone, reportDate]).join(" · ");
  if (metaLine) lines.push("", metaLine);

  const callouts = Array.isArray(report.overview_callouts) ? report.overview_callouts : [];
  if (callouts.length) {
    lines.push("", "## Overview");
    for (const c of callouts) {
      const title = mdLine(c.title || "");
      const body = mdLine(c.body || "");
      if (!title && !body) continue;
      lines.push("", `### ${title || "Callout"}`);
      if (body) lines.push("", body);
    }
  }

  if (report.tier) {
    const tier = report.tier;
    const label = mdLine(tier.label || "");
    const reasoning = mdLine(tier.reasoning || "");
    const caveat = mdLine(tier.tier_caveat || "");
    if (label || reasoning) {
      lines.push("", "## What SEO can do for you");
      if (label) lines.push("", `**${label}**`);
      if (reasoning) lines.push("", reasoning);
      if (caveat) lines.push("", caveat);
    }
  }

  if (report.goal) {
    const g = report.goal;
    const funnelEnd = mdLine(g.funnel_end || "");
    const goalBody = mdLine(String(g.body ?? g.goal_body ?? ""));
    const steps = Array.isArray(g.funnel_steps) ? g.funnel_steps.map((s) => mdLine(String(s))) : [];
    if (funnelEnd || goalBody || steps.length) {
      lines.push("", "## Goal");
      if (goalBody) lines.push("", goalBody);
      if (steps.length) {
        lines.push("", "Funnel:");
        for (const step of steps.filter(Boolean)) lines.push(`- ${step}`);
      }
      if (funnelEnd) lines.push("", `Win: ${funnelEnd}`);
    }
  }

  const search = report.search || {};
  const trafficRead = mdLine(search.traffic_read || "");
  if (trafficRead) {
    lines.push("", "## Search");
    lines.push("", trafficRead);

    const trend = search.trend || {};
    const pct = formatPercent(trend.pct_change);
    const window = mdLine(trend.window || "");
    if (pct || window) {
      lines.push("", `Trend: ${[pct, window].filter(Boolean).join(" over ")}`.trim());
    }
  }

  const topics = Array.isArray(search.topics_won) ? search.topics_won : [];
  if (topics.length) {
    lines.push("", "## Topics won");
    for (const row of topics.slice(0, 10)) {
      const term = mdLine(row.term || "");
      if (!term) continue;
      const position = row.position != null ? `#${row.position}` : "";
      const volume = row.volume != null ? `${row.volume.toLocaleString()}/mo` : "";
      const cluster = mdLine(row.cluster || "");
      lines.push(`- ${[term, position, volume, cluster ? `(${cluster})` : ""].filter(Boolean).join(" · ")}`);
    }
  }

  const nearMiss = Array.isArray(search.gaps?.near_miss) ? search.gaps?.near_miss : [];
  if (nearMiss.length) {
    lines.push("", "## Near-miss gaps");
    for (const row of nearMiss.slice(0, 10)) {
      const term = mdLine(row.term || "");
      if (!term) continue;
      const position = row.position != null ? `#${row.position}` : "";
      const volume = row.volume != null ? `${row.volume.toLocaleString()}/mo` : "";
      lines.push(`- ${[term, position, volume].filter(Boolean).join(" · ")}`);
    }
  }

  const competitors = Array.isArray(report.competitors) ? report.competitors : [];
  if (competitors.length) {
    lines.push("", "## Competitors");
    const intro = mdLine(String(report.competitors_intro ?? ""));
    if (intro) lines.push("", intro);
    for (const c of competitors) {
      const domain = mdLine(c.domain || "");
      if (!domain) continue;
      const title = mdLine(c.title || "");
      const etv = c.etv != null ? `ETV ${Math.round(c.etv).toLocaleString()}` : "";
      const kw = c.keyword_count != null ? `${c.keyword_count.toLocaleString()} keywords` : "";
      lines.push("", `### ${title || domain}`);
      if (title && domain) lines.push("", domain);
      const stats = [etv, kw].filter(Boolean).join(" · ");
      if (stats) lines.push("", stats);
      const note = mdLine(c.note || "");
      if (note) lines.push("", note);
      const ex = c.example || {};
      const exUrl = mdLine(String((ex as any)?.url || ""));
      const exTerm = mdLine(String((ex as any)?.term || ""));

      const domainName = mdLine(
        String(domain || "")
          .replace(/^www\./i, "")
          .split(".")
          .slice(-2, -1)[0] || domain
      );
      const websiteLabel =
        domainName.toLowerCase() === "lifetime"
          ? "Lifetime"
          : domainName
            ? domainName.charAt(0).toUpperCase() + domainName.slice(1)
            : domain;

      const exLine = mdLine(
        [
          exTerm ? `Term: ${exTerm}` : "",
          exUrl ? `URL: [${websiteLabel}](${exUrl})` : "",
        ]
          .filter(Boolean)
          .join(" · ")
      );
      if (exLine) lines.push("", `Example: ${exLine}`);
      const why = mdLine(String(ex.why || ""));
      if (why) lines.push("", why);
    }
    const throughline = mdLine(String(report.competitors_throughline ?? ""));
    if (throughline) lines.push("", throughline);
  }

  const u = report.under_the_hood || {};
  const issues = Array.isArray(report.issues) ? report.issues : [];
  if ((u.rows && u.rows.length) || (u.pills && u.pills.length) || issues.length) {
    lines.push("", "## Under the hood");
    if (Array.isArray(u.pills) && u.pills.length) {
      const pillNames = u.pills.map((p) => mdLine(p.name || "")).filter(Boolean);
      if (pillNames.length) lines.push("", `Tech: ${pillNames.join(", ")}`);
    }
    if (Array.isArray(u.rows) && u.rows.length) {
      for (const row of u.rows) {
        const layer = mdLine(row.layer || "");
        const verdict = mdLine(row.verdict || "");
        const detail = mdLine(row.detail || "");
        if (!layer && !verdict && !detail) continue;
        lines.push("", `### ${layer || "Finding"}`);
        if (verdict) lines.push("", verdict);
        if (detail) lines.push("", detail);
      }
    }
    if (issues.length) {
      lines.push("", "### Issues");
      for (const it of issues) {
        const title = mdLine(it.title || "");
        const body = mdLine(it.body || "");
        const sev = mdLine(it.severity || "");
        if (!title && !body) continue;
        lines.push("", `- ${[sev ? sev.toUpperCase() : "", title].filter(Boolean).join(" ")}`.trim());
        if (body) lines.push(`  - ${body}`);
      }
    }
  }

  const ladder = Array.isArray(report.ladder) ? report.ladder : [];
  if (ladder.length) {
    lines.push("", "## Content ladder");
    const intro = mdLine(String(report.ladder_intro ?? ""));
    if (intro) lines.push("", intro);
    for (const rung of ladder) {
      const title = mdLine(String(rung.headline || rung.title || ""));
      const status = mdLine(rung.status || "");
      const body = mdLine(String(rung.body || rung.example || ""));
      const label = `Rung ${rung.rung ?? ""}`.trim();
      lines.push(`- ${[label, title, status ? `(${status})` : ""].filter(Boolean).join(" ")}`);
      if (body) lines.push(`  - ${body}`);
    }
    const summary = mdLine(String(report.ladder_summary ?? ""));
    if (summary) lines.push("", summary);
  }

  const plan = Array.isArray(report.plan) ? report.plan : [];
  if (plan.length) {
    lines.push("", "## Plan");
    for (const step of plan) {
      const title = mdLine(step.title || "");
      const body = mdLine(step.body || "");
      if (!title && !body) continue;
      lines.push("", `### ${title || `Step ${step.step ?? ""}`.trim()}`);
      if (body) lines.push("", body);
    }
  }

  const takeaway = mdLine(report.takeaway || "");
  if (takeaway) {
    lines.push("", "## Takeaway", "", takeaway);
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

