export type SeoSnapshotDemandLoss = {
  value: number | null;
  disclaimer: string;
};

export type SeoSnapshotStatTiles = {
  searchesAnalyzed: number | null;
  highValueChecked: number | null;
  missedFound: number | null;
  competitorsOutranking: number | null;
};

export type SeoSnapshotTalkingPoint = {
  label: string;
  script: string;
};

export type SeoSnapshotObjectionHandler = {
  objection: string;
  response: string;
};

export type SeoSnapshotExecSummary = {
  execHeadline: string;
  execSubhead: string;
  whatWeFound: string[];
  demandLoss: SeoSnapshotDemandLoss;
};

export type SeoSnapshotDemandRow = {
  keyword: string;
  searchVolume: number | null;
  clientVisibility: string;
  label: string;
};

export type SeoSnapshotMissedVisibilityRow = {
  keyword: string;
  searchVolume: number | null;
  visibility: string;
  score: number | null;
  competitorShowingUp: string;
  opportunity: string;
};

export type SeoSnapshotCompetitorRow = {
  domain: string;
  appearancesInTop10: number | null;
  localPackCount: number | null;
  avgPosition: number | null;
  whyWinning: string;
};

export type SeoSnapshotCompetitorPageRow = {
  domain: string;
  pageAddress: string;
  organicCount: number | null;
  etv: number | null;
  clientGap: boolean | null;
  demandCaptured: string;
};

export type SeoSnapshotOpportunityAsset = {
  assetType: string;
  label: string;
  aggregateScore: number | null;
  keywordCount: number | null;
  keywords: string[];
  bucket: string;
};

export type SeoSnapshotReport = {
  businessName: string;
  website: string;
  location: string;
  generatedAt: string;
  execSummary: SeoSnapshotExecSummary;
  statTiles: SeoSnapshotStatTiles;
  customerDemand: SeoSnapshotDemandRow[];
  missedVisibility: SeoSnapshotMissedVisibilityRow[];
  competitorVisibility: SeoSnapshotCompetitorRow[];
  competitorPages: SeoSnapshotCompetitorPageRow[];
  opportunityMap: SeoSnapshotOpportunityAsset[];
  demandIntro: string;
  missedIntro: string;
  competitorIntro: string;
  opportunityIntro: string;
  firstStepsCaption: string;
  pipelineWarnings: string[];
  analyzedKeywordCount: number | null;
  retainedKeywordCount: number | null;
  framingMode: string;
  talkingPoints: SeoSnapshotTalkingPoint[];
  objectionHandlers: SeoSnapshotObjectionHandler[];
};

const DEFAULT_DEMAND_LOSS_DISCLAIMER =
  "A high-level estimate to put the opportunity in perspective, not a precise calculation.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function booleanOrNull(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(text).filter(Boolean);
}

function firstTextFromRows(rows: Record<string, unknown>[], key: string): string {
  for (const row of rows) {
    const value = text(row[key]);
    if (value) return value;
  }
  return "";
}

function hostFromUrl(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] || raw;
  }
}

function normalizeOpportunityLabel(value: unknown, keyword?: string, visibility?: string): string {
  const raw = text(value);
  const normalized = raw.toLowerCase().trim();

  const explicitMap: Record<string, string> = {
    service_page: "Dedicated service page",
    dedicated_service_page: "Dedicated service page",
    high_value_page: "Dedicated service page",
    missing_page: "Missing service page",
    local_landing_page: "Local landing page",
    local_page: "Local landing page",
    cost_pricing_guide: "Cost/pricing guide",
    pricing_guide: "Cost/pricing guide",
    cost_guide: "Cost/pricing guide",
    authority_guide: "Authority guide",
    authority_content: "Authority content",
    comparison_page: "Comparison page",
    compare_page: "Comparison page",
    audience_specific_page: "Audience-specific page",
    audience_page: "Audience-specific page",
    faq_educational_article: "FAQ / educational article",
    educational_article: "FAQ / educational article",
    faq_article: "FAQ / educational article",
    gbp_optimization: "Map pack + page",
    map_pack_page: "Map pack + page",
    map_pack_and_page: "Map pack + page",
    improve_page: "Improve page",
  };

  if (explicitMap[normalized]) return explicitMap[normalized];

  if (raw && !raw.includes("_")) return raw;
  if (raw) {
    return raw.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }

  const query = String(keyword || "").toLowerCase();
  const visibilityText = String(visibility || "").toLowerCase();
  if (visibilityText.includes("missing local pack")) return "Map pack + page";
  if (/\bnear me\b/.test(query)) return "Local landing page";
  if (/\b(cost|price|pricing|fees?)\b/.test(query)) return "Cost/pricing guide";
  if (/\b(best|vs|versus|compare|comparison)\b/.test(query)) return "Comparison page";
  if (/\b(how|what|where|why|when|guide|tips)\b/.test(query)) return "FAQ / educational article";
  return "Dedicated service page";
}

function reportRoot(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if (isRecord(payload.report)) return payload.report;
  if (isRecord(payload.output_data) && isRecord(payload.output_data.report)) {
    return payload.output_data.report;
  }
  return null;
}

type ReportSection = {
  intro: string;
  items: Record<string, unknown>[];
};

function extractReportSection(
  root: Record<string, unknown>,
  key: string,
  legacyIntroKey: string
): ReportSection {
  const section = root[key];
  if (isRecord(section) && Array.isArray(section.items)) {
    return {
      intro: text(section.intro),
      items: section.items.filter(isRecord),
    };
  }
  if (Array.isArray(section)) {
    const items = section.filter(isRecord);
    return {
      intro: firstTextFromRows(items, legacyIntroKey),
      items,
    };
  }
  return { intro: "", items: [] };
}

function parseDemandLoss(raw: unknown): SeoSnapshotDemandLoss {
  if (isRecord(raw)) {
    return {
      value: numberOrNull(raw.value),
      disclaimer: text(raw.disclaimer) || DEFAULT_DEMAND_LOSS_DISCLAIMER,
    };
  }
  return {
    value: numberOrNull(raw),
    disclaimer: DEFAULT_DEMAND_LOSS_DISCLAIMER,
  };
}

function parseStatTiles(
  execRaw: Record<string, unknown>,
  pipelineMetadata: Record<string, unknown>,
  legacyFallbacks: {
    customerDemandCount: number;
    missedVisibilityCount: number;
    competitorVisibilityCount: number;
  }
): SeoSnapshotStatTiles {
  const tiles = isRecord(execRaw.stat_tiles) ? execRaw.stat_tiles : {};

  return {
    searchesAnalyzed:
      numberOrNull(tiles.searches_analyzed) ??
      numberOrNull(pipelineMetadata.keyword_pool_size) ??
      (legacyFallbacks.customerDemandCount > 0 ? legacyFallbacks.customerDemandCount : null),
    highValueChecked:
      numberOrNull(tiles.serp_checked) ??
      numberOrNull(tiles.high_value_checked) ??
      numberOrNull(pipelineMetadata.retained_count) ??
      (legacyFallbacks.missedVisibilityCount > 0 ? legacyFallbacks.missedVisibilityCount : null),
    missedFound:
      numberOrNull(tiles.missed_found) ??
      (legacyFallbacks.missedVisibilityCount > 0 ? legacyFallbacks.missedVisibilityCount : null),
    competitorsOutranking:
      numberOrNull(tiles.competitors_outranking) ??
      (legacyFallbacks.competitorVisibilityCount > 0 ? legacyFallbacks.competitorVisibilityCount : null),
  };
}

function parseTalkingPoints(payload: unknown): {
  talkingPoints: SeoSnapshotTalkingPoint[];
  objectionHandlers: SeoSnapshotObjectionHandler[];
} {
  if (!isRecord(payload)) {
    return { talkingPoints: [], objectionHandlers: [] };
  }

  const talkingPointsRoot = isRecord(payload.talking_points) ? payload.talking_points : {};
  const talkingPoints = Array.isArray(talkingPointsRoot.talking_points)
    ? talkingPointsRoot.talking_points.filter(isRecord).map((row) => ({
        label: text(row.label),
        script: text(row.script),
      })).filter((row) => row.label || row.script)
    : [];

  const objectionHandlers = Array.isArray(talkingPointsRoot.objection_handlers)
    ? talkingPointsRoot.objection_handlers.filter(isRecord).map((row) => ({
        objection: text(row.objection),
        response: text(row.response),
      })).filter((row) => row.objection || row.response)
    : [];

  return { talkingPoints, objectionHandlers };
}

export function normalizeSeoSnapshotReport(
  payload: unknown,
  fallback?: {
    businessName?: string;
    website?: string;
    location?: string;
    generatedAt?: string;
  }
): SeoSnapshotReport | null {
  const root = reportRoot(payload);
  if (!root) return null;

  const execRaw = isRecord(root.exec_summary) ? root.exec_summary : {};

  const customerDemandSection = extractReportSection(root, "customer_demand", "demand_intro");
  const missedSection = extractReportSection(root, "missed_visibility", "missed_intro");
  const competitorSection = extractReportSection(root, "competitor_visibility", "competitor_intro");
  const opportunitySection = extractReportSection(root, "opportunity_map", "opportunity_intro");

  const customerDemandRows = customerDemandSection.items;
  const missedRows = missedSection.items;
  const competitorRows = competitorSection.items;
  const opportunityRows = opportunitySection.items;

  const competitorPageRows = Array.isArray(root.competitor_pages)
    ? root.competitor_pages.filter(isRecord)
    : [];

  const payloadRecord = isRecord(payload) ? payload : {};
  const internalData = isRecord(payloadRecord.internal_data) ? payloadRecord.internal_data : {};
  const pipelineMetadata = isRecord(internalData.pipeline_metadata)
    ? internalData.pipeline_metadata
    : isRecord(root.pipeline_metadata)
      ? root.pipeline_metadata
      : {};

  const business = isRecord(root.business) ? root.business : {};
  const meta = isRecord(payloadRecord.metadata) ? payloadRecord.metadata : {};

  const customerDemand = customerDemandRows.map((row) => ({
    keyword: text(row.keyword),
    searchVolume: numberOrNull(row.search_volume),
    clientVisibility: text(row.client_visibility),
    label: text(row.label),
  })).filter((row) => row.keyword);

  const missedVisibility = missedRows.map((row) => ({
    keyword: text(row.keyword),
    searchVolume: numberOrNull(row.search_volume),
    visibility: text(row.visibility || row.client_visibility),
    score: numberOrNull(row.score),
    competitorShowingUp: text(row.competitor_showing_up || row.top_competitor || row.competitor || row.domain),
    opportunity: normalizeOpportunityLabel(
      row.opportunity || row.recommended_asset || row.asset_type || row.label,
      text(row.keyword),
      text(row.visibility || row.client_visibility)
    ),
  })).filter((row) => row.keyword);

  const competitorVisibility = competitorRows.map((row) => ({
    domain: text(row.domain),
    appearancesInTop10: numberOrNull(row.appearances_in_top10),
    localPackCount: numberOrNull(row.local_pack_count),
    avgPosition: numberOrNull(row.avg_position),
    whyWinning: text(row.why_winning),
  })).filter((row) => row.domain);

  const competitorPages = competitorPageRows.map((row) => ({
    domain: text(row.domain) || hostFromUrl(text(row.page_address)),
    pageAddress: text(row.page_address),
    organicCount: numberOrNull(row.organic_count),
    etv: numberOrNull(row.etv),
    clientGap: booleanOrNull(row.client_gap),
    demandCaptured: text(row.demand_captured),
  })).filter((row) => row.pageAddress || row.domain);

  const opportunityMap = opportunityRows.map((row) => ({
    assetType: text(row.asset_type),
    label: text(row.label),
    aggregateScore: numberOrNull(row.aggregate_score),
    keywordCount: numberOrNull(row.keyword_count),
    keywords: stringArray(row.keywords),
    bucket: text(row.bucket),
  })).filter((row) => row.label || row.assetType || row.keywords.length);

  const inferredBusinessName =
    text(business.name) ||
    text(root.business_name) ||
    text(fallback?.businessName) ||
    "Business";

  const inferredWebsite = text(business.website) || text(root.website) || text(fallback?.website);
  const inferredLocation =
    text(business.location) ||
    text(root.location) ||
    text(pipelineMetadata.location_name) ||
    text(meta.location_name) ||
    text(fallback?.location);

  const generatedAt =
    text(root.generated_at) ||
    text(payloadRecord.created_at) ||
    text(fallback?.generatedAt);

  const demandIntro =
    customerDemandSection.intro ||
    "Here are the searches where customer demand is already visible.";
  const missedIntro =
    missedSection.intro ||
    "These searches represent immediate opportunities where the business is not showing up strongly.";
  const competitorIntro =
    competitorSection.intro ||
    "Competitors are supporting evidence that the demand is real.";
  const opportunityIntro =
    opportunitySection.intro ||
    "These assets are prioritized by the search demand they can unlock.";

  const opportunityMapSection = isRecord(root.opportunity_map) ? root.opportunity_map : null;
  const firstStepsCaption =
    text(opportunityMapSection?.first_steps_caption) ||
    firstTextFromRows(opportunityRows, "first_steps_caption") ||
    "Full sequencing is set after live data is reviewed.";

  const statTiles = parseStatTiles(execRaw, pipelineMetadata, {
    customerDemandCount: customerDemand.length,
    missedVisibilityCount: missedVisibility.length,
    competitorVisibilityCount: competitorVisibility.length,
  });

  const execSummary = {
    execHeadline:
      text(execRaw.exec_headline) ||
      `${customerDemand.length} demand signals found for ${inferredBusinessName}`,
    execSubhead: text(execRaw.exec_subhead),
    whatWeFound: stringArray(execRaw.what_we_found),
    demandLoss: parseDemandLoss(execRaw.demand_loss),
  };

  const { talkingPoints, objectionHandlers } = parseTalkingPoints(payload);

  const hasRenderableContent =
    execSummary.execHeadline ||
    customerDemand.length ||
    missedVisibility.length ||
    competitorVisibility.length ||
    competitorPages.length ||
    opportunityMap.length;

  if (!hasRenderableContent) return null;

  return {
    businessName: inferredBusinessName,
    website: inferredWebsite,
    location: inferredLocation,
    generatedAt,
    execSummary,
    statTiles,
    customerDemand,
    missedVisibility,
    competitorVisibility,
    competitorPages,
    opportunityMap,
    demandIntro,
    missedIntro,
    competitorIntro,
    opportunityIntro,
    firstStepsCaption,
    pipelineWarnings: stringArray(pipelineMetadata.warnings),
    analyzedKeywordCount: numberOrNull(pipelineMetadata.keyword_pool_size),
    retainedKeywordCount: numberOrNull(pipelineMetadata.retained_count),
    framingMode: text(root.framing_mode),
    talkingPoints,
    objectionHandlers,
  };
}

export function formatSeoSnapshotNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function stripUrlProtocol(value: string): string {
  return String(value || "").replace(/^https?:\/\//i, "").replace(/\/$/i, "");
}

function mdLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function seoSnapshotReportToMarkdown(report: SeoSnapshotReport): string {
  const lines: string[] = [];
  const title = `SEO Snapshot - ${report.businessName || "Business"}`;

  lines.push(`# ${title}`);
  const meta = [stripUrlProtocol(report.website), report.location, report.generatedAt]
    .map(mdLine)
    .filter(Boolean)
    .join(" · ");
  if (meta) lines.push("", meta);

  lines.push("", "## Executive Summary");
  lines.push("", mdLine(report.execSummary.execHeadline));
  if (report.execSummary.execSubhead) lines.push("", mdLine(report.execSummary.execSubhead));
  if (report.execSummary.demandLoss.value != null) {
    lines.push(
      "",
      `Demand you're missing: ~${formatSeoSnapshotNumber(report.execSummary.demandLoss.value)} inquiries / mo`,
      "",
      mdLine(report.execSummary.demandLoss.disclaimer)
    );
  }

  const statTileSummary = [
    report.statTiles.searchesAnalyzed != null
      ? `${formatSeoSnapshotNumber(report.statTiles.searchesAnalyzed)} searches analyzed`
      : "",
    report.statTiles.highValueChecked != null
      ? `${formatSeoSnapshotNumber(report.statTiles.highValueChecked)} high-value searches checked`
      : "",
    report.statTiles.missedFound != null
      ? `${formatSeoSnapshotNumber(report.statTiles.missedFound)} missed opportunities found`
      : "",
    report.statTiles.competitorsOutranking != null
      ? `${formatSeoSnapshotNumber(report.statTiles.competitorsOutranking)} competitors outranking`
      : "",
  ].filter(Boolean);
  if (statTileSummary.length) {
    lines.push("", statTileSummary.join(" · "));
  }

  if (report.execSummary.whatWeFound.length) {
    lines.push("", "What we found:");
    report.execSummary.whatWeFound.forEach((item) => lines.push(`- ${mdLine(item)}`));
  }

  if (report.opportunityMap.length) {
    lines.push("", "High-impact first steps:");
    report.opportunityMap.slice(0, 3).forEach((item) => lines.push(`- ${mdLine(item.label || item.assetType)}`));
    if (report.firstStepsCaption) lines.push("", mdLine(report.firstStepsCaption));
  }

  if (report.customerDemand.length) {
    lines.push("", "## Customer Demand", "", mdLine(report.demandIntro));
    report.customerDemand.forEach((row) => {
      const volume = row.searchVolume != null ? ` - ${formatSeoSnapshotNumber(row.searchVolume)} / mo` : "";
      lines.push(`- ${mdLine(row.keyword)}${volume}`);
    });
  }

  if (report.missedVisibility.length) {
    lines.push("", "## Missed Visibility", "", mdLine(report.missedIntro), "");
    lines.push("| Search | Searches | Your visibility | Competitor showing up | Opportunity |");
    lines.push("| --- | ---: | --- | --- | --- |");
    report.missedVisibility.forEach((row) => {
      lines.push(
        `| ${mdLine(row.keyword)} | ${row.searchVolume != null ? `${formatSeoSnapshotNumber(row.searchVolume)}/mo` : ""} | ${mdLine(row.visibility)} | ${mdLine(row.competitorShowingUp)} | ${mdLine(row.opportunity)} |`
      );
    });
  }

  if (report.competitorVisibility.length) {
    lines.push("", "## Competitor Visibility", "", mdLine(report.competitorIntro), "");
    lines.push("| Competitor | Appears for | In map pack | Why they're winning |");
    lines.push("| --- | ---: | ---: | --- |");
    report.competitorVisibility.forEach((row) => {
      lines.push(
        `| ${mdLine(row.domain)} | ${row.appearancesInTop10 ?? ""} | ${row.localPackCount ?? ""} | ${mdLine(row.whyWinning)} |`
      );
    });
  }

  if (report.competitorPages.length) {
    lines.push("", "## Competitor Pages", "");
    lines.push("| Competitor page | Demand signal | Your gap |");
    lines.push("| --- | ---: | --- |");
    report.competitorPages.forEach((row) => {
      const demandSignal =
        row.demandCaptured ||
        (row.organicCount != null ? String(row.organicCount) : "");
      lines.push(
        `| ${mdLine(row.pageAddress || row.domain)} | ${mdLine(demandSignal)} | ${row.clientGap === true ? "Gap found" : row.clientGap === false ? "No clear gap" : ""} |`
      );
    });
  }

  if (report.opportunityMap.length) {
    lines.push("", "## Opportunity Map", "", mdLine(report.opportunityIntro));
    report.opportunityMap.forEach((item) => {
      const label = mdLine(item.label || item.assetType);
      const bucket = item.bucket ? ` (${mdLine(item.bucket)})` : "";
      const keywords = item.keywords.slice(0, 6).map(mdLine).filter(Boolean).join(", ");
      lines.push(`- ${label}${bucket}${keywords ? `: ${keywords}` : ""}`);
    });
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
