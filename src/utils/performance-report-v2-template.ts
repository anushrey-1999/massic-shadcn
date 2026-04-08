const renderer = require("./performance-report-v2-template.shared.js");

export type PerformanceReportTemplateObject = Record<string, unknown>;

export interface PerformanceReportV2TemplateContext {
  businessName?: string | null;
  period?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  createdAt?: string | null;
  processedMeta?: Record<string, unknown> | null;
  llmOutputs?: Record<string, unknown> | null;
}

export interface ReportTemplateViewModel {
  header: {
    agencyName: string;
    businessName: string;
    periodLine: string | null;
    reportTag: string;
  };
  notices: Array<{ kind: "context" | "baseline"; icon: string; body: string }>;
  headline: { title: string; body: string } | null;
  wins: Array<{ label: string; value: string; context: string | null }>;
  metricCards: Array<{
    label: string;
    value: string;
    delta: string;
    note: string | null;
    tone: "strong" | "dip" | "neu";
    primary?: boolean;
  }>;
  channels: Array<{
    name: string;
    note: string | null;
    tone: "strong" | "dip" | "neu";
    pillLabel: string;
    stats: Array<{ label: string; value: string }>;
  }>;
  gbp: {
    tone: "strong" | "dip" | "neu";
    metrics: Array<{ label: string; value: string; delta: string; tone: "strong" | "dip" | "neu" }>;
    reviewsLine: string | null;
  } | null;
  reviewInsights: {
    summary: string | null;
    positives: Array<{ title: string; body: string }>;
    watchAreas: Array<{ title: string; body: string }>;
  } | null;
  businessIntelligence: Array<{ tag: string; title: string; body: string }>;
  organicPages: {
    note: string | null;
    rows: Array<{
      url: string;
      note: string | null;
      metrics: Array<{ label: string; value: string; tone: "strong" | "dip" | "neu" }>;
    }>;
  } | null;
  rankings: {
    subtitle: string | null;
    summary: string | null;
    biggestMovers: Array<{ query: string; value: string; tone: "strong" | "dip" | "neu" }>;
    newRankings: Array<{ query: string; value: string; tone: "strong" | "dip" | "neu" }>;
  } | null;
  reviewAreas: Array<{ title: string; body: string }>;
  footer: string | null;
}

export const mapPerformanceReportV2Template = renderer.mapPerformanceReportV2Template as (
  input: unknown,
  context?: PerformanceReportV2TemplateContext
) => ReportTemplateViewModel | null;

export const buildPerformanceReportV2BodyHtml = renderer.buildPerformanceReportV2BodyHtml as (
  input: unknown,
  context?: PerformanceReportV2TemplateContext
) => string;

export const buildPerformanceReportV2Document = renderer.buildPerformanceReportV2Document as (
  input: unknown,
  context?: PerformanceReportV2TemplateContext,
  title?: string
) => { html: string; css: string; scopedCss: string; fullHtml: string };

export const createPerformanceReportV2HtmlDocument = renderer.createPerformanceReportV2HtmlDocument as (
  bodyHtml: string,
  title?: string
) => string;

export const PERFORMANCE_REPORT_V2_SCOPED_CSS = renderer.PERFORMANCE_REPORT_V2_SCOPED_CSS as string;
export const PERFORMANCE_REPORT_V2_CSS = renderer.PERFORMANCE_REPORT_V2_CSS as string;
