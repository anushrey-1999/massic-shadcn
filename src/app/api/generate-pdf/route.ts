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
  @page { size: 1160px 2800px; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #0A0A0A;
    background: #ffffff;
  }
  .pdfCanvas {
    width: 1096px;
    margin: 0 auto;
    background: #ffffff;
    padding: 24px 24px 24px;
  }
  .reportHeader {
    width: 1048px;
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
    width: 1048px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    margin-top: 24px;
  }
  .sectionCard {
    width: 1048px;
    background: #ffffff;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 2px 2px rgba(0,0,0,0.10), 0 4px 3px rgba(0,0,0,0.10);
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
    width: 506px;
    height: 166px;
    flex: none;
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
