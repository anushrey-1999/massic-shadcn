import type { BillingReconciliationReport } from "@/types/billing-reconciliation-types";

export const BILLING_RECONCILIATION_CSS = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #ffffff;
    color: #0a0a0a;
    padding: 0;
  }

  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 36px 24px 24px;
  }

  .reportHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 24px;
    border-bottom: 1px solid #e5e5e5;
  }

  .headerTitleWrap {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .headerTitleGroup {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .receiptIcon {
    width: 29px;
    height: 29px;
    border: 1.8px solid #0a0a0a;
    border-radius: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #0a0a0a;
    font-size: 14px;
    line-height: 1;
    flex: 0 0 auto;
  }

  .headerTitle {
    font-size: 24px;
    line-height: 1.2;
    font-weight: 600;
    letter-spacing: -0.48px;
    color: #0a0a0a;
    white-space: nowrap;
  }

  .agencyBadge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
    padding: 3px 8px;
    border-radius: 8px;
    background: #f5f5f5;
    color: #171717;
    font-size: 12px;
    line-height: 1.5;
    font-weight: 500;
    letter-spacing: 0.18px;
    white-space: nowrap;
  }

  .summaryGrid {
    display: grid;
    grid-template-columns: 294px 1fr;
    gap: 10px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .summaryCard {
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    background: rgba(65, 135, 112, 0.05);
    padding: 12px 16px;
    min-height: 107px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .summaryLabel {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    color: #737373;
    text-transform: uppercase;
  }

  .summaryValue {
    margin-top: 8px;
    font-size: 24px;
    line-height: 1.2;
    color: #0a0a0a;
    font-weight: 600;
    letter-spacing: -0.48px;
    overflow-wrap: anywhere;
  }

  .summarySubtext {
    margin-top: 8px;
    font-size: 10px;
    line-height: 1.5;
    color: #171717;
    font-weight: 500;
    letter-spacing: 0.15px;
    overflow-wrap: anywhere;
  }

  .planGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 8px;
  }

  .planMetric {
    min-width: 0;
  }

  .planMetricTop {
    display: flex;
    align-items: flex-end;
    gap: 4px;
  }

  .planCount {
    font-size: 24px;
    line-height: 1.2;
    font-weight: 600;
    letter-spacing: -0.48px;
    color: #0a0a0a;
  }

  .planAmount {
    padding-bottom: 2px;
    font-size: 10px;
    line-height: 1.5;
    font-weight: 400;
    letter-spacing: 0.15px;
    color: #a3a3a3;
    white-space: nowrap;
  }

  .planPill {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 4px;
    min-height: 24px;
    width: 100%;
    padding: 3px 8px;
    border-radius: 8px;
    background: rgba(65, 135, 112, 0.1);
    color: #737373;
    font-size: 10px;
    line-height: 1.5;
    font-weight: 500;
    letter-spacing: 0.15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tableWrap {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    overflow: hidden;
    width: 100%;
    max-width: 100%;
  }

  .sectionTitle {
    margin-bottom: 10px;
    font-size: 16px;
    line-height: 1.5;
    font-weight: 500;
    color: #0a0a0a;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    max-width: 100%;
  }

  thead {
    display: table-header-group;
  }

  thead tr {
    background: #ffffff;
  }

  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  th {
    text-align: left;
    padding: 7.5px 4px;
    border-bottom: 1px solid #e5e5e5;
    font-size: 10px;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.15px;
    color: #a3a3a3;
  }

  td {
    padding: 6px 4px;
    border-bottom: 1px solid #e5e5e5;
    vertical-align: middle;
    font-size: 10px;
    line-height: 1.4;
    letter-spacing: 0.15px;
    color: #737373;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: normal;
    max-width: 0;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  .colBusiness { width: 18%; }
  .colPlan { width: 15%; }
  .colPeriod { width: 16%; }
  .colLastBilled { width: 12%; }
  .colNextBilling { width: 12%; }
  .colInvoice { width: 15%; }
  .colAmount { width: 12%; }
  .colAgencyItem { width: 21%; }
  .colAgencyDetail { width: 28%; }
  .colAgencyLastBilled { width: 21%; }
  .colAgencyReference { width: 21%; }
  .colAgencyAmount { width: 9%; }

  .business {
    font-size: 10px;
    line-height: 1.4;
    letter-spacing: 0.15px;
    font-weight: 500;
    color: #171717;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    min-height: 20px;
    padding: 2px 6px;
    border-radius: 6px;
    background: #f5f5f5;
    font-size: 9px;
    line-height: 1.3;
    color: #737373;
    font-weight: 500;
    letter-spacing: 0.12px;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badgeWarning {
    margin-top: 4px;
    background: #fffbeb;
    color: #92400e;
  }

  .invoice {
    color: #2563eb;
    font-weight: 400;
    font-size: 10px;
    line-height: 1.4;
    letter-spacing: 0.15px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .amount {
    text-align: right;
    color: #171717;
    font-weight: 500;
    font-size: 10px;
    line-height: 1.4;
    letter-spacing: 0.15px;
    white-space: nowrap;
  }

  .empty {
    padding: 28px 16px;
    text-align: center;
    color: #737373;
    font-size: 14px;
  }
`;

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildDocumentHtml(label?: string | null, url?: string | null) {
  const safeLabel = escapeHtml(label || "-");
  if (!url) {
    return safeLabel;
  }

  return `<a href="${escapeHtml(url)}" style="color:#2563eb;text-decoration:none;">${safeLabel}</a>`;
}

function getBillingDocumentDisplay(row: BillingReconciliationReport["rows"][number]) {
  const rawLabel = row.billingDocumentLabel || row.invoiceNumber || "-";
  const normalizedLabel = rawLabel.toLowerCase();

  if (row.rowType === "agency_add_on") {
    const isReceipt = normalizedLabel.includes("receipt");
    const hasDocumentUrl = Boolean(row.billingDocumentUrl);
    return {
      primaryLabel: isReceipt
        ? "Execution credits receipt"
        : hasDocumentUrl
          ? "Execution credits invoice"
          : "Execution credits payment",
      secondaryLabel: isReceipt ? null : rawLabel,
    };
  }

  return {
    primaryLabel: rawLabel,
    secondaryLabel: null,
  };
}

function buildBillingDocumentCell(row: BillingReconciliationReport["rows"][number]) {
  const { primaryLabel, secondaryLabel } = getBillingDocumentDisplay(row);
  const primary = buildDocumentHtml(primaryLabel, row.billingDocumentUrl);
  const secondary = secondaryLabel
    ? `<div style="margin-top:4px;font-size:10px;font-weight:400;color:#737373;">${escapeHtml(secondaryLabel)}</div>`
    : "";

  return `${primary}${secondary}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatBillingPeriod(start?: string | null, end?: string | null) {
  const formattedStart = formatShortDate(start);
  const formattedEnd = formatDate(end);
  if (formattedStart === "-" && formattedEnd === "-") return "-";
  return `${formattedStart} - ${formattedEnd}`;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount || 0);
}

function formatPlanAmount(amount: number, count: number, currency: string) {
  const perChargeAmount = count > 1 ? amount / count : amount;
  return `${formatAmount(perChargeAmount, currency)}${count > 1 ? " ea" : ""}`;
}

function getReportLabel(report: BillingReconciliationReport) {
  return report.periodLabel || report.monthLabel;
}

function buildPlanBadge(planName: string, tinted = false) {
  return `
    <span class="${tinted ? "planPill" : "badge"}">
      ${escapeHtml(planName)}
    </span>
  `;
}

function buildPlanBreakdownHtml(report: BillingReconciliationReport, currency: string) {
  if (report.summary.planBreakdown.length === 0) {
    return `<div style="font-size:14px;color:#737373;">No charges</div>`;
  }

  return report.summary.planBreakdown.map((entry) => `
    <div class="planMetric">
      <div class="planMetricTop">
        <span class="planCount">${escapeHtml(String(entry.count))}</span>
        <span class="planAmount">${escapeHtml(formatPlanAmount(entry.amount, entry.count, currency))}</span>
      </div>
      ${buildPlanBadge(entry.planName, true)}
    </div>
  `).join("");
}

export function buildBillingReconciliationBodyHtml(report: BillingReconciliationReport) {
  const primaryCurrency = report.rows[0]?.currency || "USD";
  const subscriptionRows = report.rows.filter((row) => row.rowType === "business");
  const agencyRows = report.rows.filter((row) => row.rowType === "agency_plan" || row.rowType === "agency_add_on");
  const planBreakdownHtml = buildPlanBreakdownHtml(report, primaryCurrency);
  const reportLabel = getReportLabel(report);

  const subscriptionRowsHtml = subscriptionRows.length === 0
    ? `<tr><td colspan="7" class="empty">No business subscription charges were found for ${escapeHtml(reportLabel)}.</td></tr>`
    : subscriptionRows.map((row) => `
        <tr>
          <td>
            <div class="business">${escapeHtml(row.businessName)}</div>
            ${row.matchStatus === "unmatched" ? '<span class="badge badgeWarning">Unmatched</span>' : ""}
          </td>
          <td>${buildPlanBadge(row.planName)}</td>
          <td>${escapeHtml(formatBillingPeriod(row.billingPeriodStart, row.billingPeriodEnd))}</td>
          <td>${escapeHtml(formatDate(row.lastBilledAt))}</td>
          <td>${escapeHtml(formatDate(row.nextBillingAt))}</td>
          <td class="invoice">${buildBillingDocumentCell(row)}</td>
          <td class="amount">${escapeHtml(formatAmount(row.amount, row.currency))}</td>
        </tr>
      `).join("");

  const agencyRowsHtml = agencyRows.map((row) => `
      <tr>
        <td><div class="business">${escapeHtml(row.planName)}</div></td>
        <td>${escapeHtml(row.detailLabel || (row.rowType === "agency_plan" ? "Agency-wide plan" : "-"))}</td>
        <td>${escapeHtml(formatDate(row.lastBilledAt))}</td>
        <td class="invoice">${buildBillingDocumentCell(row)}</td>
        <td class="amount">${escapeHtml(formatAmount(row.amount, row.currency))}</td>
      </tr>
    `).join("");

  return `
    <div class="page">
      <div class="reportHeader">
        <div class="headerTitleWrap">
          <div class="headerTitleGroup">
            <span class="receiptIcon">#</span>
            <div class="headerTitle">${escapeHtml(reportLabel)} Billing Report</div>
          </div>
          <span class="agencyBadge">${escapeHtml(report.agencyName)}</span>
        </div>
      </div>

      <div class="summaryGrid">
        <div class="summaryCard">
          <div class="summaryLabel">Total billed</div>
          <div class="summaryValue">${escapeHtml(formatAmount(report.summary.totalBilledAmount, primaryCurrency))}</div>
          <div class="summarySubtext">${report.summary.totalRows} charge${report.summary.totalRows === 1 ? "" : "s"} included in this reconciliation</div>
        </div>
        <div class="summaryCard">
          <div class="summaryLabel">Plans billed</div>
          <div class="planGrid">${planBreakdownHtml}</div>
        </div>
      </div>

      <div>
        <div class="sectionTitle">Business subscriptions</div>
        <div class="tableWrap">
          <table>
            <thead>
              <tr>
                <th class="colBusiness">Business Name</th>
                <th class="colPlan">Plan</th>
                <th class="colPeriod">Billing Period</th>
                <th class="colLastBilled">Last Billed</th>
                <th class="colNextBilling">Next Billing</th>
                <th class="colInvoice">Invoice</th>
                <th class="colAmount" style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${subscriptionRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      ${agencyRows.length > 0 ? `
        <div>
          <div class="sectionTitle">Agency-level billing</div>
          <div class="tableWrap">
            <table>
              <thead>
                <tr>
                  <th class="colAgencyItem">Item</th>
                  <th class="colAgencyDetail">Details</th>
                  <th class="colAgencyLastBilled">Last Billed</th>
                  <th class="colAgencyReference">Invoice/Receipt</th>
                  <th class="colAgencyAmount" style="text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${agencyRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}
