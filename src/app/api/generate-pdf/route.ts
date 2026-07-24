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
import type { WebsiteSnapshotReport } from "@/utils/website-snapshot-report";

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
  @page { size: letter; margin: 0; }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1c1f1d;
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
  @page { size: letter; margin: 0; }
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
  @page { size: letter; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #0A0A0A;
    background: #ffffff;
  }
  .pdfCanvas {
    width: 100%;
    margin: 0;
    background: #ffffff;
    padding: 20px;
  }
  .reportHeader {
    width: 100%;
    height: 72px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 1px solid #E5E5E5;
    padding-bottom: 16px;
  }
  .reportTitleBlock { display: flex; align-items: flex-start; gap: 8px; }
  .logoBox {
    width: 56px; height: 56px; border-radius: 8px; background: #D9D9D9;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .titleText { display: flex; flex-direction: column; gap: 8px; }
  h1 {
    color: #000000;
    font-size: 20px;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.4px;
  }
  h2 {
    color: #0A0A0A;
    font-size: 24px;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.48px;
  }
  h3 {
    color: #0A0A0A;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.5;
    letter-spacing: 0.18px;
  }
  .contentStack {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 32px;
    margin-top: 24px;
  }
  .sectionCard {
    width: 100%;
    background: #ffffff;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    break-inside: avoid;
  }
  .eyebrow {
    color: #737373;
    font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    text-transform: uppercase;
  }
  .sectionIntro { display: flex; flex-direction: column; gap: 6px; }
  .sectionLead {
    color: #737373;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.5;
    letter-spacing: 0.18px;
  }
  .overviewTop { display: flex; gap: 12px; width: 100%; }
  .demandCard {
    min-width: 506px;
    height: 166px;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 16px 12px;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    background: #FAFAFA;
  }
  .demandLeft { width: 181px; height: 134px; flex: none; display: flex; flex-direction: column; gap: 12px; }
  .demandLeft.wide { width: 205px; }
  .demandNumberRow { display: flex; align-items: flex-end; gap: 8px; white-space: nowrap; width: 100%; }
  .demandNumber {
    flex: none;
    color: #0A0A0A;
    font-size: 48px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.48px;
  }
  .demandNumber.medium { font-size: 38px; }
  .demandNumber.small { font-size: 34px; }
  .demandUnit {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #737373;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    letter-spacing: 0.18px;
    padding-bottom: 4px;
  }
  .demandText { min-width: 0; flex: 1; height: 134px; display: flex; flex-direction: column; gap: 8px; }
  .demandHeadline {
    color: #DC2626;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.5;
    letter-spacing: 0.18px;
    overflow-wrap: anywhere;
  }
  .demandDisclaimer {
    color: #737373;
    font-size: 10px;
    font-weight: 400;
    line-height: 1.5;
    letter-spacing: 0.15px;
    overflow-wrap: anywhere;
  }
  .metricGrid { min-width: 0; flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .metricTile {
    height: 77px;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    background: #FAFAFA;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .metricLabel { display: flex; align-items: center; gap: 6px; color: #737373; font-size: 12px; font-weight: 500; line-height: 1.5; letter-spacing: 0.18px; }
  .metricLabel svg { width: 16px; height: 16px; flex: none; }
  .metricValue { color: #0A0A0A; font-size: 24px; font-weight: 600; line-height: 1.2; letter-spacing: -0.48px; }
  .metricValue.accent { color: #DC2626; }
  .visibilityMeter { border: 1px solid #E5E5E5; border-radius: 8px; padding: 12px; width: 100%; }
  .visibilityTop { display: flex; align-items: flex-start; justify-content: space-between; }
  .visibilityTitle { display: flex; align-items: center; gap: 12px; color: #737373; font-size: 12px; font-weight: 500; line-height: 1.5; letter-spacing: 0.18px; }
  .visibilityTitle svg { width: 16px; height: 16px; flex: none; }
  .visibilitySub { color: rgba(115,115,115,.6); font-weight: 400; }
  .visibilityScore { display: flex; align-items: center; gap: 2px; color: #737373; font-size: 12px; line-height: 1.5; letter-spacing: 0.18px; }
  .visibilityScore b { color: #2E6A56; font-size: 14px; font-weight: 500; letter-spacing: 0.07px; }
  .visibilityBar { display: flex; width: 100%; height: 23px; margin-top: 8px; border-radius: 300px; overflow: hidden; }
  .seg { height: 100%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 500; line-height: 1.5; letter-spacing: 0.18px; }
  .seg span span { opacity: .6; }
  .segOut { background: #DC2626; }
  .segWeak { background: #F97316; }
  .segVis { background: #16A34A; }
  .summaryGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; }
  .summaryPanel { min-height: 137px; border: 1px solid #E5E5E5; border-radius: 8px; padding: 12px; }
  .panelTitle { display: flex; align-items: center; gap: 6px; color: #737373; font-size: 12px; font-weight: 500; line-height: 1.5; letter-spacing: 0.18px; margin-bottom: 8px; }
  .panelTitle svg { width: 16px; height: 16px; }
  .checkLine { display: flex; gap: 8px; align-items: flex-start; color: #0A0A0A; font-size: 10px; font-weight: 400; line-height: 1.5; letter-spacing: 0.15px; margin-bottom: 8px; }
  .checkLine svg { width: 16px; height: 16px; flex: none; color: #2E6A56; margin-top: 1px; }
  .caption { color: #737373; font-size: 10px; font-weight: 400; line-height: 1.5; letter-spacing: 0.15px; margin-top: 8px; }
  .demandList { width: 100%; display: grid; grid-template-columns: 1fr 1fr; column-gap: 32px; }
  .demandRow { min-height: 57px; border-bottom: 1px solid #E5E5E5; padding: 12px 0; display: flex; flex-direction: column; gap: 6px; }
  .demandRowTop { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .keyword { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0A0A0A; font-size: 12px; font-weight: 500; line-height: 1.5; letter-spacing: 0.18px; }
  .volume { display: flex; align-items: center; gap: 2px; flex: none; color: #737373; font-size: 12px; font-weight: 400; line-height: 1.5; letter-spacing: 0.18px; }
  .volume b { color: #2E6A56; font-size: 14px; font-weight: 500; letter-spacing: 0.07px; }
  .progressTrack { width: 100%; height: 6px; border-radius: 300px; overflow: hidden; background: #E5E5E5; }
  .progressFill { height: 100%; background: linear-gradient(90deg,#2E6A56,#56A48A); }
  .tableWrap { width: 100%; border: 1px solid #E5E5E5; border-radius: 8px; overflow: hidden; background: #fff; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { background: #FAFAFA; color: #737373; font-size: 14px; font-weight: 500; line-height: 1.5; letter-spacing: 0.07px; text-align: left; padding: 7.5px 8px; border-bottom: 1px solid #E5E5E5; }
  td { color: #0A0A0A; font-size: 14px; font-weight: 400; line-height: 1.5; letter-spacing: 0.07px; padding: 10px 8px; border-bottom: 1px solid #E5E5E5; vertical-align: middle; overflow: hidden; }
  tr:last-child td { border-bottom: 0; }
  .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .searchVolumeCell { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
  .searchVolumeText { color: #737373; font-size: 10px; }
  .searchVolumeText b { color: #2E6A56; font-size: 12px; font-weight: 500; }
  .miniTrack { width: 100%; max-width: 210px; height: 6px; border-radius: 300px; background: #E5E5E5; overflow: hidden; }
  .siteCell, .pathCell { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .pathText { min-width: 0; }
  .pathHost { color: #737373; font-size: 10px; font-weight: 500; line-height: 1.5; letter-spacing: 0.15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pathPath { color: #0A0A0A; font-size: 14px; line-height: 1.5; letter-spacing: 0.07px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .keywordBadges { display: flex; flex-wrap: wrap; gap: 8px; }
  .badge {
    min-height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 3px 8px;
    color: #171717;
    background: #F5F5F5;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.5;
    letter-spacing: 0.18px;
    white-space: nowrap;
  }
  .badge svg { width: 12px; height: 12px; flex: none; }
  .badgeMini { font-size: 10px; letter-spacing: 0.15px; }
  .b-outline { background: rgba(0,0,0,.05); border-color: #E5E5E5; color: #737373; }
  .b-blue { background: #DBEAFE; color: #2563EB; }
  .b-red { background: #FFE2E2; border-color: #E5E5E5; color: #DC2626; }
  .b-green { background: #DCFCE7; color: #166534; }
  .b-amber { background: #FFEDD5; color: #C2410C; }
  .b-gray { background: #F5F5F5; color: #171717; }
  .fav { position: relative; display: inline-flex; align-items: center; justify-content: center; flex: none; overflow: hidden; background: #F5F5F5; color: #404040; font-weight: 500; vertical-align: middle; }
  .fav img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .fav.s20 { width: 32px; height: 32px; border-radius: 999px; background: #F5F5F5; font-size: 10px; }
  .fav.s44 { width: 56px; height: 56px; border-radius: 8px; background: #D9D9D9; padding: 8px; font-size: 16px; }
  .fav .mono { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  .foot { padding-top: 24px; text-align: center; color: #737373; font-size: 10px; font-weight: 400; line-height: 1.5; letter-spacing: 0.15px; }
`;

const WEBSITE_SNAPSHOT_CSS = `
  @page { size: letter; margin: 0; }
  :root{
    --ink:#1c1f1d;--muted:#6d726f;--faint:#9aa09c;--line:#e6e8e3;--line2:#f2f2ec;--brand:#123c28;
    --green:#123c28;--greenLine:#2f6b4a;--greenSoft:#e7efe9;--amber:#9c7a2f;--amberSoft:#f5eeda;
    --red:#b0566b;--redSoft:#f6e9ec;--paper:#ffffff;
  }
  *{box-sizing:border-box}
  body{
    margin:0;background:#ffffff;color:var(--ink);
    font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased;
  }
  .wrap{margin:0;padding:20px}
  h1,h2,h3{margin:0;line-height:1.25}
  p{margin:0}
  a{color:var(--brand)}
  .num{font-variant-numeric:tabular-nums}
  
  /* Page Card */
  .page-card{
    background:var(--paper);
    padding:40px 0;
    margin-bottom:28px;
    break-inside:avoid;
    page-break-inside:avoid;
  }
  
  /* Cover */
  .cover-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:32px;padding:0}
  .cover-label{font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:500;letter-spacing:0.16em;color:var(--green)}
  .cover-date{font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:0.14em;text-transform:uppercase;color:var(--faint);margin-top:4px}
  .cover-meta{text-align:right;font:11.5px/1.6 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:var(--muted)}
  .divider-thick{border:0;border-top:2px solid var(--green);margin:32px 0;width:100%}
  .divider-thin{border:0;border-top:1px solid var(--line);margin:32px 0;width:100%}
  .page-title{font-size:34px;font-weight:700;letter-spacing:-0.01em;line-height:1.2;color:var(--ink);padding:0}
  .business-desc{color:var(--muted);font-size:15px;margin-top:16px;line-height:1.5;padding:0}
  
  /* Hero */
  .eyebrow{font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:var(--faint);margin-bottom:20px;padding:0}
  .hero-number{font-size:120px;font-weight:700;letter-spacing:-0.02em;line-height:0.85;color:var(--green);margin:20px 0;padding:0}
  .hero-label{font-size:21px;font-weight:600;letter-spacing:-0.01em;line-height:1.2;color:var(--ink);max-width:46ch;margin-bottom:16px;padding:0}
  .hero-desc{font-size:15px;line-height:1.5;color:var(--muted);padding:0}
  
  /* Callouts */
  .callouts-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 44px;margin-top:32px;padding:0}
  .callout-item{padding:20px 0;border-top:1px solid var(--line)}
  .callout-title{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;line-height:1.3;color:var(--ink);margin-bottom:10px}
  .callout-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .callout-body{font-size:14px;line-height:1.5;color:var(--muted)}
  
  /* Section Headers */
  .section-title{font-size:23px;font-weight:600;letter-spacing:-0.01em;line-height:1.2;color:var(--ink);margin-bottom:12px;padding:0}
  .section-lead{font-size:14.5px;line-height:1.4;color:var(--muted);max-width:60ch;padding:0}
  
  /* Tier Cards */
  .tier-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:32px;padding:0}
  .tier-card{border:1px solid var(--line);border-radius:4px;padding:18px;position:relative;background:var(--paper)}
  .tier-selected{border-color:var(--green);background:#fbfdfb}
  .tier-badge{position:absolute;top:14px;right:14px;font:9.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:0.06em;padding:4px 8px;border-radius:2px;background:var(--green);color:var(--paper)}
  .tier-num{font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:0.06em;text-transform:uppercase;color:var(--faint)}
  .tier-name{font-size:15px;font-weight:600;color:var(--ink);margin:10px 0}
  .tier-desc{font-size:12.5px;line-height:1.5;color:var(--muted)}
  
  /* Goal Box */
  .goal-box{margin:28px 0 0;border-left:3px solid var(--green);padding:22px;background:var(--greenSoft)}
  .goal-label{font:10.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:0.06em;text-transform:uppercase;color:var(--greenLine);margin-bottom:10px}
  .goal-body{font-size:14px;line-height:1.4;color:var(--ink);margin-bottom:12px}
  .goal-funnel{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12.5px}
  .funnel-step{border:1px solid var(--line);border-radius:4px;padding:6px 12px;background:var(--paper);color:var(--ink)}
  .funnel-arrow{color:var(--faint)}
  .funnel-end{border-radius:4px;padding:6px 12px;background:var(--green);color:var(--paper);font-weight:600}
  
  /* Stats Grid */
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:28px;padding:0}
  .stat-item{padding:0 20px;border-left:1px solid var(--line)}
  .stat-item:first-child{padding-left:0;border-left:0}
  .stat-label{font:10.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:0.06em;text-transform:uppercase;color:var(--faint);margin-bottom:8px}
  .stat-value{font-size:34px;font-weight:700;letter-spacing:-0.01em;line-height:1;color:var(--ink)}
  .stat-green{color:var(--green)}
  .stat-caption{font-size:12px;color:var(--muted);margin-top:8px}
  
  /* Chart */
  .chart-section{margin-top:32px;padding:0}
  .chart-caption{font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:0.02em;text-transform:uppercase;color:var(--faint);font-weight:600;margin-bottom:8px}
  
  /* Brand & Intent Mix */
  .brand-intent-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:28px;padding:0}
  .mix-title{font-size:14px;font-weight:600;color:var(--ink);margin-bottom:12px}
  .brand-bar,.intent-bar{display:flex;height:40px;border-radius:4px;overflow:hidden}
  .brand-segment,.intent-segment{display:flex;align-items:center;justify-content:center;color:var(--paper);font-size:12px;font-weight:600}
  .brand-branded{background:#123c28}
  .brand-nonbranded{background:#7a9d8a}
  .intent-trans{background:#123c28}
  .intent-comm{background:#4a7c59}
  .intent-info{background:#7a8c7e}
  .intent-nav{background:#9aa8a0}
  
  /* You Win vs Missing */
  .win-missing-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:32px;padding:0}
  .win-missing-title{font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;margin-bottom:16px}
  .win-title{color:var(--green)}
  .missing-title{color:var(--red)}
  .win-group{margin-bottom:20px}
  .win-group-title{font-size:14px;font-weight:600;color:var(--ink);margin-bottom:8px}
  .win-examples{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
  .win-example{background:#fbfbf9;color:var(--muted);padding:4px 8px;border-radius:4px;font-size:11px;border:1px solid var(--line);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
  .win-blurb{color:var(--muted);font-size:13.5px;line-height:1.5}
  
  /* PDF pagination rules:
     Keep "Heading + subheading + content block" together without forcing the
     entire section to be unbreakable (which can cause awkward whitespace). */
  .keep{break-inside:avoid;page-break-inside:avoid}
  .sec-h{break-after:avoid;page-break-after:avoid}
  .lead{break-after:avoid;page-break-after:avoid}
  /* Keep repeated “cards” together (fixes orphaned subheadings). */
  .read,.wh-page,.c,.ex,.issue,.rung,.step,table,tr{
    break-inside:avoid;
    page-break-inside:avoid;
  }
  .sec-h{display:flex;align-items:baseline;gap:12px;border-top:1px solid var(--line);padding-top:22px;margin-bottom:18px}
  .sec-h h2{font-size:22px;font-weight:800;letter-spacing:-.01em}
  .lead{color:var(--muted);font-size:15px;margin:-6px 0 20px}
  .reads{display:grid;grid-template-columns:1fr 1fr;gap:26px 34px}
  .read .dot{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:8px;vertical-align:middle}
  .read h3{font-size:16.5px;font-weight:700;display:flex;align-items:center}
  .read p{color:var(--muted);font-size:14px;margin-top:5px}
  .d-red{background:var(--red)} .d-amber{background:var(--amber)} .d-green{background:var(--green)}
  .tier-k{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--green);font-weight:700}
  .tier h3{font-size:19px;font-weight:800;margin:10px 0 8px;letter-spacing:-.01em}
  .tier p{color:var(--muted);font-size:15px}
  .goal{border-left:3px solid var(--brand);padding:2px 0 2px 20px}
  .goal .k{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);font-weight:700}
  .goal p{font-size:16px;margin-top:8px}
  .funnel{margin-top:12px;color:var(--muted);font-size:14px}
  .funnel b{color:var(--ink);font-weight:600} .funnel .win{color:var(--green);font-weight:700}
  .funnel .sep{color:var(--faint);margin:0 8px}
  .stats{display:flex;gap:40px;flex-wrap:wrap}
  .stat .v{font-size:28px;font-weight:800;letter-spacing:-.02em}
  .stat .v.good{color:var(--green)}
  .stat .l{color:var(--muted);font-size:13.5px}
  .after{color:var(--muted);font-size:14.5px;margin-top:16px}
  .chartcap{color:var(--faint);font-size:13px;margin:26px 0 6px;font-weight:600;letter-spacing:.02em;text-transform:uppercase}
  .kw{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:26px}
  .kw .h{font-size:12px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;margin-bottom:8px}
  .kw .h.win{color:var(--green)} .kw .h.miss{color:var(--amber)}
  .kw ul{list-style:none;padding:0;margin:0}
  .kw li{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:14px}
  .kw li:last-child{border-bottom:none} .kw .term{font-weight:600}
  .wh-page{padding:13px 0;border-bottom:1px solid var(--line)} .wh-page:last-child{border-bottom:none}
  .wh-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
  .wh-url{font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;color:var(--brand)}
  .wh-etv{font-size:13px;font-weight:700;color:var(--green);white-space:nowrap}
  .wh-terms{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap}
  .wh-tag{font-size:12px;background:var(--line2);color:var(--muted);padding:2px 8px;border-radius:20px}
  .comp{margin-top:6px}
  .comp .c{padding:20px 0;border-bottom:1px solid var(--line)} .comp .c:last-child{border-bottom:none}
  .comp .crow{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
  .comp .dom{font-weight:800;font-size:16px}
  .comp .nums{color:var(--faint);font-size:13px;font-variant-numeric:tabular-nums}
  .comp .subdom{color:var(--faint);font-size:12.5px;margin-top:2px}
  .comp p{color:var(--muted);font-size:14.5px;margin-top:6px}
  .comp .ex{margin-top:10px;padding-left:14px;border-left:2px solid var(--brand)}
  .comp .u{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;color:var(--brand);word-break:break-all}
  .comp .why{color:var(--muted);font-size:13.5px;margin-top:3px}
  .throughline{margin-top:20px;font-size:15px;color:var(--muted)}
  table{width:100%;border-collapse:collapse;font-size:14.5px}
  td,th{text-align:left;padding:11px 0;border-bottom:1px solid var(--line);vertical-align:top}
  th{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);font-weight:700}
  td.k{font-weight:700;white-space:nowrap;padding-right:20px} td.mean{color:var(--muted)}
  tr:last-child td{border-bottom:none}
  .pills{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}
  .pill{font-size:11.5px;padding:2px 9px;border-radius:20px;border:1px solid;color:var(--faint)}
  .pill.good{border-color:var(--green);color:var(--green)}
  .pill.none{border-color:var(--red);color:var(--red)}
  .issue{padding:15px 0;border-bottom:1px solid var(--line)} .issue:last-child{border-bottom:none}
  .issue h3{font-size:15.5px;font-weight:700}
  .issue .sev{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;margin-right:10px}
  .sev.high,.sev.High,.sev.crit{color:var(--red)} .sev.med,.sev.Medium{color:var(--amber)} .sev.low,.sev.Low{color:var(--faint)}
  .issue p{color:var(--muted);font-size:14px;margin-top:5px}
  .ladder{margin-top:4px}
  .rung{display:grid;grid-template-columns:24px 1fr;gap:16px;align-items:baseline;padding:15px 0;border-bottom:1px solid var(--line)}
  .rung:last-child{border-bottom:none}
  .rung .rn{color:var(--faint);font-weight:700;font-size:14px;font-variant-numeric:tabular-nums}
  .rung .body h3{font-size:15.5px;font-weight:700}
  .rung .body p{color:var(--muted);font-size:14px;margin-top:3px}
  .badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 8px;border-radius:20px;margin:3px 0 4px}
  .badge.in_place{background:#f0faf4;color:var(--green)}
  .badge.partly{background:#fdf8ef;color:var(--amber)}
  .badge.needs_work{background:#fff7ed;color:var(--amber)}
  .badge.missing{background:#fef2f2;color:var(--red)}
  .plan{margin-top:4px}
  .step{display:grid;grid-template-columns:26px 1fr;gap:16px;padding:15px 0;border-bottom:1px solid var(--line)}
  .step:last-child{border-bottom:none}
  .step .sn{color:var(--brand);font-weight:800;font-variant-numeric:tabular-nums}
  .step h3{font-size:15.5px;font-weight:700}
  .step p{color:var(--muted);font-size:14px;margin-top:4px}
  .takeaway{border-left:3px solid var(--brand);padding:4px 0 4px 20px;margin-top:8px}
  .takeaway .k{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);font-weight:700}
  .takeaway p{font-size:16px;margin-top:8px}
  .foot{margin-top:56px;border-top:1px solid var(--line);padding:22px 56px 0;color:var(--faint);font-size:12.5px;text-align:center}
  @media(max-width:620px){
    .reads,.kw{grid-template-columns:1fr;gap:20px}
    .wrap{padding:40px 20px 56px}
    h1{font-size:27px}
    .stats{gap:26px}
  }
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

function siteNameFromHost(host: string): string {
  const cleaned = String(host || "").trim().toLowerCase().replace(/^www\./, "");
  if (!cleaned) return "";
  const parts = cleaned.split(".").filter(Boolean);
  const sld = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || cleaned;
  const tokens = sld.split(/[-_]+/g).filter(Boolean);
  if (tokens.length === 2 && tokens[0] === "life" && tokens[1] === "time") return "Lifetime";
  return tokens
    .map((t) => {
      if (!t) return "";
      if (t.length <= 4 && /^[a-z0-9]+$/.test(t)) return t.toUpperCase();
      return t.charAt(0).toUpperCase() + t.slice(1);
    })
    .filter(Boolean)
    .join("");
}

function formatMonthYearFromIso(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(dt);
}

function formatDayMonthYearFromIso(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(dt);
}

function formatVolumeShort(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m.toFixed(m % 1 === 0 ? 0 : 1)}M`;
  }
  if (n >= 10_000) {
    const k = n / 1000;
    return `${k.toFixed(k % 1 === 0 ? 0 : 1)}K`;
  }
  return Math.round(n).toLocaleString();
}

function websiteSnapshotToneDot(tone: unknown): string {
  const key = String(tone || "").trim().toLowerCase();
  if (key === "green") return "d-green";
  if (key === "amber") return "d-amber";
  if (key === "red") return "d-red";
  return "d-amber";
}

function websiteSnapshotStatusClass(status: unknown): string {
  const key = String(status || "").trim().toLowerCase();
  if (key === "in_place") return "in_place";
  if (key === "partly") return "partly";
  if (key === "missing") return "missing";
  if (key === "needs_work") return "needs_work";
  return "partly";
}

function websiteSnapshotStatusLabel(status: unknown): string {
  const key = String(status || "").trim().toLowerCase();
  if (key === "in_place") return "In place";
  if (key === "partly") return "Partly done";
  if (key === "missing") return "Missing";
  if (key === "needs_work") return "Needs work";
  return String(status || "Status") || "Status";
}

function websiteSnapshotTrendChart(points: any[]): string {
  const rows = Array.isArray(points)
    ? points
        .map((p) => ({
          year: Number(p?.year),
          month: Number(p?.month),
          etv: Number(p?.etv),
        }))
        .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.month) && Number.isFinite(p.etv))
    : [];
  if (rows.length < 2) return "";

  const width = 680;
  const height = 200;
  const padL = 50;
  const padR = 18;
  const padT = 20;
  const padB = 36;

  const max = Math.max(...rows.map((r) => r.etv), 0);
  const top = Math.max(1, max);

  const y0 = height - padB;
  const y1 = padT;
  const x = (i: number) => {
    const span = (width - padL - padR) / (rows.length - 1);
    return padL + span * i;
  };
  const y = (v: number) => {
    const t = Math.max(0, Math.min(1, v / top));
    return y0 - t * (y0 - y1);
  };

  const ticks = [0, Math.round(top / 2), Math.round(top)];
  const polyPoints = rows.map((r, i) => `${x(i)},${y(r.etv)}`).join(" ");
  const monthLabel = (p: { year: number; month: number }) => {
    try {
      return new Intl.DateTimeFormat("en-US", { month: "short" }).format(
        new Date(p.year, Math.max(0, (p.month || 1) - 1), 1)
      );
    } catch {
      return String(p.month || "");
    }
  };
  const fmtTick = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    return String(n);
  };

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Monthly organic traffic trend">
      <g font-size="11" fill="#6d726f">
        ${ticks
          .map((t) => {
            const yy = y(t);
            return `
              <line x1="${padL}" y1="${yy}" x2="${width - padR}" y2="${yy}" stroke="#e6e8e3"></line>
              <text x="${padL - 6}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#6d726f">${escapeHtml(
                fmtTick(t)
              )}</text>
            `;
          })
          .join("")}
      </g>
      <polyline fill="none" stroke="#123c28" stroke-width="2.5" points="${escapeHtml(polyPoints)}"></polyline>
      <g fill="#123c28">
        ${rows
          .map((r, i) => `<circle cx="${x(i)}" cy="${y(r.etv)}" r="3.5" fill="#123c28"></circle>`)
          .join("")}
      </g>
      <g font-size="12" fill="#9aa09c" text-anchor="middle">
        ${rows
          .map(
            (r, i) =>
              `<text x="${x(i)}" y="${height - 8}" text-anchor="middle" font-size="12" fill="#9aa09c">${escapeHtml(
                monthLabel(r)
              )}</text>`
          )
          .join("")}
      </g>
    </svg>
  `;
}

function websiteSnapshotHtmlFromReport(report: WebsiteSnapshotReport): string {
  const meta: any = (report as any)?.meta || {};
  const businessName = String(meta.business_name || "").trim() || "Business";
  const businessDescription = String(meta.business_description || "").trim();
  const website = String(meta.url || "").trim();
  const location = String(meta.location || "").trim();
  const phone = meta.phone != null ? (() => {
    try {
      return decodeURIComponent(String(meta.phone || "").trim());
    } catch {
      return String(meta.phone || "").trim();
    }
  })() : "";
  const reportMonthYear = formatMonthYearFromIso(meta.report_date) || "Website Snapshot";

  const callouts = Array.isArray((report as any)?.overview_callouts) ? (report as any).overview_callouts : [];
  const tier: any = (report as any)?.tier || {};
  const hero: any = (report as any)?.hero || {};
  const goal: any = (report as any)?.goal || {};
  const diagnosis = String((report as any)?.diagnosis || "").trim();
  const goalBody = String(goal.body ?? goal.goal_body ?? "").trim();
  const funnelSteps: string[] = Array.isArray(goal.funnel_steps)
    ? goal.funnel_steps.map((s: any) => String(s || "").trim()).filter(Boolean).slice(0, 3)
    : [];
  const funnelEnd = String(goal.funnel_end || "").trim();

  const search: any = (report as any)?.search || {};
  const competitorBuckets: any = (report as any)?.competitor_buckets || {};
  const competitorsIntro = String((report as any)?.competitors_intro || "").trim();
  const competitorsThroughline = String((report as any)?.competitors_throughline || "").trim();
  const competitors = Array.isArray((report as any)?.competitors) ? (report as any).competitors : [];

  const under: any = (report as any)?.under_the_hood || {};
  const issues = Array.isArray((report as any)?.issues) ? (report as any).issues : [];
  const ladderIntro = String((report as any)?.ladder_intro || "").trim();
  const ladderSummary = String((report as any)?.ladder_summary || "").trim();
  const ladder = Array.isArray((report as any)?.ladder) ? (report as any).ladder : [];
  const tactics = Array.isArray((report as any)?.tactics) ? (report as any).tactics : [];
  const takeaway = String((report as any)?.takeaway || "").trim();

  const monthYearTop = formatMonthYearFromIso(meta.report_date) || reportMonthYear;
  const metaParts = [website, location].filter(Boolean);
  const metaHtml = `
    <p class="meta">
      ${metaParts.map((p) => escapeHtml(p)).join(" &nbsp;·&nbsp; ")}
      ${
        phone
          ? ` &nbsp;·&nbsp; <a href="tel:${escapeHtml(phone)}" style="color:inherit;text-decoration:none">${escapeHtml(
              phone
            )}</a>`
          : ""
      }
    </p>
  `.trim();

  const calloutsHtml = callouts.length
    ? `
      <div class="callouts-grid">
        ${callouts
          .slice(0, 4)
          .map((c: any) => {
            const tone = String(c?.tone || "").trim().toLowerCase();
            const dotColor = tone === "green" ? "var(--green)" : tone === "amber" ? "var(--amber)" : tone === "red" ? "var(--red)" : "var(--faint)";
            const title = String(c?.title || "").trim();
            const body = String(c?.body || "").trim();
            if (!title && !body) return "";
            return `<div class="callout-item">
              <div class="callout-title">
                <span class="callout-dot" style="background:${dotColor}"></span>${escapeHtml(title || "Callout")}
              </div>
              ${body ? `<div class="callout-body">${escapeHtml(body)}</div>` : ""}
            </div>`;
          })
          .filter(Boolean)
          .join("")}
      </div>
    `
    : "";

  const heroDisplay = String(hero?.display || "").trim();
  const heroLabel = String(hero?.label || "").trim();
  const heroDescription = String(hero?.description || "").trim();
  const heroHtml = heroDisplay || heroLabel || heroDescription ? `
    <section>
      <div class="keep">
        <div class="hero-section">
          ${heroDisplay ? `<div class="hero-value">${escapeHtml(heroDisplay)}</div>` : ""}
          ${heroLabel ? `<div class="hero-label">${escapeHtml(heroLabel)}</div>` : ""}
          ${heroDescription ? `<p class="hero-description">${escapeHtml(heroDescription)}</p>` : ""}
        </div>
      </div>
    </section>
  ` : "";

  const tierLabel = String(tier?.name || tier?.label || "").trim();
  const tierReason = String(tier?.reasoning || "").trim();
  const tierLevel = tier?.level != null ? Number(tier.level) : null;
  const tierHtml =
    tierLabel || tierReason
      ? `
      <section>
        <div class="keep">
          <div class="sec-h"><h2>What SEO can do for you</h2></div>
          <div class="tier">
            ${tierLabel ? `<span class="tier-k">${escapeHtml(tierLabel)}</span>` : ""}
            ${tierReason ? `<p>${escapeHtml(tierReason)}</p>` : ""}
            ${String(tier?.tier_caveat || "").trim() ? `<p class="lead" style="margin-top:10px">${escapeHtml(String(tier.tier_caveat))}</p>` : ""}
          </div>
        </div>
      </section>
    `
      : "";

  const goalHtml =
    goalBody
      ? `
      <div class="goal-box">
        <div class="goal-label">Your goal, read from your own site</div>
        <p class="goal-body">${escapeHtml(goalBody)}</p>
        ${
          funnelSteps.length || funnelEnd
            ? `<div class="goal-funnel">
              ${funnelSteps.map((step, i) => `
                <div class="funnel-step">${escapeHtml(step)}</div>
                ${i < funnelSteps.length - 1 || funnelEnd ? `<span class="funnel-arrow">›</span>` : ""}
              `).join("")}
              ${funnelEnd ? `<div class="funnel-end">${escapeHtml(funnelEnd)}</div>` : ""}
            </div>`
            : ""
        }
      </div>
    `
      : "";

  const brandShare = search.brand_share != null ? Number(search.brand_share) : null;
  const brandedPercent = brandShare != null ? Math.round(brandShare * 100) : null;
  const nonBrandedPercent = brandedPercent != null ? (100 - brandedPercent) : null;

  const intentMix: any = (report as any)?.intent_mix || {};
  const transactional = intentMix.transactional != null ? Math.round(Number(intentMix.transactional) * 100) : 0;
  const commercial = intentMix.commercial != null ? Math.round(Number(intentMix.commercial) * 100) : 0;
  const informational = intentMix.informational != null ? Math.round(Number(intentMix.informational) * 100) : 0;
  const navigational = intentMix.navigational != null ? Math.round(Number(intentMix.navigational) * 100) : 0;

  const trendPctChange = search.trend?.pct_change ? `, ${search.trend.direction === "growing" ? "up" : search.trend.direction === "declining" ? "down" : ""} ${Math.abs(search.trend.pct_change).toFixed(1)}%` : "";
  
  const statsHtml = `
    <div class="page-card">
      <div class="eyebrow">Where you stand in search today</div>
      <h2 class="section-title">Real organic search data, from the U.S. Google index.</h2>
      <p class="section-lead">Organic positions only · six months of available history · ${escapeHtml(formatMonthYearFromIso(meta.report_date) || "2026")}.</p>
      
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Keywords</div>
          <div class="stat-value">${search.keywords_count != null ? escapeHtml(String(search.keywords_count)) : "0"}</div>
          <div class="stat-caption">terms ranked</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Traffic</div>
          <div class="stat-value stat-green">~${search.etv != null ? escapeHtml(Math.round(Number(search.etv)).toLocaleString()) : "0"}</div>
          <div class="stat-caption">visits a month${trendPctChange}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Top 10</div>
          <div class="stat-value">${search.top10 != null ? escapeHtml(String(search.top10)) : "0"}</div>
          <div class="stat-caption">in Google's top 10</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Authority</div>
          <div class="stat-value">${search.referring_domains != null ? escapeHtml(String(search.referring_domains)) : "0"}</div>
          <div class="stat-caption">sites linking to you</div>
        </div>
      </div>
      
      ${
        Array.isArray(search?.trend?.points) && search.trend.points.length
          ? `<div class="chart-section">
               <div class="chart-caption">Monthly organic traffic, ${escapeHtml(String(search?.trend?.window || "").trim() || "available history")}</div>
               ${websiteSnapshotTrendChart(search.trend.points)}
             </div>`
          : ""
      }
      
      ${
        brandedPercent != null && nonBrandedPercent != null
          ? `<div class="brand-intent-grid">
              <div>
                <h3 class="mix-title">Brand vs Non-brand</h3>
                <div class="brand-bar">
                  <div class="brand-segment brand-branded" style="flex:${brandedPercent}">${brandedPercent}%</div>
                  <div class="brand-segment brand-nonbranded" style="flex:${nonBrandedPercent}">${nonBrandedPercent}%</div>
                </div>
                <div style="display:flex;gap:16px;margin-top:12px;font-size:11px;color:var(--muted)">
                  <div style="display:flex;align-items:center;gap:6px">
                    <div style="width:8px;height:8px;border-radius:50%;background:#123c28"></div>
                    <span>Branded: ${brandedPercent}%</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px">
                    <div style="width:8px;height:8px;border-radius:50%;background:#7a9d8a"></div>
                    <span>Non-brand: ${nonBrandedPercent}%</span>
                  </div>
                </div>
              </div>
              ${
                transactional + commercial + informational + navigational > 0
                  ? `<div>
                      <h3 class="mix-title">Search Intent Mix</h3>
                      <div class="intent-bar">
                        ${transactional > 0 ? `<div class="intent-segment intent-trans" style="flex:${transactional}">${transactional}%</div>` : ""}
                        ${commercial > 0 ? `<div class="intent-segment intent-comm" style="flex:${commercial}">${commercial}%</div>` : ""}
                        ${informational > 0 ? `<div class="intent-segment intent-info" style="flex:${informational}">${informational}%</div>` : ""}
                        ${navigational > 0 ? `<div class="intent-segment intent-nav" style="flex:${navigational}">${navigational}%</div>` : ""}
                      </div>
                      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;font-size:11px;color:var(--muted)">
                        ${transactional > 0 ? `<div style="display:flex;align-items:center;gap:6px">
                          <div style="width:8px;height:8px;border-radius:50%;background:#123c28"></div>
                          <span>Transactional: ${transactional}%</span>
                        </div>` : ""}
                        ${commercial > 0 ? `<div style="display:flex;align-items:center;gap:6px">
                          <div style="width:8px;height:8px;border-radius:50%;background:#4a7c59"></div>
                          <span>Commercial: ${commercial}%</span>
                        </div>` : ""}
                        ${informational > 0 ? `<div style="display:flex;align-items:center;gap:6px">
                          <div style="width:8px;height:8px;border-radius:50%;background:#7a8c7e"></div>
                          <span>Informational: ${informational}%</span>
                        </div>` : ""}
                        ${navigational > 0 ? `<div style="display:flex;align-items:center;gap:6px">
                          <div style="width:8px;height:8px;border-radius:50%;background:#9aa8a0"></div>
                          <span>Nav: ${navigational}%</span>
                        </div>` : ""}
                      </div>
                    </div>`
                  : ""
              }
            </div>`
          : ""
      }
      
      ${
        (Array.isArray(search?.you_win) && search.you_win.length > 0) || 
        (Array.isArray(search?.buyers_elsewhere) && search.buyers_elsewhere.length > 0)
          ? `<hr class="divider-thin" />
            <div class="win-missing-grid">
              ${Array.isArray(search?.you_win) && search.you_win.length > 0
                ? `<div>
                    <div class="win-missing-title win-title">▲ You win</div>
                    ${search.you_win.map((group: any) => {
                      const cluster = String(group?.cluster || "").trim();
                      const examples = Array.isArray(group?.examples) ? group.examples : [];
                      const blurb = String(group?.blurb || "").trim();
                      return `<div class="win-group">
                        ${cluster ? `<div class="win-group-title">${escapeHtml(cluster)}</div>` : ""}
                        ${examples.length > 0 
                          ? `<div class="win-examples">
                              ${examples.map((ex: any) => `<span class="win-example">${escapeHtml(String(ex || "").trim())}</span>`).join("")}
                            </div>`
                          : ""
                        }
                        ${blurb ? `<div class="win-blurb">${escapeHtml(blurb)}</div>` : ""}
                      </div>`;
                    }).join("")}
                  </div>`
                : ""
              }
              ${Array.isArray(search?.buyers_elsewhere) && search.buyers_elsewhere.length > 0
                ? `<div>
                    <div class="win-missing-title missing-title">▼ What you're missing</div>
                    ${search.buyers_elsewhere.map((group: any) => {
                      const cluster = String(group?.cluster || "").trim();
                      const examples = Array.isArray(group?.examples) ? group.examples : [];
                      const blurb = String(group?.blurb || "").trim();
                      return `<div class="win-group">
                        ${cluster ? `<div class="win-group-title">${escapeHtml(cluster)}</div>` : ""}
                        ${examples.length > 0 
                          ? `<div class="win-examples">
                              ${examples.map((ex: any) => `<span class="win-example">${escapeHtml(String(ex || "").trim())}</span>`).join("")}
                            </div>`
                          : ""
                        }
                        ${blurb ? `<div class="win-blurb">${escapeHtml(blurb)}</div>` : ""}
                      </div>`;
                    }).join("")}
                  </div>`
                : ""
              }
            </div>`
          : ""
      }
    </div>
  `.trim();

  const showsUp = competitorBuckets?.shows_up || {};
  const shouldBe = Array.isArray(competitorBuckets?.should_be) ? competitorBuckets.should_be : [];
  const gap = String(competitorBuckets?.gap || "").trim();
  const directCompetitors = Array.isArray(showsUp?.direct_competitors) ? showsUp.direct_competitors : [];
  const directNote = String(showsUp?.direct_note || "").trim();
  const similarElsewhere = Array.isArray(showsUp?.similar_elsewhere) ? showsUp.similar_elsewhere : [];
  const similarElsewhereNote = String(showsUp?.similar_elsewhere_note || "").trim();
  const noise = Array.isArray(showsUp?.noise) ? showsUp.noise : [];
  const noiseNote = String(showsUp?.noise_note || "").trim();

  const competitorsHtml = directCompetitors.length || similarElsewhere.length || shouldBe.length || noise.length
    ? `
      <div class="page-card">
        <div class="eyebrow">Who shows up in your market</div>
        ${
          directCompetitors.length
            ? `<div class="keep" style="margin-top:20px;padding:0">
                <h3 style="font-size:16px;font-weight:600;margin-bottom:12px">Direct Competitors</h3>
                ${directNote ? `<p style="color:#6d726f;margin-bottom:12px;font-size:14px">${escapeHtml(directNote)}</p>` : ""}
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
                  ${directCompetitors.map((c: any) => {
                    const domain = String(c?.domain || "").trim();
                    return domain ? `<span style="background:#fbfbf9;color:#1c1f1d;padding:6px 12px;border-radius:4px;font-size:13px;border:1px solid #e6e8e3">${escapeHtml(domain)}</span>` : "";
                  }).filter(Boolean).join("")}
                </div>
                ${directCompetitors.slice(0, 3).map((c: any) => {
                  const domain = String(c?.domain || "").trim();
                  if (!domain) return "";
                  const whyOutranks = String(c?.why_outranks || "").trim();
                  return `<div style="margin-bottom:16px;padding:16px;background:#fbfbf9;border-radius:4px;border:1px solid #e6e8e3">
                    <div style="font-weight:600;font-size:14px;margin-bottom:6px">${escapeHtml(domain)}</div>
                    ${whyOutranks ? `<p style="color:#6d726f;font-size:13px">${escapeHtml(whyOutranks)}</p>` : ""}
                  </div>`;
                }).filter(Boolean).join("")}
              </div>`
            : ""
        }
        ${
          similarElsewhere.length
            ? `<div class="keep" style="margin-top:20px;padding:0">
                <h3 style="font-size:16px;font-weight:600;margin-bottom:12px">Direct Rivals</h3>
                ${similarElsewhereNote ? `<p style="color:#6d726f;margin-bottom:12px;font-size:14px">${escapeHtml(similarElsewhereNote)}</p>` : ""}
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                  ${similarElsewhere.map((item: any) => {
                    const domain = String(item?.domain || "").trim();
                    return domain ? `<span style="background:#fbfbf9;color:#1c1f1d;padding:6px 12px;border-radius:4px;font-size:13px;border:1px solid #e6e8e3">${escapeHtml(domain)}</span>` : "";
                  }).filter(Boolean).join("")}
                </div>
              </div>`
            : ""
        }
        ${
          noise.length
            ? `<div class="keep" style="margin-top:20px;padding:0">
                <h3 style="font-size:16px;font-weight:600;margin-bottom:12px">Noise</h3>
                ${noiseNote ? `<p style="color:#6d726f;margin-bottom:12px;font-size:14px">${escapeHtml(noiseNote)}</p>` : ""}
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                  ${noise.slice(0, 6).map((domain: any) => {
                    const d = String(domain || "").trim();
                    return d ? `<span style="background:#fbfbf9;color:#1c1f1d;padding:6px 12px;border-radius:4px;font-size:13px;border:1px solid #e6e8e3">${escapeHtml(d)}</span>` : "";
                  }).filter(Boolean).join("")}
                  ${noise.length > 6 ? `<span style="background:#fbfbf9;color:#1c1f1d;padding:6px 12px;border-radius:4px;font-size:13px;border:1px solid #e6e8e3">+ ${noise.length - 6} more</span>` : ""}
                </div>
              </div>`
            : ""
        }
        ${
          shouldBe.length
            ? `<div class="keep" style="margin-top:20px;padding:0">
                <h3 style="font-size:16px;font-weight:600;margin-bottom:12px">Who Should Be There</h3>
                ${shouldBe.map((c: any) => {
                  const name = String(c?.name || "").trim();
                  const where = String(c?.where || "").trim();
                  const note = String(c?.note || "").trim();
                  if (!name) return "";
                  return `<div style="margin-bottom:16px;padding:16px;background:#fbfbf9;border-radius:4px;border:1px solid #e6e8e3">
                    <div style="font-weight:600;font-size:14px;margin-bottom:4px">${escapeHtml(name)}</div>
                    ${where ? `<div style="color:#9aa09c;font-size:12px;margin-bottom:6px">${escapeHtml(where)}</div>` : ""}
                    ${note ? `<p style="color:#6d726f;font-size:13px">${escapeHtml(note)}</p>` : ""}
                  </div>`;
                }).filter(Boolean).join("")}
              </div>`
            : ""
        }
        ${
          gap
            ? `<div class="keep" style="margin:20px 0 0;padding:16px;background:#f6e9ec;border-left:3px solid #b0566b">
                <p style="color:#1c1f1d;font-size:14px"><b>The gap:</b> ${escapeHtml(gap)}</p>
              </div>`
            : ""
        }
      </div>
    `
    : "";

  const underRows = Array.isArray(under?.rows) ? under.rows : [];
  const underPills = Array.isArray(under?.pills) ? under.pills : [];
  const underHtml =
    underRows.length || underPills.length
      ? `
      <div class="page-card">
        <div class="eyebrow">Under the hood</div>
        <h2 class="section-title">What the site runs on, and how it's set up to be found.</h2>
        ${
          underRows.length
            ? `<div style="padding:0"><table style="border:none">
              <tr><th style="background:transparent;border:none;font-size:10.5px;text-transform:uppercase;color:#9aa09c;font-weight:normal;padding:8px 0">Layer</th><th style="background:transparent;border:none;font-size:10.5px;text-transform:uppercase;color:#9aa09c;font-weight:normal;padding:8px 12px">Status</th><th style="background:transparent;border:none;font-size:10.5px;text-transform:uppercase;color:#9aa09c;font-weight:normal;padding:8px 12px">What we found</th></tr>
              ${underRows
                .map((row: any) => {
                  const layer = String(row?.layer || "").trim();
                  const verdict = String(row?.verdict || "").trim();
                  const detail = String(row?.detail || "").trim();
                  if (!layer && !verdict && !detail) return "";
                  const verdictColor = verdict === "Fine" ? "#123c28" : verdict === "Gap" ? "#9c7a2f" : verdict === "Critical" ? "#b0566b" : "#6d726f";
                  const verdictBg = verdict === "Fine" ? "#e7efe9" : verdict === "Gap" ? "#f5eeda" : verdict === "Critical" ? "#f6e9ec" : "#f3f4f6";
                  return `<tr style="border-bottom:1px solid #e6e8e3">
                    <td style="padding:12px 0;vertical-align:top;font-weight:600;border:none">${escapeHtml(layer || "Layer")}</td>
                    <td style="padding:12px;vertical-align:top;border:none">${verdict ? `<span style="display:inline-block;padding:4px 10px;border-radius:4px;font-size:10.5px;text-transform:uppercase;font-weight:600;background:${verdictBg};color:${verdictColor}">${escapeHtml(verdict)}</span>` : ""}</td>
                    <td style="padding:12px;vertical-align:top;color:#6d726f;border:none">${escapeHtml(detail)}</td>
                  </tr>`;
                })
                .filter(Boolean)
                .join("")}
            </table></div>`
            : ""
        }
        ${
          underPills.length
            ? `<div class="pills" style="padding:0">
              ${underPills
                .slice(0, 24)
                .map((p: any, idx: number) => {
                  const name = String(p?.name || "").trim();
                  if (!name) return "";
                  const st = String(p?.status || "").trim().toLowerCase();
                  const cls = st === "good" ? "good" : st === "none" ? "none" : "";
                  return `<span class="pill ${cls}">${escapeHtml(name)}</span>`;
                })
                .filter(Boolean)
                .join("")}
            </div>`
            : ""
        }
      </div>
    `
      : "";

  const issuesHtml = issues.length
    ? `
      <div class="page-card">
        <div class="eyebrow">What's holding the site back</div>
        <h2 class="section-title">Concrete, fixable items — none of them hard.</h2>
        <p class="section-lead">Separate from the plumbing. These are what's capping your momentum, in priority order.</p>
        
        <div style="margin-top:14px;padding:0">
          ${issues
            .map((it: any, idx: number) => {
              const title = String(it?.title || "").trim();
              const body = String(it?.body || "").trim();
              const sev = String(it?.severity || "").trim();
              if (!title && !body) return "";
              
              const sevBg = sev === "high" ? "#f6e9ec" : sev === "med" ? "#f5eeda" : "#eef0eb";
              const sevColor = sev === "high" ? "#b0566b" : sev === "med" ? "#9c7a2f" : "#6d726f";
              
              return `<div style="padding:18px 0;border-top:1px solid var(--line);display:grid;grid-template-columns:64px 1fr;gap:16px">
                <div style="background:${sevBg};color:${sevColor};font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:0.06em;text-transform:uppercase;text-align:center;padding:4px 0;border-radius:4px;height:fit-content;font-weight:600">${escapeHtml(sev.toUpperCase())}</div>
                <div>
                  <div style="font-size:14.5px;font-weight:600;color:var(--ink);margin-bottom:6px">${escapeHtml(title || "Issue")}</div>
                  ${body ? `<div style="font-size:13.5px;color:var(--muted);line-height:1.5">${escapeHtml(body)}</div>` : ""}
                </div>
              </div>`;
            })
            .filter(Boolean)
            .join("")}
        </div>
      </div>
    `
    : "";

  const ladderHtml = ladder.length
    ? `
      <div class="page-card">
        <div class="eyebrow">Where your content should grow</div>
        <h2 class="section-title">The full opportunity map.</h2>
        ${ladderIntro ? `<p class="section-lead">${escapeHtml(ladderIntro)}</p>` : ""}
        
        <div style="margin-top:12px;padding:0">
          ${ladder
            .map((r: any, idx: number) => {
              const rung = r?.rung ?? idx + 1;
              const heading = String(r?.headline || r?.title || "").trim();
              const body = String(r?.body || r?.example || "").trim();
              const status = String(r?.status || "").trim();
              
              const statusBg = status === "in_place" ? "#e7efe9" : 
                              (status === "partly" || status === "needs_work") ? "#f5eeda" : "#f6e9ec";
              const statusColor = status === "in_place" ? "#123c28" :
                                 (status === "partly" || status === "needs_work") ? "#9c7a2f" : "#b0566b";
              const statusLabel = status === "in_place" ? "In place" :
                                 status === "partly" ? "Thin" :
                                 status === "needs_work" ? "Needs work" : "Missing";
              
              return `<div style="padding:18px 0;border-top:1px solid var(--line)">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                  <span style="font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:var(--faint)">${String(rung).padStart(2, '0')}</span>
                  <span style="font-size:14.5px;font-weight:600;color:var(--ink);flex:1">${escapeHtml(heading || "Rung")}</span>
                  <span style="background:${statusBg};color:${statusColor};font:10.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:0.06em;padding:4px 10px;border-radius:4px;font-weight:600">${escapeHtml(statusLabel)}</span>
                </div>
                ${body ? `<div style="font-size:13.5px;color:var(--muted);line-height:1.5;padding-left:24px">${escapeHtml(body)}</div>` : ""}
              </div>`;
            })
            .filter(Boolean)
            .join("")}
        </div>
        ${ladderSummary ? `<p class="after">${escapeHtml(ladderSummary)}</p>` : ""}
      </div>
    `
    : "";

  const tacticsHtml = tactics.length
    ? `
      <div class="page-card">
        <div class="eyebrow">The plan, in order</div>
        <h2 class="section-title">Where we would start, and why.</h2>
        <p class="section-lead">A focused route through the map, sequenced for your stage.</p>
        
        ${(() => {
          let currentPhase = "";
          let stepInPhase = 0;
          return tactics.map((tactic: any, i: number) => {
            const phase = String(tactic?.phase || "").trim();
            const isNewPhase = phase !== currentPhase;
            
            if (isNewPhase) {
              currentPhase = phase;
              stepInPhase = 0;
            } else {
              stepInPhase++;
            }
            
            const title = String(tactic?.title || "").trim();
            const body = String(tactic?.body || "").trim();
            
            if (isNewPhase && phase) {
              // Phase header
              return `
                ${i > 0 ? '<hr class="divider-thin" />' : ''}
                <div style="padding:0;margin-top:${i > 0 ? '32px' : '20px'}">
                  <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">
                    <span style="background:var(--green);color:var(--paper);font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:0.06em;text-transform:uppercase;padding:6px 12px;border-radius:4px;font-weight:600">${escapeHtml(phase.toUpperCase())}</span>
                    <span style="font-size:15px;font-weight:600;color:var(--ink)">${escapeHtml(title)}</span>
                  </div>
                </div>
              `;
            } else if (!isNewPhase && title) {
              // Numbered step
              return `
                <div style="padding:0;border-top:1px solid var(--line);padding-top:14px;padding-bottom:14px;display:grid;grid-template-columns:26px 1fr;gap:12px">
                  <div style="font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:600;color:var(--green)">${stepInPhase}</div>
                  <div>
                    <div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:4px">${escapeHtml(title)}</div>
                    ${body ? `<div style="font-size:13px;color:var(--muted);line-height:1.5">${escapeHtml(body)}</div>` : ""}
                  </div>
                </div>
              `;
            }
            return "";
          }).filter(Boolean).join("");
        })()}
      </div>
    `
    : "";

  const takeawayHtml = takeaway
    ? `
      <div style="background:var(--green);color:#eaf1ec;border-radius:8px;padding:44px 24px;margin-top:28px">
        <div style="font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8fb8a1;margin-bottom:20px">The honest takeaway</div>
        <p style="font-size:15.5px;line-height:1.5;margin:0">
          ${(() => {
            const firstSentence = takeaway.split('.')[0];
            const rest = takeaway.substring(takeaway.indexOf('.') + 1);
            return firstSentence 
              ? `<span style="color:var(--paper);font-weight:600">${escapeHtml(firstSentence)}.</span>${escapeHtml(rest)}`
              : escapeHtml(takeaway);
          })()}
        </p>
      </div>
    `
    : "";

  const poweredByName = String((report as any)?.powered_by_name || "").trim() || "Kanahiku";
  const footerDate = formatMonthYearFromIso(meta.report_date) || "July 2026";
  const foot = ``;

  // Page 1: Cover + Hero + Quick Overview
  const page1Html = `
    <div class="page-card">
      <div class="cover-top">
        <div>
          <div class="cover-date">Website Snapshot · ${escapeHtml(monthYearTop)}</div>
        </div>
        <div class="cover-meta">
          ${website ? `<div>${escapeHtml(stripProtocol(website))}</div>` : ""}
          ${location ? `<div>${escapeHtml(location)}</div>` : ""}
          ${phone ? `<div>${escapeHtml(phone)}</div>` : ""}
        </div>
      </div>
      <hr class="divider-thick" />
      <h1 class="page-title">${escapeHtml(businessName)}</h1>
      ${businessDescription ? `<p class="business-desc">${escapeHtml(businessDescription)}</p>` : ""}
      
      ${heroDisplay ? `
        <hr class="divider-thin" />
        ${diagnosis ? `<div class="eyebrow">${escapeHtml(diagnosis)}</div>` : ""}
        <div class="hero-number">${escapeHtml(heroDisplay)}</div>
        ${heroLabel ? `<p class="hero-label">${escapeHtml(heroLabel)}</p>` : ""}
        ${heroDescription ? `<p class="hero-desc">${escapeHtml(heroDescription)}</p>` : ""}
      ` : ""}
      
      ${calloutsHtml}
    </div>
  `;

  // Page 2: What SEO Can Do
  const page2Html = (tierLabel || tierReason || goalBody) ? `
    <div class="page-card">
      <div class="eyebrow">What SEO can do for you</div>
      <h2 class="section-title">${escapeHtml(tierLabel || "Your SEO opportunity tier")}</h2>
      ${tierReason ? `<p class="section-lead">${escapeHtml(tierReason)}</p>` : ""}
      
      <hr class="divider-thin" />
      
      <div class="tier-grid">
        ${[1, 2, 3].map((level) => {
          const isSelected = tierLevel === level;
          const tierNames = ["A growth channel", "A competitive channel", "A visibility channel"];
          const tierDescs = [
            "Search can bring real customers. You rank #1 for your name; the next wins are service and location pages that capture buyers who don't know you yet.",
            "Leads are possible but depend on local competition and demand. Start focused, evaluate at six months.",
            "Supports credibility more than acquisition. Not you — a six-county consumer market rewards being found."
          ];
          return `<div class="tier-card ${isSelected ? "tier-selected" : ""}">
            ${isSelected ? `<div class="tier-badge">YOUR FIT</div>` : ""}
            <div class="tier-num">Tier ${level}</div>
            <div class="tier-name">${escapeHtml(tierNames[level - 1])}</div>
            <div class="tier-desc">${escapeHtml(tierDescs[level - 1])}</div>
          </div>`;
        }).join("")}
      </div>
      
      ${goalHtml}
    </div>
  ` : "";

  return `
    <div class="wrap">
      ${page1Html}
      ${page2Html}
      ${statsHtml}
      ${competitorsHtml}
      ${underHtml}
      ${issuesHtml}
      ${ladderHtml}
      ${tacticsHtml}
      ${takeawayHtml}
      ${foot}
    </div>
  `;
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

function seoHumanize(value: string): string {
  const cleaned = String(value || "").replace(/_/g, " ").trim();
  if (!cleaned) return "Opportunity";
  return cleaned.replace(/\b\w/g, (m) => m.toUpperCase());
}

function seoCapitalizeFirst(value: string): string {
  const str = String(value || "").trim();
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const SEO_ICON: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  crosshair:
    '<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  eyeOff:
    '<path d="M10.7 5.1A10.7 10.7 0 0 1 22 11.6a1 1 0 0 1 0 .7 10.7 10.7 0 0 1-1.4 2.5"/><path d="M14.1 14.2a3 3 0 0 1-4.3-4.3"/><path d="M17.5 17.5A10.8 10.8 0 0 1 2 12.3a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.4-5.1"/><path d="m2 2 20 20"/>',
  alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  circleAlert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  binoculars:
    '<path d="M10 10h4"/><path d="M19 7V4a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v3"/><path d="M5 7V4a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3"/><path d="M14 21a4 4 0 0 0 4-4V7h-4v10a4 4 0 0 0 4 4Z"/><path d="M6 21a4 4 0 0 0 4-4V7H6v10a4 4 0 0 0 4 4Z"/>',
  clapperboard:
    '<path d="M20.2 6 3 11l-.9-3.1a2 2 0 0 1 1.4-2.5L16.4 2a2 2 0 0 1 2.5 1.4Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.7 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.8 10.8 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  bars: '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  plus: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
  trendDown: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  verified:
    '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
  file:
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  pin: '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  compare: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
};

function seoSvg(path: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

function seoFaviconHost(value: string): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const candidate = raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/\s]/)[0];
  return candidate && candidate.includes(".") && !/\s/.test(candidate) ? candidate : null;
}

function seoFav(value: string, size: 20 | 44 = 20): string {
  const host = seoFaviconHost(value);
  const letter = escapeHtml(
    String(host || value || "?").replace(/^www\./, "").charAt(0).toUpperCase()
  );
  const cls = size === 44 ? "s44" : "s20";
  if (!host) {
    return `<span class="fav ${cls}"><span class="mono" style="display:flex">${letter}</span></span>`;
  }
  const sz = size === 44 ? 128 : 64;
  return `<span class="fav ${cls}"><img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    host
  )}&sz=${sz}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="mono">${letter}</span></span>`;
}

function seoVisibilityBadge(value: string): { label: string; cls: string; icon: string | null } {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("not visible")) {
    return { label: value || "Not visible", cls: "b-red", icon: SEO_ICON.eyeOff };
  }
  if (normalized.includes("missing") || normalized.includes("buried") || normalized.includes("weak")) {
    return { label: value || "Weak", cls: "b-amber", icon: SEO_ICON.alert };
  }
  if (normalized.includes("strong")) {
    return { label: value || "Strong", cls: "b-green", icon: SEO_ICON.eye };
  }
  return { label: value || "Opportunity", cls: "b-gray", icon: null };
}

function seoOpportunityBadge(value: string): { label: string; cls: string } {
  const normalized = String(value || "").toLowerCase();
  const short = String(value || "").split(/[—\-:]/)[0]?.trim() || value || "Opportunity";
  if (normalized.startsWith("service")) return { label: "Service page", cls: "b-blue" };
  if (normalized.startsWith("audience")) return { label: "Audience page", cls: "b-violet" };
  if (normalized.includes("comparison")) return { label: "Comparison page", cls: "b-violet" };
  if (normalized.includes("local")) return { label: "Local landing page", cls: "b-green" };
  if (normalized.includes("cost") || normalized.includes("pricing")) {
    return { label: "Cost/pricing guide", cls: "b-amber" };
  }
  return { label: short, cls: "b-gray" };
}

function seoOppIcon(assetType: string, label: string): string {
  const key = `${assetType} ${label}`.toLowerCase();
  if (key.includes("local") || key.includes("gbp") || key.includes("map")) return SEO_ICON.pin;
  if (key.includes("comparison") || key.includes("compare")) return SEO_ICON.compare;
  if (key.includes("review") || key.includes("reputation")) return SEO_ICON.star;
  if (key.includes("audience")) return SEO_ICON.users;
  return SEO_ICON.file;
}

function seoSplitPath(value: string): { host: string; path: string } {
  const stripped = stripUrlProtocol(value);
  const slash = stripped.indexOf("/");
  if (slash === -1) return { host: stripped, path: "/" };
  return { host: stripped.slice(0, slash), path: stripped.slice(slash) || "/" };
}

function legacySeoSnapshotHtmlFromData(args: {
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
    ["Real searches analyzed", report.statTiles.searchesAnalyzed, false, SEO_ICON.search],
    ["High-value searches checked", report.statTiles.highValueChecked, false, SEO_ICON.target],
    ["Missed opportunities found", report.statTiles.missedFound, true, SEO_ICON.crosshair],
    ["Competitors showing up", report.statTiles.competitorsOutranking, false, SEO_ICON.users],
  ] as const;

  const findings = report.execSummary.whatWeFound.length
    ? report.execSummary.whatWeFound
    : ["Search demand exists for services this business already offers."];

  const firstSteps = report.opportunityMap.slice(0, 3);

  const missedRows = report.missedVisibility.slice(0, 20);
  const missedVolumeMax = Math.max(1, ...missedRows.map((row) => row.searchVolume ?? 0));
  const demandMax = Math.max(1, ...report.customerDemand.map((row) => row.searchVolume ?? 0));
  const pageRows = report.competitorPages.slice(0, 12);
  const organicMax = Math.max(1, ...pageRows.map((row) => row.organicCount ?? 0));

  const coverageTotal = report.missedVisibility.length;
  let coverageWeak = 0;
  let coverageOut = 0;
  for (const row of report.missedVisibility) {
    const cls = seoVisibilityBadge(row.visibility).cls;
    if (cls === "b-amber") coverageWeak += 1;
    else if (cls === "b-red") coverageOut += 1;
  }
  const coverageVisible = Math.max(0, coverageTotal - coverageWeak - coverageOut);
  const coverageSegs = [
    ["segVis", coverageVisible],
    ["segWeak", coverageWeak],
    ["segOut", coverageOut],
  ]
    .filter(([, n]) => (n as number) > 0)
    .map(
      ([c, n], idx, arr) =>
        `<div class="seg ${c}" style="width:${((n as number) / coverageTotal) * 100}%;${
          idx < arr.length - 1 ? "border-right:2px solid #fff;" : ""
        }"></div>`
    )
    .join("");

  const coverageHtml = coverageTotal
    ? `
      <div class="coverage">
        <div class="covTop">
          <div class="covTitle">Search visibility<span class="covSub">Across the ${coverageTotal} high-value searches tracked</span></div>
          <div class="covScore"><b>${coverageVisible}</b> / ${coverageTotal} visible</div>
        </div>
        <div class="covBar">${coverageSegs}</div>
        <div class="covLegend">
          <span><i class="segVis"></i>Visible <b>${coverageVisible}</b></span>
          <span><i class="segWeak"></i>Weak <b>${coverageWeak}</b></span>
          <span><i class="segOut"></i>Not visible <b>${coverageOut}</b></span>
        </div>
      </div>
    `
    : "";

  return `
    <div class="wrap">
      <div class="card">
        <div class="header">
          <div class="brand">
            ${
              seoFaviconHost(report.website)
                ? seoFav(report.website, 44)
                : `<div class="logo">${escapeHtml(seoSnapshotInitials(report.businessName))}</div>`
            }
            <div>
              <h1>SEO Snapshot - ${escapeHtml(report.businessName || "Business")}</h1>
              ${meta ? `<div class="sub">${meta}</div>` : ""}
            </div>
          </div>
          <div style="text-align:right">
            ${generatedAt ? `<div class="sub" style="font-size:13px;color:#171717">${escapeHtml(generatedAt)}</div>` : ""}
            <span class="verified">${seoSvg(SEO_ICON.verified)}Real Google search data</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="secnum">01 · Executive summary</div>
        <h2>${escapeHtml(report.execSummary.execHeadline)}</h2>
        ${report.execSummary.execSubhead ? `<p class="lead">${escapeHtml(report.execSummary.execSubhead)}</p>` : ""}
        <div class="loss">
          <div>
            <span class="lossBadge" style="display:inline-flex;align-items:center;gap:5px">${seoSvg(SEO_ICON.trendDown)}Demand you're missing</span>
            ${
              report.execSummary.demandLoss.value != null
                ? `<div class="big">~${escapeHtml(formatSeoSnapshotNumber(report.execSummary.demandLoss.value))}<span class="unit"> inquiries / mo</span></div>`
                : `<div class="big" style="font-size:24px">A steady stream of searches every month</div>`
            }
            <p class="sub" style="max-width:420px;margin-top:10px">Estimated new customer inquiries each month from people searching for services this business is not capturing yet.</p>
          </div>
          <div class="assume">${escapeHtml(seoCapitalizeFirst(report.execSummary.demandLoss.disclaimer))}</div>
        </div>
        ${coverageHtml}
        <div class="tiles">
          ${stats.map(([label, value, accent, icon]) => `
            <div class="tile ${accent ? "flag" : ""}">
              <div class="tileTop"><span>${escapeHtml(label)}</span>${seoSvg(icon)}</div>
              <div class="tileN ${accent ? "accent" : ""}">${escapeHtml(formatSeoSnapshotNumber(value))}</div>
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
              <div class="dqRow">
                <span>${escapeHtml(row.keyword)}</span>
                <span>${row.searchVolume != null ? `<b>${escapeHtml(formatSeoSnapshotNumber(row.searchVolume))}</b> / mo` : "Demand"}</span>
              </div>
              <div class="track"><div class="fill" style="width:${row.searchVolume != null ? (row.searchVolume / demandMax) * 100 : 0}%"></div></div>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="section">
        <div class="secnum">03 · Missed visibility</div>
        <h2>High-value searches you are missing.</h2>
        <p class="lead">${escapeHtml(report.missedIntro)}</p>
        <div class="tablewrap"><table>
          <thead><tr><th>Search</th><th>Searches</th><th>Your visibility</th><th>Found instead</th><th>Opportunity</th></tr></thead>
          <tbody>
            ${missedRows.map((row) => {
              const vis = seoVisibilityBadge(row.visibility);
              const opp = seoOpportunityBadge(row.opportunity);
              const barPct = row.searchVolume != null ? (Math.sqrt(row.searchVolume) / Math.sqrt(missedVolumeMax)) * 100 : 0;
              return `
              <tr>
                <td style="font-weight:500">${escapeHtml(row.keyword)}</td>
                <td><div class="svol"><span>${row.searchVolume != null ? `${escapeHtml(formatSeoSnapshotNumber(row.searchVolume))}<span style="color:#737373;font-size:12px">/mo</span>` : ""}</span>${row.searchVolume != null ? `<div class="vbar"><div class="vfill" style="width:${barPct}%"></div></div>` : ""}</div></td>
                <td><span class="badge ${vis.cls}">${vis.icon ? seoSvg(vis.icon) : ""}${escapeHtml(vis.label)}</span></td>
                <td>${
                  row.competitorShowingUp
                    ? `<div class="site">${seoFaviconHost(row.competitorShowingUp) ? seoFav(row.competitorShowingUp, 20) : ""}<span>${escapeHtml(row.competitorShowingUp)}</span></div>`
                    : `<span style="color:#737373">—</span>`
                }</td>
                <td><span class="badge ${opp.cls}">${escapeHtml(opp.label)}</span></td>
              </tr>
            `;
            }).join("")}
          </tbody>
        </table></div>
      </div>

      <div class="section">
        <div class="secnum">04 · Competitor visibility</div>
        <h2>These competitors are being found before you.</h2>
        <p class="lead">${escapeHtml(report.competitorIntro)}</p>
        <div class="tablewrap"><table>
          <thead><tr><th>Competitor</th><th>Appears for</th><th>Map pack</th><th>Why they are winning</th></tr></thead>
          <tbody>
            ${report.competitorVisibility.map((row) => {
              const inMapPack = !!(row.localPackCount && row.localPackCount > 0);
              return `
              <tr>
                <td><div class="site">${seoFav(row.domain, 20)}<span style="font-weight:500">${escapeHtml(row.domain)}</span></div></td>
                <td>${row.appearancesInTop10 != null ? `${escapeHtml(formatSeoSnapshotNumber(row.appearancesInTop10))} searches` : ""}</td>
                <td><span class="badge ${inMapPack ? "b-green" : "b-gray"}">${inMapPack ? "Listed" : "Not listed"}</span></td>
                <td style="color:#737373">${escapeHtml(row.whyWinning || "Ranks in top results for multiple searches")}</td>
              </tr>
            `;
            }).join("")}
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
            ${pageRows.map((row) => {
              const full = row.pageAddress || row.domain;
              const parts = seoSplitPath(full);
              return `
              <tr>
                <td><div class="pathwrap">${seoFav(row.domain || full, 20)}<div class="path"><div class="p1">${escapeHtml(parts.host)}</div><div class="p2">${escapeHtml(parts.path)}</div></div></div></td>
                <td>${
                  row.organicCount != null
                    ? `<div class="ks"><span style="font-weight:500">${escapeHtml(formatSeoSnapshotNumber(row.organicCount))}</span><span style="color:#737373;font-size:12px">keywords</span><span class="miniwrap"><span class="mini" style="width:${(row.organicCount / organicMax) * 100}%"></span></span></div>`
                    : escapeHtml(
                        row.demandCaptured ||
                          (row.etv != null ? `${formatSeoSnapshotNumber(row.etv)} estimated visits` : "Relevant demand")
                      )
                }</td>
                <td><span class="badge ${row.clientGap === true ? "b-red" : "b-amber"}">${row.clientGap === true ? "Client gap" : "Review gap"}</span></td>
              </tr>
            `;
            }).join("")}
          </tbody>
        </table></div>
      </div>

      <div class="section">
        <div class="secnum">06 · Your opportunity map</div>
        <h2>Here is what we would build first.</h2>
        <p class="lead">${escapeHtml(report.opportunityIntro)}</p>
        <div class="buckets">
          ${report.opportunityMap.map((item, index) => {
            const buildFirst = index < 2;
            return `
            <div class="bucket">
              <div class="ohead">
                <div class="oleft">
                  <span class="oicon">${seoSvg(seoOppIcon(item.assetType, item.label))}</span>
                  <div>
                    <h3 style="margin:0">${escapeHtml(item.label || seoHumanize(item.assetType))}</h3>
                    <p class="sub">${escapeHtml(item.bucket || seoHumanize(item.assetType))}${item.keywordCount != null ? ` · ${escapeHtml(formatSeoSnapshotNumber(item.keywordCount))} searches mapped` : ""}</p>
                  </div>
                </div>
                <span class="badge b-gray">${seoSvg(buildFirst ? SEO_ICON.flag : SEO_ICON.plus)}${buildFirst ? "Build first" : "Support"}</span>
              </div>
              ${
                item.keywords.length
                  ? `<div class="chips">${item.keywords.slice(0, 6).map((keyword) => `<span class="chip">${escapeHtml(keyword)}</span>`).join("")}</div>`
                  : `<div class="chipNote">Foundational work — strengthens visibility across the searches above.</div>`
              }
            </div>
          `;
          }).join("")}
        </div>
      </div>

      <div class="foot">SEO Snapshot · ${escapeHtml(report.businessName || "Business")}${generatedAt ? ` · Generated ${escapeHtml(generatedAt)}` : ""}</div>
    </div>
  `;
}

function seoSnapshotHtmlFromData(args: {
  report: SeoSnapshotReport;
  poweredByName?: string;
}): string {
  const { report } = args;
  const generatedAt = formatSeoDate(report.generatedAt);
  const websiteLabel = stripUrlProtocol(report.website).split("/")[0] || "";
  const verifiedText = generatedAt
    ? `Verified search data from ${generatedAt}`
    : "Verified search data";
  const demandLossValue = report.execSummary.demandLoss.value;
  const demandLossText = demandLossValue != null ? formatSeoSnapshotNumber(demandLossValue) : "";
  const demandLossDigits = demandLossText.length;
  const demandNumberClass =
    demandLossDigits > 5
      ? "demandNumber small"
      : demandLossDigits > 3
        ? "demandNumber medium"
        : "demandNumber";

  const stats = [
    ["Real searches analyzed", report.statTiles.searchesAnalyzed, false, SEO_ICON.search],
    ["High-value searches checked", report.statTiles.highValueChecked, false, SEO_ICON.target],
    ["Missed opportunities found", report.statTiles.missedFound, true, SEO_ICON.crosshair],
    ["Competitors showing up", report.statTiles.competitorsOutranking, false, SEO_ICON.users],
  ] as const;

  const findings = report.execSummary.whatWeFound.length
    ? report.execSummary.whatWeFound.slice(0, 2)
    : ["Search demand exists for services this business already offers."];
  const firstSteps = report.opportunityMap.slice(0, 3);
  const missedRows = report.missedVisibility.slice(0, 20);
  const missedVolumeMax = Math.max(1, ...missedRows.map((row) => row.searchVolume ?? 0));
  const demandMax = Math.max(1, ...report.customerDemand.map((row) => row.searchVolume ?? 0));
  const pageRows = report.competitorPages.slice(0, 12);

  const coverageTotal = Math.max(1, missedRows.length);
  let coverageWeak = 0;
  let coverageOut = 0;
  for (const row of missedRows) {
    const cls = seoVisibilityBadge(row.visibility).cls;
    if (cls === "b-amber") coverageWeak += 1;
    else if (cls === "b-red") coverageOut += 1;
  }
  const coverageVisible = Math.max(0, missedRows.length - coverageWeak - coverageOut);
  const coverageSegs = [
    ["segOut", coverageOut],
    ["segWeak", coverageWeak],
    ["segVis", coverageVisible],
  ]
    .filter(([, n]) => (n as number) > 0)
    .map(([c, n]) => {
      const label = c === "segOut" ? "not visible" : c === "segWeak" ? "weak" : "visible";
      return `<div class="seg ${c}" style="width:${((n as number) / coverageTotal) * 100}%"><span>${n} <span>${label}</span></span></div>`;
    })
    .join("");

  return `
    <div class="pdfCanvas">
      <header class="reportHeader">
        <div class="reportTitleBlock">
          <div class="logoBox">${seoFav(report.website || report.businessName, 44)}</div>
          <div class="titleText">
            <h1>SEO Snapshot Report</h1>
            ${websiteLabel ? `<span class="badge badgeMini b-gray">${escapeHtml(websiteLabel)}</span>` : ""}
          </div>
        </div>
        <span class="badge badgeMini b-blue">${seoSvg(SEO_ICON.verified)}${escapeHtml(verifiedText)}</span>
      </header>

      <main class="contentStack">
        <section class="sectionCard">
          <div class="eyebrow">OVERVIEW</div>

          <div class="overviewTop">
            <div class="demandCard">
              <div class="demandLeft ${demandLossDigits > 3 ? "wide" : ""}">
                <div class="demandNumberRow">
                  <span class="${demandNumberClass}">${demandLossValue != null ? escapeHtml(demandLossText) : "—"}</span>
                  <span class="demandUnit">inquiries/month</span>
                </div>
                <span class="badge badgeMini b-red">${seoSvg(SEO_ICON.circleAlert)}Demand you're missing</span>
              </div>
              <div class="demandText">
                <p class="demandHeadline">${escapeHtml(report.execSummary.execHeadline || "Searches per month looking for your services miss you.")}</p>
                <p class="demandDisclaimer">${escapeHtml(seoCapitalizeFirst(report.execSummary.demandLoss.disclaimer))}</p>
              </div>
            </div>

            <div class="metricGrid">
              ${stats.map(([label, value, accent, icon]) => `
                <div class="metricTile">
                  <div class="metricLabel">${seoSvg(icon)}<span class="truncate">${escapeHtml(label)}</span></div>
                  <div class="metricValue ${accent ? "accent" : ""}">${escapeHtml(formatSeoSnapshotNumber(value))}</div>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="visibilityMeter">
            <div class="visibilityTop">
              <div class="visibilityTitle">
                ${seoSvg(SEO_ICON.eye)}
                <span>Search visibility</span>
                <span class="visibilitySub">Across the ${missedRows.length} high-value searches tracked</span>
              </div>
              <div class="visibilityScore"><b>${coverageVisible}</b><span>/</span><span>${missedRows.length} visible</span></div>
            </div>
            <div class="visibilityBar">${coverageSegs}</div>
          </div>

          <div class="summaryGrid">
            <div class="summaryPanel">
              <div class="panelTitle">${seoSvg(SEO_ICON.binoculars)}What we found</div>
              ${findings.map((item) => `<div class="checkLine">${seoSvg(SEO_ICON.check)}<span>${escapeHtml(item)}</span></div>`).join("")}
            </div>
            <div class="summaryPanel">
              <div class="panelTitle">${seoSvg(SEO_ICON.clapperboard)}High-impact first steps</div>
              ${
                firstSteps.length
                  ? firstSteps.map((item) => `<div class="checkLine">${seoSvg(SEO_ICON.check)}<span>${escapeHtml(item.label || seoHumanize(item.assetType))}</span></div>`).join("")
                  : `<div class="checkLine">${seoSvg(SEO_ICON.check)}<span>Prioritized assets will appear here when the report includes them.</span></div>`
              }
              ${report.firstStepsCaption ? `<p class="caption">${escapeHtml(report.firstStepsCaption)}</p>` : ""}
            </div>
          </div>
        </section>

        <section class="sectionCard">
          <div class="eyebrow">CUSTOMER DEMAND</div>
          <div class="sectionIntro">
            <h2>Here is what potential customers are searching.</h2>
            <p class="sectionLead">${escapeHtml(report.demandIntro)}</p>
          </div>
          <div class="demandList">
            ${report.customerDemand.map((row) => `
              <div class="demandRow">
                <div class="demandRowTop">
                  <span class="keyword">${escapeHtml(row.keyword)}</span>
                  <span class="volume">${
                    row.searchVolume != null
                      ? `<b>${escapeHtml(formatSeoSnapshotNumber(row.searchVolume))}</b><span>/</span><span>month</span>`
                      : `<span>Demand</span>`
                  }</span>
                </div>
                <div class="progressTrack"><div class="progressFill" style="width:${row.searchVolume != null ? (row.searchVolume / demandMax) * 100 : 0}%"></div></div>
              </div>
            `).join("")}
          </div>
        </section>

        <section class="sectionCard">
          <div class="eyebrow">MISSED VISIBILITY</div>
          <div class="sectionIntro">
            <h2>High-value searches you are missing.</h2>
            <p class="sectionLead">${escapeHtml(report.missedIntro)}</p>
          </div>
          <div class="tableWrap">
            <table>
              <colgroup><col><col><col style="width:150px"><col><col style="width:150px"></colgroup>
              <thead><tr><th>Search</th><th>Searches</th><th>Your visibility</th><th>Found instead</th><th>Opportunity</th></tr></thead>
              <tbody>
                ${missedRows.map((row) => {
                  const vis = seoVisibilityBadge(row.visibility);
                  const opp = seoOpportunityBadge(row.opportunity);
                  const barPct = row.searchVolume != null ? (Math.sqrt(row.searchVolume) / Math.sqrt(missedVolumeMax)) * 100 : 0;
                  return `
                    <tr>
                      <td><div class="truncate">${escapeHtml(row.keyword)}</div></td>
                      <td>
                        <div class="searchVolumeCell">
                          <div class="searchVolumeText">${row.searchVolume != null ? `<b>${escapeHtml(formatSeoSnapshotNumber(row.searchVolume))}</b><span>/month</span>` : ""}</div>
                          <div class="miniTrack"><div class="progressFill" style="width:${barPct}%"></div></div>
                        </div>
                      </td>
                      <td><span class="badge ${vis.cls}">${vis.icon ? seoSvg(vis.icon) : ""}${escapeHtml(vis.label)}</span></td>
                      <td>${
                        row.competitorShowingUp
                          ? `<div class="siteCell">${seoFav(row.competitorShowingUp, 20)}<span class="truncate">${escapeHtml(row.competitorShowingUp)}</span></div>`
                          : `<span style="color:#737373">-</span>`
                      }</td>
                      <td><span class="badge b-outline">${escapeHtml(opp.label)}</span></td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </section>

        <section class="sectionCard">
          <div class="eyebrow">COMPETITOR VISIBILITY</div>
          <div class="sectionIntro">
            <h2>These competitors are being found before you.</h2>
            <p class="sectionLead">${escapeHtml(report.competitorIntro)}</p>
          </div>
          <div class="tableWrap">
            <table>
              <colgroup><col><col style="width:181px"><col style="width:181px"><col style="width:363px"></colgroup>
              <thead><tr><th>Competitor</th><th>Appears in</th><th>Map Pack</th><th>Why they are winning</th></tr></thead>
              <tbody>
                ${report.competitorVisibility.map((row) => {
                  const inMapPack = !!(row.localPackCount && row.localPackCount > 0);
                  return `
                    <tr>
                      <td><div class="siteCell">${seoFav(row.domain, 20)}<span class="truncate">${escapeHtml(row.domain)}</span></div></td>
                      <td>${row.appearancesInTop10 != null ? `${escapeHtml(formatSeoSnapshotNumber(row.appearancesInTop10))} searches` : ""}</td>
                      <td><span class="badge b-gray">${inMapPack ? "Listed" : "Not Listed"}</span></td>
                      <td><div class="truncate">${escapeHtml(row.whyWinning || "ranks in top 3 for multiple high-value keywords")}</div></td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </section>

        <section class="sectionCard">
          <div class="eyebrow">COMPETITOR PAGES</div>
          <div class="sectionIntro">
            <h2>Here is what competitors built to capture that demand.</h2>
            <p class="sectionLead">The specific pages doing the work, and the gap on your site for each.</p>
          </div>
          <div class="tableWrap">
            <table>
              <colgroup><col><col style="width:181px"><col style="width:181px"></colgroup>
              <thead><tr><th>Competitor page</th><th>Demand signal</th><th>Your gap</th></tr></thead>
              <tbody>
                ${pageRows.map((row) => {
                  const full = row.pageAddress || row.domain;
                  const parts = seoSplitPath(full);
                  return `
                    <tr>
                      <td>
                        <div class="pathCell">
                          ${seoFav(row.domain || full, 20)}
                          <div class="pathText">
                            <div class="pathHost">${escapeHtml(parts.host)}</div>
                            <div class="pathPath">${escapeHtml(parts.path)}</div>
                          </div>
                        </div>
                      </td>
                      <td><span class="badge b-gray">${
                        row.organicCount != null
                          ? `${escapeHtml(formatSeoSnapshotNumber(row.organicCount))} keywords`
                          : escapeHtml(row.demandCaptured || (row.etv != null ? `${formatSeoSnapshotNumber(row.etv)} estimated visits` : "Relevant demand"))
                      }</span></td>
                      <td><span class="badge ${row.clientGap === true ? "b-red" : "b-amber"}">${row.clientGap === true ? "Client gap" : "Review gap"}</span></td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </section>

        <section class="sectionCard">
          <div class="eyebrow">OPPORTUNITY MAP</div>
          <div class="sectionIntro">
            <h2>Here is what we would build first.</h2>
            <p class="sectionLead">${escapeHtml(report.opportunityIntro)}</p>
          </div>
          <div class="tableWrap">
            <table>
              <colgroup><col style="width:150px"><col style="width:300px"><col></colgroup>
              <thead><tr><th>Page type</th><th>Page name</th><th>Keywords</th></tr></thead>
              <tbody>
                ${report.opportunityMap.map((item) => `
                  <tr>
                    <td><span class="badge b-gray">${escapeHtml(seoHumanize(item.assetType || item.bucket || "Service page"))}</span></td>
                    <td><div class="truncate">${escapeHtml(item.label || seoHumanize(item.assetType))}</div></td>
                    <td>
                      <div class="keywordBadges">
                        ${(item.keywords.length ? item.keywords : [item.label || item.assetType]).filter(Boolean).slice(0, 6).map((keyword) => `<span class="badge b-outline">${escapeHtml(keyword)}</span>`).join("")}
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </section>
      </main>

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
    const isWebsiteSnapshotTemplate = template === "website-snapshot";
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
    } else if (isWebsiteSnapshotTemplate) {
      if (!report) {
        return NextResponse.json(
          { error: "report JSON payload is required for template website-snapshot" },
          { status: 400 }
        );
      }
      bodyHtml = websiteSnapshotHtmlFromReport(report as WebsiteSnapshotReport);
      css = WEBSITE_SNAPSHOT_CSS;
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

    const pdf = await page.pdf(
      isSeoSnapshotTemplate
        ? {
            width: "1160px",
            height: "2800px",
            printBackground: true,
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
            preferCSSPageSize: true,
          }
        : {
            format: "A4",
            printBackground: true,
            margin: isSnapshotTemplate || isPerformanceV2Template || isBillingReconciliationTemplate
              ? { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" }
              : { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
          }
    );

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
