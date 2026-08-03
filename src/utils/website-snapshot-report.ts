// Updated types based on new backend field mappings

export type WebsiteSnapshotRender = {
  hero?: boolean;
  stats_row?: boolean;
  trend_chart?: boolean;
  brand_split?: boolean;
  intent_mix?: boolean;
  scale_comparison?: boolean;
  goal_chain?: boolean;
  health_table?: boolean;
  technology_chips?: boolean;
  coverage_map?: boolean;
  tactics?: boolean;
};

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
    buckets_input?: any;
  };
  trust_signal_sources?: Record<string, "scraped" | "profile">;
};

export type WebsiteSnapshotCallout = {
  tone?: "green" | "amber" | "red" | string;
  title?: string;
  body?: string;
};

export type WebsiteSnapshotHero = {
  variant?: string;
  display?: string;
  value?: number | null;
  label?: string;
  description?: string;
};

export type WebsiteSnapshotTier = {
  level?: 1 | 2 | 3 | number;
  name?: string;
  reasoning?: string;
};

export type WebsiteSnapshotGoal = {
  dominant_cta?: string | null;
  inferred_goal?: string;
  funnel_end?: string;
  body?: string | null;
  funnel_steps?: string[];
};

export type WebsiteSnapshotTrendPoint = { year: number; month: number; etv: number };
export type WebsiteSnapshotTrend = {
  window?: string;
  pct_change?: number;
  direction?: "growing" | "flat" | "declining" | "insufficient-history" | string;
  points?: WebsiteSnapshotTrendPoint[];
};

export type WebsiteSnapshotIntentMix = {
  commercial?: number;
  transactional?: number;
  informational?: number;
  navigational?: number;
  local_share?: number | null;
};

export type WebsiteSnapshotScaleComparison = {
  you?: number;
  peer?: number;
  ratio?: number;
} | null;

export type WebsiteSnapshotYouWin = {
  cluster?: string;
  examples?: string[];
  blurb?: string;
};

export type WebsiteSnapshotBuyersElsewhere = {
  cluster?: string;
  examples?: string[];
  blurb?: string;
};

export type WebsiteSnapshotSearch = {
  keywords_count?: number;
  etv?: number;
  top10?: number;
  referring_domains?: number | null;
  brand_share?: number;
  trend?: WebsiteSnapshotTrend;
  traffic_read?: string;
  you_win?: WebsiteSnapshotYouWin[];
  buyers_elsewhere?: WebsiteSnapshotBuyersElsewhere[];
};

export type WebsiteSnapshotCompetitorBucketsSetup = {
  market?: string;
  delivery?: "place_based" | "remote" | string;
};

export type WebsiteSnapshotShowsUp = {
  direct_competitors?: { domain: string }[];
  direct_note?: string;
  similar_elsewhere?: { domain: string; where?: string | null }[];
  similar_elsewhere_note?: string;
  directories_tools?: string[];
  directories_tools_note?: string;
  noise?: string[];
  noise_note?: string;
};

export type WebsiteSnapshotShouldBe = {
  name?: string;
  note?: string;
  where?: string | null;
  shows_up_in_results?: boolean;
};

export type WebsiteSnapshotCompetitorBuckets = {
  setup?: WebsiteSnapshotCompetitorBucketsSetup;
  gap?: string;
};

export type WebsiteSnapshotUnderTheHoodRow = {
  layer?: string;
  verdict?: "Fine" | "Gap" | "Critical" | string;
  detail?: string;
};

export type WebsiteSnapshotTechPill = {
  name?: string;
  status?: "neutral" | "good" | "warn" | "none" | string;
};

export type WebsiteSnapshotUnderTheHood = {
  rows?: WebsiteSnapshotUnderTheHoodRow[];
  pills?: WebsiteSnapshotTechPill[];
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

export type WebsiteSnapshotTactic = {
  phase?: string;
  title?: string;
  body?: string;
  tactic?: string;
};

export type WebsiteSnapshotReport = {
  render?: WebsiteSnapshotRender;
  meta?: WebsiteSnapshotMeta;
  diagnosis?: string;
  hero?: WebsiteSnapshotHero;
  overview_callouts?: WebsiteSnapshotCallout[];
  tier?: WebsiteSnapshotTier;
  goal?: WebsiteSnapshotGoal;
  search?: WebsiteSnapshotSearch;
  intent_mix?: WebsiteSnapshotIntentMix;
  scale_comparison?: WebsiteSnapshotScaleComparison;
  shows_up?: WebsiteSnapshotShowsUp;
  should_be?: WebsiteSnapshotShouldBe[];
  competitor_buckets?: WebsiteSnapshotCompetitorBuckets;
  under_the_hood?: WebsiteSnapshotUnderTheHood;
  issues?: WebsiteSnapshotIssue[];
  ladder_intro?: string;
  ladder?: WebsiteSnapshotLadderRung[];
  ladder_summary?: string;
  tactics?: WebsiteSnapshotTactic[];
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

  if (report.diagnosis) {
    lines.push("", `## ${report.diagnosis}`);
  }

  if (report.hero) {
    const hero = report.hero;
    const display = mdLine(hero.display || "");
    const label = mdLine(hero.label || "");
    const description = mdLine(hero.description || "");
    if (display || label) {
      lines.push("", "## Hero");
      if (display) lines.push("", `**${display}**`);
      if (label) lines.push("", label);
      if (description) lines.push("", description);
    }
  }

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
    const name = mdLine(tier.name || "");
    const reasoning = mdLine(tier.reasoning || "");
    if (name || reasoning) {
      lines.push("", "## What SEO can do for you");
      if (name) lines.push("", `**${name}**`);
      if (reasoning) lines.push("", reasoning);
    }
  }

  if (report.goal) {
    const g = report.goal;
    const funnelEnd = mdLine(g.funnel_end || "");
    const goalBody = mdLine(String(g.body ?? ""));
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
    lines.push("", "## Where you stand in search");
    lines.push("", trafficRead);

    const trend = search.trend || {};
    const pct = formatPercent(trend.pct_change);
    const window = mdLine(trend.window || "");
    if (pct || window) {
      lines.push("", `Trend: ${[pct, window].filter(Boolean).join(" over ")}`.trim());
    }
  }

  const youWin = Array.isArray(search.you_win) ? search.you_win : [];
  if (youWin.length) {
    lines.push("", "## You win");
    for (const row of youWin) {
      const cluster = mdLine(row.cluster || "");
      const examples = Array.isArray(row.examples) ? row.examples.map(mdLine).filter(Boolean) : [];
      const blurb = mdLine(row.blurb || "");
      if (cluster) lines.push("", `### ${cluster}`);
      if (examples.length) lines.push("", `Examples: ${examples.join(", ")}`);
      if (blurb) lines.push("", blurb);
    }
  }

  const buyersElsewhere = Array.isArray(search.buyers_elsewhere) ? search.buyers_elsewhere : [];
  if (buyersElsewhere.length) {
    lines.push("", "## What you're missing");
    for (const row of buyersElsewhere) {
      const cluster = mdLine(row.cluster || "");
      const examples = Array.isArray(row.examples) ? row.examples.map(mdLine).filter(Boolean) : [];
      const blurb = mdLine(row.blurb || "");
      if (cluster) lines.push("", `### ${cluster}`);
      if (examples.length) lines.push("", `Examples: ${examples.join(", ")}`);
      if (blurb) lines.push("", blurb);
    }
  }

  const showsUp = report.shows_up || {};
  const shouldBe = Array.isArray(report.should_be) ? report.should_be : [];
  if (Object.keys(showsUp).length || shouldBe.length) {
    lines.push("", "## Who shows up");
    
    const directCompetitors = Array.isArray(showsUp.direct_competitors) ? showsUp.direct_competitors : [];
    if (directCompetitors.length) {
      lines.push("", "### Direct competitors");
      for (const c of directCompetitors) {
        lines.push(`- ${mdLine(c.domain || "")}`);
      }
      if (showsUp.direct_note) lines.push("", mdLine(showsUp.direct_note));
    }

    const similarElsewhere = Array.isArray(showsUp.similar_elsewhere) ? showsUp.similar_elsewhere : [];
    if (similarElsewhere.length) {
      lines.push("", "### Similar elsewhere");
      for (const c of similarElsewhere) {
        const domain = mdLine(c.domain || "");
        const where = c.where ? ` (${mdLine(c.where)})` : "";
        lines.push(`- ${domain}${where}`);
      }
      if (showsUp.similar_elsewhere_note) lines.push("", mdLine(showsUp.similar_elsewhere_note));
    }

    if (shouldBe.length) {
      lines.push("", "### Who should be there");
      for (const item of shouldBe) {
        const name = mdLine(item.name || "");
        const note = mdLine(item.note || "");
        if (name) lines.push(`- ${name}${note ? ` - ${note}` : ""}`);
      }
    }
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
    lines.push("", "## Where your content should grow");
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

  const tactics = Array.isArray(report.tactics) ? report.tactics : [];
  if (tactics.length) {
    lines.push("", "## The plan, in order");
    let currentPhase = "";
    for (const step of tactics) {
      const phase = mdLine(step.phase || "");
      const title = mdLine(step.title || "");
      const body = mdLine(step.body || "");
      
      if (phase && phase !== currentPhase) {
        lines.push("", `### ${phase}`);
        currentPhase = phase;
      }
      
      if (title || body) {
        lines.push("", `**${title || "Step"}**`);
        if (body) lines.push("", body);
      }
    }
  }

  const takeaway = mdLine(report.takeaway || "");
  if (takeaway) {
    lines.push("", "## Honest takeaway", "", takeaway);
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
