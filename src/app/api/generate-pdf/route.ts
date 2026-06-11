import { NextRequest, NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import Showdown from "showdown";
import { parsePerformanceReport } from "@/utils/performance-report-v2";
import {
  buildPerformanceReportV2BodyHtml,
  buildPerformanceReportV2Document,
  PERFORMANCE_REPORT_V2_CSS,
  type PerformanceReportV2TemplateContext,
} from "@/utils/performance-report-v2-template";
import {
  BILLING_RECONCILIATION_CSS,
  buildBillingReconciliationBodyHtml,
} from "@/utils/billing-reconciliation-pdf";
import type { BillingReconciliationReport } from "@/types/billing-reconciliation-types";
import {
  formatSeoSnapshotNumber,
  stripUrlProtocol,
  type SeoSnapshotReport,
} from "@/utils/seo-snapshot-report";

const CHROMIUM_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

type ExpressPitchTactic = {
  priority?: number;
  tactic?: string;
  context?: string;
};

type ExpressPitch = {
  url?: string;
  tier?: number;
  tier_label?: string;
  why?: string;
  tactics?: ExpressPitchTactic[];
  [key: string]: any;
};

type ProfileTag = { label: string; value: string };
type Competitor = { name?: string | null; website: string };

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

const converter = new Showdown.Converter({
  tables: true,
  ghCompatibleHeaderId: true,
  simpleLineBreaks: true,
  emoji: true,
});

let browserInstance: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;
const PDF_VIEWPORT = { width: 1440, height: 2200, deviceScaleFactor: 1 };

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.connected) return browserInstance;

  if (browserPromise) return browserPromise;

  browserPromise = (async () => {
    const isLocal = process.env.NODE_ENV === "development";

    if (isLocal) {
      const puppeteerFull = await import("puppeteer");
      browserInstance = await puppeteerFull.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
    } else {
      browserInstance = await puppeteer.launch({
        args: [...chromium.args, "--disable-dev-shm-usage"],
        defaultViewport: { width: 1200, height: 800 },
        executablePath: await chromium.executablePath(CHROMIUM_URL),
        headless: true,
      });
    }

    browserPromise = null;
    return browserInstance;
  })();

  return browserPromise;
}

const CSS = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1a1a1a;
    padding: 40px;
  }
  
  h1 {
    font-size: 1.75rem;
    line-height: 1.25;
    font-weight: 600;
    margin: 1rem 0;
  }
  
  h2 {
    font-size: 1.5rem;
    line-height: 1.3;
    font-weight: 600;
    margin: 1rem 0;
  }
  
  h3 {
    font-size: 1.25rem;
    line-height: 1.35;
    font-weight: 600;
    margin: 0.75rem 0;
  }
  
  h4 {
    font-size: 1.125rem;
    line-height: 1.4;
    font-weight: 600;
    margin: 0.75rem 0;
  }
  
  p {
    margin: 0.75rem 0;
  }
  
  ul {
    list-style: disc;
    padding-left: 1.5rem;
    margin: 0.75rem 0;
  }
  
  ol {
    list-style: decimal;
    padding-left: 1.5rem;
    margin: 0.75rem 0;
  }
  
  li {
    margin: 0.25rem 0;
  }
  
  blockquote {
    border-left: 3px solid #e5e5e5;
    padding-left: 1rem;
    margin: 0.75rem 0;
    font-style: italic;
    color: #666;
  }
  
  a {
    color: #0066cc;
    text-decoration: underline;
  }
  
  strong {
    font-weight: 600;
  }
  
  em {
    font-style: italic;
  }
  
  code {
    background: #f5f5f5;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: 0.9em;
  }
  
  pre {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 0.75rem 0;
  }
  
  pre code {
    background: none;
    padding: 0;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }
  
  th, td {
    border: 1px solid #e5e5e5;
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  
  th {
    background: #f9f9f9;
    font-weight: 600;
  }
  
  hr {
    border: none;
    border-top: 1px solid #e5e5e5;
    margin: 1.5rem 0;
  }
  
  img {
    max-width: 100%;
    height: auto;
  }
`;

const SNAPSHOT_CSS = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.55;
    color: #0A0A0A;
    padding: 0;
    background: #ffffff;
  }

  .container {
    width: 100%;
    margin: 0;
    padding: 0 1px;
  }

  .card {
    border: 1px solid #E5E5E5;
    border-radius: 10px;
    padding: 18px 18px;
    background: #ffffff;
  }

  .headerRow {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }

  .title {
    font-size: 22px;
    font-weight: 700;
    line-height: 1.25;
  }

  .url {
    margin-top: 8px;
    color: #2563eb;
    text-decoration: underline;
    text-underline-offset: 4px;
    word-break: break-word;
    display: inline-block;
    font-size: 14px;
  }

  .generated {
    text-align: right;
    flex-shrink: 0;
  }

  .generatedLabel {
    font-size: 10px;
    letter-spacing: 0.08em;
    color: #737373;
    font-weight: 600;
  }

  .generatedDate {
    margin-top: 4px;
    font-size: 12px;
    color: #737373;
  }

  .spacer {
    height: 12px;
  }

  .tierCard {
    border: 1px solid #d1fae5;
    background: #ecfdf5;
    border-radius: 10px;
    padding: 18px;
  }

  .tierText h2 {
    font-size: 16px;
    font-weight: 700;
    color: #2E6A56;
    margin: 0;
  }

  .tierText .why {
    margin-top: 6px;
    color: #171717;
    font-size: 13px;
  }

  .strip {
    border: 1px solid #E5E5E5;
    border-radius: 10px;
    background: #FAFAFA;
    padding: 14px 18px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 11px;
    background: #FAFAFA;
    border: 1px solid #E5E5E5;
    color: #404040;
  }

  .tagLabel {
    color: #737373;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  .tagValue {
    color: #171717;
    font-weight: 600;
  }

  .divider {
    height: 1px;
    width: 100%;
    background: rgba(0,0,0,0.05);
  }

  .section {
    padding: 18px 0;
  }

  .sectionTitle {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #737373;
    margin-bottom: 16px;
  }

  .techGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: #E5E5E5;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    overflow: hidden;
  }

  .techCell {
    background: #ffffff;
    padding: 14px 16px;
  }

  .cellLabel {
    font-size: 11px;
    color: #737373;
    margin-bottom: 4px;
    font-weight: 500;
  }

  .cellValue {
    font-size: 13px;
    font-weight: 600;
    color: #0A0A0A;
  }

  .statusRow {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    align-items: center;
  }

  .statusItem {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #171717;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    flex-shrink: 0;
  }

  .dotGreen { background: #10B981; }
  .dotRed { background: #EF4444; }
  .dotYellow { background: #F59E0B; }

  .statusValue { font-weight: 600; }

  .metaBlock {
    background: #FAFAFA;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 12px;
  }

  .metaBlock:last-child { margin-bottom: 0; }

  .metaLabel {
    font-size: 11px;
    color: #737373;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .metaValue {
    font-size: 13px;
    color: #0A0A0A;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    word-break: break-word;
  }

  .metaMissing {
    color: #EF4444;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-style: italic;
  }

  .ctaStrip, .socialRow {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ctaTag {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    background: #EFF6FF;
    color: #2563EB;
    font-weight: 500;
    border: 1px solid #BFDBFE;
  }

  .socialTag {
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    background: #FAFAFA;
    border: 1px solid #E5E5E5;
    color: #6B7280;
    text-decoration: none;
    display: inline-block;
  }

  .competitorList {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .competitorItem {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #FAFAFA;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 12px;
    color: #2563EB;
    text-decoration: none;
  }

  .competitorNum {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    font-weight: 600;
    color: #737373;
    width: 18px;
    text-align: center;
  }

  .tacticsHeader {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #737373;
    margin-bottom: 0;
  }

  .tacticItem {
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: 12px;
    padding: 18px 0;
  }

  .tacticNum {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #ffffff;
    border: 1px solid #E5E5E5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #6B7280;
  }

  .tacticTitle {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 0;
    color: #0A0A0A;
  }

  .tacticContext {
    margin-top: 0;
    color: #6B7280;
    font-size: 13px;
    line-height: 1.5;
  }

  .tacticContext p { margin: 0 !important; }
  .tacticContext ul, .tacticContext ol { margin: 0 0 0 1.25rem !important; }

  .tacticDivider {
    height: 1px;
    background: rgba(0,0,0,0.05);
    margin-left: 44px; /* aligns with content column */
  }

  .footer {
    padding: 16px 18px;
    background: #FAFAFA;
    border: 1px solid #E5E5E5;
    border-radius: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .footerMuted {
    font-size: 11px;
    color: #737373;
  }

  .footerMono {
    font-size: 11px;
    color: #737373;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    text-align: right;
    word-break: break-word;
  }
`;

const SEO_SNAPSHOT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #0A0A0A;
    background: #ffffff;
  }
  .wrap { width: 100%; }
  .card, .section {
    background: #ffffff;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .card { padding: 20px 22px; margin-bottom: 14px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .logo {
    width: 32px; height: 32px; border-radius: 8px; background: #2E6A56; color: #fff;
    display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500;
  }
  h1 { font-size: 18px; font-weight: 500; line-height: 1.25; color: #171717; }
  h2 { font-size: 22px; font-weight: 500; line-height: 1.3; color: #171717; margin-bottom: 6px; }
  h3 { font-size: 14px; font-weight: 500; color: #171717; margin-bottom: 8px; }
  .sub, .muted { color: #737373; }
  .sub { font-size: 12px; margin-top: 3px; }
  .kicker { font-size: 10px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: #737373; }
  .section { padding: 24px; margin-bottom: 16px; break-inside: avoid; }
  .secnum { font-size: 10px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: #2E6A56; margin-bottom: 8px; }
  .lead { font-size: 14px; color: #525252; max-width: 720px; margin-bottom: 18px; }
  .loss {
    display: flex; justify-content: space-between; align-items: center; gap: 20px;
    background: #FAFAFA; border: 1px solid #E5E5E5; border-left: 3px solid #2E6A56;
    border-radius: 8px; padding: 18px 22px; margin-bottom: 18px;
  }
  .lossBadge { display: inline-block; font-size: 12px; font-weight: 500; color: #991B1B; background: #FEE2E2; padding: 3px 8px; border-radius: 4px; margin-bottom: 10px; }
  .big { font-size: 40px; font-weight: 500; line-height: 1; color: #0A0A0A; }
  .unit { font-size: 18px; color: #737373; font-weight: 400; }
  .assume { font-size: 11px; color: #737373; max-width: 250px; text-align: right; }
  .tiles { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 18px; }
  .tile { background: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 8px; padding: 14px; }
  .tileN { font-size: 28px; font-weight: 500; line-height: 1; }
  .accent { color: #2E6A56; }
  .tileL { font-size: 12px; color: #737373; margin-top: 8px; }
  .twocol { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .panel { background: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 8px; padding: 16px; }
  ul.clean { list-style: none; margin: 0; padding: 0; }
  ul.clean li { position: relative; padding-left: 17px; margin-bottom: 7px; font-size: 13px; color: #525252; }
  ul.clean li:before { content: ""; position: absolute; left: 0; top: 8px; width: 6px; height: 6px; border-radius: 50%; background: #2E6A56; }
  .demand { display: grid; grid-template-columns: 1fr 1fr; gap: 0 22px; }
  .dq { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E5E5E5; padding: 9px 2px; gap: 14px; }
  .dq span:first-child { color: #0A0A0A; }
  .dq span:last-child { color: #737373; white-space: nowrap; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; background: #FAFAFA; color: #737373; font-weight: 500; font-size: 12px; padding: 9px 11px; border-bottom: 1px solid #E5E5E5; }
  td { padding: 10px 11px; border-bottom: 1px solid #E5E5E5; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  .tablewrap { border: 1px solid #E5E5E5; border-radius: 8px; overflow: hidden; }
  .badge { display: inline-block; font-size: 12px; font-weight: 500; padding: 3px 8px; border-radius: 4px; white-space: nowrap; }
  .bad { background: #FEE2E2; color: #991B1B; }
  .warn { background: #FEF3C7; color: #92400E; }
  .ok { background: #DCFCE7; color: #166534; }
  .neu { background: #F5F5F5; color: #525252; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #525252; word-break: break-word; }
  .buckets { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .bucket { border: 1px solid #E5E5E5; border-radius: 8px; padding: 16px; background: #fff; }
  .bucket .tag { font-size: 11px; font-weight: 500; padding: 2px 7px; border-radius: 4px; background: #DCFCE7; color: #166534; margin-left: 6px; }
  .bucket ul { margin: 8px 0 0; padding-left: 16px; }
  .bucket li { font-size: 13px; color: #525252; margin-bottom: 5px; }
  .foot { font-size: 12px; color: #737373; text-align: center; padding-top: 8px; }
`;

function escapeHtml(input: string): string {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function snapshotHtmlFromData(args: {
  expressPitch: ExpressPitch;
  title?: string;
  generatedAt?: string;
  profileTags?: ProfileTag[];
  quickEvaluation?: unknown;
  competitors?: Competitor[];
  footerSummary?: string;
  poweredByName?: string;
}): string {
  const { expressPitch, title, generatedAt, profileTags, quickEvaluation, competitors, footerSummary, poweredByName } = args;

  const url = String(expressPitch?.url || "").trim();
  const displayUrl = stripProtocol(url);
  const tierLabel = String(expressPitch?.tier_label || "").trim();
  const whyMd = String(expressPitch?.why || "").trim();
  const whyHtml = whyMd ? converter.makeHtml(whyMd) : "";

  const tactics = Array.isArray(expressPitch?.tactics) ? expressPitch.tactics : [];
  const sorted = [...tactics].sort((a, b) => Number(a?.priority) - Number(b?.priority));

  const tacticsRows = sorted
    .map((t, idx) => {
      const priority = Number(t?.priority);
      const tacticTitle = String(t?.tactic || "").trim();
      const contextMd = String(t?.context || "").trim();
      const contextHtml = contextMd ? converter.makeHtml(contextMd) : "";
      return `
        <div class="tacticItem">
          <div class="tacticNum">${Number.isFinite(priority) ? priority : ""}</div>
          <div>
            <div class="tacticTitle">${escapeHtml(tacticTitle)}</div>
            <div class="tacticContext">${contextHtml}</div>
          </div>
        </div>
        <div class="tacticDivider"></div>
      `;
    })
    .join("");

  // The client may pass a title that includes the hostname for the download filename
  // (e.g. "SEO Snapshot Report - example.com"). In the PDF header, we only want the
  // report title; the URL is already shown as the blue link below it.
  const baseTitle = String(title || "SEO Snapshot Report").split(" - ")[0] || "SEO Snapshot Report";
  const docTitle = escapeHtml(baseTitle);
  const generated = escapeHtml(generatedAt || "");

  const tags = Array.isArray(profileTags) ? profileTags : [];
  const tagHtml = tags
    .map((t) => {
      const label = escapeHtml(String((t as any)?.label || "").trim());
      const value = escapeHtml(String((t as any)?.value || "").trim());
      if (!label || !value) return "";
      return `<div class="tag"><span class="tagLabel">${label}</span><span class="tagValue">${value}</span></div>`;
    })
    .filter(Boolean)
    .join("");

  const qe = toQuickEvaluation(quickEvaluation);
  const cms = qe?.techStack?.cms ?? null;
  const cdn = qe?.techStack?.cdnProvider ?? null;
  const hosting = qe?.techStack?.hostingProvider ?? null;
  const registrar = qe?.domain_info?.domainRegistrar ?? null;
  const domainAge = qe?.domain_info?.domainAge ?? null;
  const revenueModel = qe?.businessInfo?.revenueModel ?? null;
  const hasGSC = Boolean(qe?.analytics?.hasGSC);
  const hasGA4 = Boolean(qe?.analytics?.hasGA4);
  const hasGTM = Boolean(qe?.analytics?.hasGTM);
  const pixels = Array.isArray(qe?.analytics?.detectedPixels) ? qe?.analytics?.detectedPixels : [];

  const pageTitle = qe?.meta?.pageTitle ?? null;
  const metaDescription = qe?.meta?.metaDescription ?? null;
  const h1 = Array.isArray(qe?.meta?.h1Tags) ? qe?.meta?.h1Tags?.[0] ?? null : null;
  const schemaTypes = Array.isArray(qe?.meta?.schemaOrgTypes) ? qe?.meta?.schemaOrgTypes : [];
  const schema = schemaTypes.length ? schemaTypes.join(", ") : null;

  const ctas = Array.isArray(qe?.businessInfo?.ctaButtons) ? qe?.businessInfo?.ctaButtons : [];
  const socialLinks = qe?.businessInfo?.socialMediaLinks;
  const socialEntries =
    socialLinks && typeof socialLinks === "object"
      ? Object.entries(socialLinks)
          .map(([k, v]) => [String(k || "").trim(), String(v || "").trim()] as const)
          .filter(([k, v]) => k && v)
      : [];

  const competitorsList = Array.isArray(competitors) ? competitors : [];
  const competitorsHtml = competitorsList
    .map((c, idx) => {
      const website = String((c as any)?.website || "").trim();
      if (!website) return "";
      const display = escapeHtml(stripProtocol(website));
      return `<a class="competitorItem" href="${escapeHtml(website)}"><span class="competitorNum">${idx + 1}</span>${display}</a>`;
    })
    .filter(Boolean)
    .join("");

  const poweredBy = String(poweredByName || "").trim() || "Massic";

  return `
    <div class="container">
      <div class="card">
        <div class="headerRow">
          <div>
            <div class="title">${docTitle}</div>
            ${url ? `<a class="url" href="${escapeHtml(url)}">${escapeHtml(displayUrl || url)}</a>` : ""}
          </div>
          <div class="generated">
            <div class="generatedLabel">GENERATED</div>
            ${generated ? `<div class="generatedDate">${generated}</div>` : ""}
          </div>
        </div>
      </div>

      <div class="spacer"></div>

      <div class="tierCard">
        <div class="tierText">
          <h2>${escapeHtml(tierLabel || "Snapshot Tier")}</h2>
          <div class="why">${whyHtml}</div>
        </div>
      </div>

      <div class="spacer"></div>

      ${tagHtml ? `<div class="strip">${tagHtml}</div><div class="spacer"></div>` : ""}

      ${qe ? `
        <div class="divider"></div>
        <div class="section">
          <div class="sectionTitle">Tech stack</div>
          <div class="techGrid">
            <div class="techCell"><div class="cellLabel">CMS</div><div class="cellValue">${escapeHtml(String(cms || "Not detected"))}</div></div>
            <div class="techCell"><div class="cellLabel">CDN</div><div class="cellValue">${escapeHtml(String(cdn || "Not detected"))}</div></div>
            <div class="techCell"><div class="cellLabel">Hosting</div><div class="cellValue">${escapeHtml(String(hosting || "Not detected"))}</div></div>
            <div class="techCell"><div class="cellLabel">Registrar</div><div class="cellValue">${escapeHtml(String(registrar || "Not detected"))}</div></div>
            <div class="techCell"><div class="cellLabel">Domain age</div><div class="cellValue">${escapeHtml(typeof domainAge === "number" ? `${domainAge % 1 === 0 ? domainAge.toFixed(0) : domainAge.toFixed(1)} years` : "Not detected")}</div></div>
            <div class="techCell"><div class="cellLabel">Revenue model</div><div class="cellValue">${escapeHtml(String(revenueModel || "Not detected"))}</div></div>
          </div>
        </div>

        <div class="divider"></div>
        <div class="section">
          <div class="sectionTitle">Analytics &amp; tracking</div>
          <div class="statusRow">
            <div class="statusItem"><span class="dot ${hasGSC ? "dotGreen" : "dotRed"}"></span>GSC <span class="statusValue">${hasGSC ? "Detected" : "Not detected"}</span></div>
            <div class="statusItem"><span class="dot ${hasGA4 ? "dotGreen" : "dotRed"}"></span>GA4 <span class="statusValue">${hasGA4 ? "Detected" : "Not detected"}</span></div>
            <div class="statusItem"><span class="dot ${hasGTM ? "dotGreen" : "dotRed"}"></span>GTM <span class="statusValue">${hasGTM ? "Detected" : "Not detected"}</span></div>
            <div class="statusItem"><span class="dot dotYellow"></span>Pixels <span class="statusValue">${pixels.length ? String(pixels.length) : "None"}</span></div>
          </div>
        </div>

        <div class="divider"></div>
        <div class="section">
          <div class="sectionTitle">On-page SEO</div>
          <div class="metaBlock"><div class="metaLabel">Page title</div><div class="metaValue">${escapeHtml(String(pageTitle || "")) || `<span class="metaMissing">Missing</span>`}</div></div>
          <div class="metaBlock"><div class="metaLabel">Meta description</div><div class="metaValue">${escapeHtml(String(metaDescription || "")) || `<span class="metaMissing">Missing</span>`}</div></div>
          <div class="metaBlock"><div class="metaLabel">H1</div><div class="metaValue">${escapeHtml(String(h1 || "")) || `<span class="metaMissing">Missing</span>`}</div></div>
          <div class="metaBlock"><div class="metaLabel">Schema</div><div class="metaValue">${schema ? escapeHtml(schema) : `<span class="metaMissing">None detected</span>`}</div></div>
        </div>

        <div class="divider"></div>
        <div class="section">
          <div class="sectionTitle">CTAs detected</div>
          <div class="ctaStrip">
            ${(() => {
              const mapped = ctas
                .map((c) => {
                  if (typeof c === "string") {
                    const t = String(c || "").trim();
                    return t ? { text: t, url: "" } : null;
                  }
                  if (!isNonNullObject(c)) return null;
                  const text = String((c as any).text || "").trim();
                  const url = String((c as any).url || "").trim();
                  if (!text && !url) return null;
                  return { text, url };
                })
                .filter(Boolean) as Array<{ text: string; url: string }>;

              const seen = new Set<string>();
              const pills: string[] = [];
              for (const c of mapped) {
                const label = c.text && c.url ? `${c.text} → ${c.url}` : c.text || c.url;
                const key = label.toLowerCase();
                if (!label || seen.has(key)) continue;
                seen.add(key);
                pills.push(`<div class="ctaTag">${escapeHtml(label)}</div>`);
              }
              return pills.length ? pills.join("") : `<div class="socialTag">No CTAs detected</div>`;
            })()}
          </div>
        </div>

        <div class="divider"></div>
        <div class="section">
          <div class="sectionTitle">Social &amp; presence</div>
          <div class="socialRow">
            ${socialEntries.length ? socialEntries.map(([k, v]) => `<a class="socialTag" href="${escapeHtml(v)}">${escapeHtml(k.charAt(0).toUpperCase() + k.slice(1))}</a>`).join("") : `<div class="socialTag">No social links detected</div>`}
          </div>
        </div>
        <div class="divider"></div>
        <div class="spacer"></div>
      ` : ""}

      ${competitorsHtml ? `
        <div class="card" style="padding: 0;">
          <div style="padding: 14px 18px;">
            <div class="sectionTitle" style="margin-bottom: 0;">Top competitors</div>
          </div>
          <div class="divider"></div>
          <div style="padding: 14px 18px;">
            <div class="competitorList">${competitorsHtml}</div>
          </div>
        </div>
        <div class="spacer"></div>
      ` : ""}

      <div>
        <div class="tacticsHeader">Recommended tactics — priority order</div>
        ${tacticsRows}
      </div>

      ${footerSummary ? `
        <div class="spacer"></div>
        <div class="footer">
          <div class="footerMuted">Powered by ${escapeHtml(poweredBy)}</div>
          <div class="footerMono">${escapeHtml(String(footerSummary || ""))}</div>
        </div>
      ` : ""}
    </div>
  `;
}

function seoSnapshotInitials(value: string): string {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "S";
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return `${first || ""}${second || ""}`.toUpperCase();
}

function formatSeoDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function seoVisibilityBadgeClass(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("not visible")) return "bad";
  if (normalized.includes("missing") || normalized.includes("buried") || normalized.includes("weak")) return "warn";
  if (normalized.includes("strong")) return "ok";
  return "neu";
}

function seoCompactUrl(value: string): string {
  const stripped = stripUrlProtocol(value);
  if (stripped.length <= 68) return stripped;
  return `${stripped.slice(0, 36)}...${stripped.slice(-28)}`;
}

function seoHumanize(value: string): string {
  const cleaned = String(value || "").replace(/_/g, " ").trim();
  if (!cleaned) return "Opportunity";
  return cleaned.replace(/\b\w/g, (m) => m.toUpperCase());
}

function seoSnapshotHtmlFromData(args: {
  report: SeoSnapshotReport;
  poweredByName?: string;
}): string {
  const { report, poweredByName } = args;
  const generatedAt = formatSeoDate(report.generatedAt);
  const meta = [
    stripUrlProtocol(report.website),
    report.location,
    poweredByName ? `Prepared by ${poweredByName}` : "",
  ].filter(Boolean).map(escapeHtml).join(" · ");

  const stats = [
    ["Real searches analyzed", report.analyzedKeywordCount ?? report.customerDemand.length, false],
    ["High-value searches checked", report.retainedKeywordCount ?? report.missedVisibility.length, false],
    ["Missed opportunities found", report.missedVisibility.length, true],
    ["Competitors showing up", report.competitorVisibility.length, false],
  ] as const;

  const findings = report.execSummary.whatWeFound.length
    ? report.execSummary.whatWeFound
    : ["Search demand exists for services this business already offers."];

  const firstSteps = report.opportunityMap.slice(0, 3);

  return `
    <div class="wrap">
      <div class="card">
        <div class="header">
          <div class="brand">
            <div class="logo">${escapeHtml(seoSnapshotInitials(report.businessName))}</div>
            <div>
              <h1>SEO Snapshot - ${escapeHtml(report.businessName || "Business")}</h1>
              ${meta ? `<div class="sub">${meta}</div>` : ""}
            </div>
          </div>
          <div style="text-align:right">
            <div class="kicker">Missed Customer Demand</div>
            ${generatedAt ? `<div class="sub">${escapeHtml(generatedAt)}</div>` : ""}
            <div class="sub">Based on real Google search data</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="secnum">01 · Executive summary</div>
        <h2>${escapeHtml(report.execSummary.execHeadline)}</h2>
        ${report.execSummary.execSubhead ? `<p class="lead">${escapeHtml(report.execSummary.execSubhead)}</p>` : ""}
        <div class="loss">
          <div>
            <span class="lossBadge">Demand you're missing</span>
            ${
              report.execSummary.demandLoss != null
                ? `<div class="big">~${escapeHtml(formatSeoSnapshotNumber(report.execSummary.demandLoss))}<span class="unit"> inquiries / mo</span></div>`
                : `<div class="big" style="font-size:24px">A steady stream of searches every month</div>`
            }
            <p class="sub" style="max-width:420px;margin-top:10px">Estimated new customer inquiries each month from people searching for services this business is not capturing yet.</p>
          </div>
          <div class="assume">A high-level estimate to put the opportunity in perspective, not a precise calculation.</div>
        </div>
        <div class="tiles">
          ${stats.map(([label, value, accent]) => `
            <div class="tile">
              <div class="tileN ${accent ? "accent" : ""}">${escapeHtml(formatSeoSnapshotNumber(value))}</div>
              <div class="tileL">${escapeHtml(label)}</div>
            </div>
          `).join("")}
        </div>
        <div class="twocol">
          <div class="panel">
            <h3>What we found</h3>
            <ul class="clean">${findings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
          <div class="panel">
            <h3>High-impact first steps</h3>
            <ul class="clean">${
              firstSteps.length
                ? firstSteps.map((item) => `<li>${escapeHtml(item.label || seoHumanize(item.assetType))}</li>`).join("")
                : `<li>Prioritized assets will appear here when the report includes them.</li>`
            }</ul>
            ${report.firstStepsCaption ? `<p class="sub" style="margin-top:8px">${escapeHtml(report.firstStepsCaption)}</p>` : ""}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="secnum">02 · Customer demand</div>
        <h2>Here is what potential customers are searching.</h2>
        <p class="lead">${escapeHtml(report.demandIntro)}</p>
        <div class="demand">
          ${report.customerDemand.map((row) => `
            <div class="dq">
              <span>${escapeHtml(row.keyword)}</span>
              <span>${row.searchVolume != null ? `<b>${escapeHtml(formatSeoSnapshotNumber(row.searchVolume))}</b> / mo` : "Demand"}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="section">
        <div class="secnum">03 · Missed visibility</div>
        <h2>High-value searches you are missing.</h2>
        <p class="lead">${escapeHtml(report.missedIntro)}</p>
        <div class="tablewrap"><table>
          <thead><tr><th>Search</th><th>Searches</th><th>Your visibility</th><th>Competitor showing up</th><th>Opportunity</th></tr></thead>
          <tbody>
            ${report.missedVisibility.slice(0, 20).map((row) => `
              <tr>
                <td>${escapeHtml(row.keyword)}</td>
                <td>${row.searchVolume != null ? `${escapeHtml(formatSeoSnapshotNumber(row.searchVolume))}/mo` : ""}</td>
                <td><span class="badge ${seoVisibilityBadgeClass(row.visibility)}">${escapeHtml(row.visibility || "Opportunity")}</span></td>
                <td>${escapeHtml(row.competitorShowingUp || "Competitor advantage")}</td>
                <td>${escapeHtml(row.opportunity || "High-value opportunity")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table></div>
      </div>

      <div class="section">
        <div class="secnum">04 · Competitor visibility</div>
        <h2>These competitors are being found before you.</h2>
        <p class="lead">${escapeHtml(report.competitorIntro)}</p>
        <div class="tablewrap"><table>
          <thead><tr><th>Competitor</th><th>Appears for</th><th>In map pack</th><th>Why they are winning</th></tr></thead>
          <tbody>
            ${report.competitorVisibility.map((row) => `
              <tr>
                <td>${escapeHtml(row.domain)}</td>
                <td>${row.appearancesInTop10 != null ? `${escapeHtml(formatSeoSnapshotNumber(row.appearancesInTop10))} searches` : ""}</td>
                <td><span class="badge ${row.localPackCount && row.localPackCount > 0 ? "ok" : "neu"}">${row.localPackCount && row.localPackCount > 0 ? "Yes" : "No"}</span></td>
                <td>${escapeHtml(row.whyWinning || "Ranks in top results for multiple searches")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table></div>
      </div>

      <div class="section">
        <div class="secnum">05 · Competitor pages</div>
        <h2>Here is what competitors built to capture that demand.</h2>
        <p class="lead">The specific pages doing the work, and the gap on your site for each.</p>
        <div class="tablewrap"><table>
          <thead><tr><th>Competitor page</th><th>Demand signal</th><th>Your gap</th></tr></thead>
          <tbody>
            ${report.competitorPages.slice(0, 12).map((row) => `
              <tr>
                <td class="mono">${escapeHtml(seoCompactUrl(row.pageAddress || row.domain))}</td>
                <td>${row.organicCount != null ? `${escapeHtml(formatSeoSnapshotNumber(row.organicCount))} organic keywords` : row.etv != null ? `${escapeHtml(formatSeoSnapshotNumber(row.etv))} estimated visits` : "Relevant demand"}</td>
                <td><span class="badge ${row.clientGap === true ? "bad" : "warn"}">${row.clientGap === true ? "Client gap" : "Review gap"}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table></div>
      </div>

      <div class="section">
        <div class="secnum">06 · Your opportunity map</div>
        <h2>Here is what we would build first.</h2>
        <p class="lead">${escapeHtml(report.opportunityIntro)}</p>
        <div class="buckets">
          ${report.opportunityMap.map((item, index) => `
            <div class="bucket">
              <h3>${escapeHtml(item.label || seoHumanize(item.assetType))}<span class="tag">${index < 2 ? "Build first" : "Support"}</span></h3>
              <p class="sub">${escapeHtml(seoHumanize(item.assetType))}${item.keywordCount != null ? ` · ${escapeHtml(formatSeoSnapshotNumber(item.keywordCount))} searches mapped` : ""}</p>
              ${item.keywords.length ? `<ul>${item.keywords.slice(0, 5).map((keyword) => `<li>${escapeHtml(keyword)}</li>`).join("")}</ul>` : ""}
            </div>
          `).join("")}
        </div>
      </div>

      <div class="foot">SEO Snapshot · ${escapeHtml(report.businessName || "Business")}${generatedAt ? ` · Generated ${escapeHtml(generatedAt)}` : ""}</div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  let page = null;
  try {
    const {
      markdown,
      title,
      template,
      html,
      performanceReport,
      reportContext,
      expressPitch,
      generatedAt,
      quickEvaluation,
      profileTags,
      competitors,
      footerSummary,
      poweredByName,
      report,
    } =
      await request.json();

    const normalizedTitle = String(title || "Document");
    const isSnapshotTemplate = template === "snapshot" && !!expressPitch;
    const isSeoSnapshotTemplate = template === "seo-snapshot";
    const isPerformanceV2Template = template === "performance-v2";
    const isBillingReconciliationTemplate = template === "billing-reconciliation";

    let bodyHtml = "";
    let css = CSS;

    if (template === "snapshot" && expressPitch) {
      bodyHtml = snapshotHtmlFromData({
        expressPitch: expressPitch as ExpressPitch,
        title: normalizedTitle || "SEO Snapshot Report",
        generatedAt: String(generatedAt || ""),
        quickEvaluation,
        profileTags: Array.isArray(profileTags) ? (profileTags as ProfileTag[]) : undefined,
        competitors: Array.isArray(competitors) ? (competitors as Competitor[]) : undefined,
        footerSummary: String(footerSummary || ""),
        poweredByName: String(poweredByName || ""),
      });
      css = SNAPSHOT_CSS;
    } else if (isSeoSnapshotTemplate) {
      if (!report) {
        return NextResponse.json(
          { error: "report JSON payload is required for template seo-snapshot" },
          { status: 400 }
        );
      }

      bodyHtml = seoSnapshotHtmlFromData({
        report: report as SeoSnapshotReport,
        poweredByName: String(poweredByName || ""),
      });
      css = SEO_SNAPSHOT_CSS;
    } else if (isPerformanceV2Template) {
      const parsed = parsePerformanceReport(
        performanceReport !== undefined && performanceReport !== null ? performanceReport : html
      );

      if (parsed.kind !== "v2") {
        return NextResponse.json(
          { error: "performanceReport JSON payload is required for template performance-v2" },
          { status: 400 }
        );
      }

      const reportDocument = buildPerformanceReportV2Document(
        parsed.raw,
        (reportContext ?? {}) as PerformanceReportV2TemplateContext,
        normalizedTitle || "Performance Report"
      );
      bodyHtml = reportDocument.html;
      css = reportDocument.css;
    } else if (isBillingReconciliationTemplate) {
      if (!report) {
        return NextResponse.json(
          { error: "report JSON payload is required for template billing-reconciliation" },
          { status: 400 }
        );
      }

      bodyHtml = buildBillingReconciliationBodyHtml(report as BillingReconciliationReport);
      css = BILLING_RECONCILIATION_CSS;
    } else if (typeof html === "string" && html.trim()) {
      bodyHtml = html;
      css = CSS;
    } else if (typeof markdown === "string" && markdown.trim()) {
      bodyHtml = converter.makeHtml(markdown);
      css = CSS;
    } else {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${escapeHtml(normalizedTitle || "Document")}</title>
          <style>${css}</style>
        </head>
        <body>
          ${bodyHtml}
        </body>
      </html>
    `;

    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport(PDF_VIEWPORT);
    await page.emulateMediaType("screen");

    await page.setContent(fullHtml, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: isSnapshotTemplate || isSeoSnapshotTemplate || isPerformanceV2Template || isBillingReconciliationTemplate
        ? { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" }
        : { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${normalizedTitle || "document"}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    if (page) await page.close();
  }
}
