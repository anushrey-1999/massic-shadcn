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
    color: #171717;
    padding: 20px;
  }

  .page {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .headerTitle {
    font-size: 24px;
    line-height: 1.2;
    font-weight: 700;
  }

  .headerSubtitle {
    margin-top: 6px;
    font-size: 14px;
    color: #737373;
  }

  .monthPill {
    border: 1px solid #e7e5e4;
    border-radius: 12px;
    background: #ffffff;
    padding: 12px 14px;
    font-size: 15px;
    font-weight: 500;
  }

  .tableWrap {
    border: 1px solid #e7e5e4;
    border-radius: 16px;
    overflow: hidden;
  }

  .sectionTitle {
    font-size: 14px;
    font-weight: 700;
    color: #171717;
  }

  .sectionSubtitle {
    margin-top: 4px;
    font-size: 12px;
    color: #737373;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  thead tr {
    background: #f7f3eb;
  }

  th {
    text-align: left;
    padding: 14px 10px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #737373;
  }

  td {
    padding: 14px 10px;
    border-top: 1px solid #f0eeea;
    vertical-align: top;
    font-size: 12px;
    color: #57534e;
    overflow-wrap: break-word;
    word-break: break-word;
  }

  .colBusiness { width: 22%; }
  .colPlan { width: 11%; }
  .colPeriod { width: 18%; }
  .colLastBilled { width: 12%; }
  .colNextBilling { width: 12%; }
  .colInvoice { width: 14%; }
  .colAmount { width: 11%; }
  .colAgencyItem { width: 24%; }
  .colAgencyDetail { width: 31%; }
  .colAgencyLastBilled { width: 15%; }
  .colAgencyReference { width: 18%; }
  .colAgencyAmount { width: 12%; }

  .business {
    font-size: 13px;
    font-weight: 600;
    color: #171717;
  }

  .badge {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid #e7e5e4;
    background: #f7f3eb;
    font-size: 10px;
    color: #171717;
    font-weight: 600;
  }

  .badgeWarning {
    border-color: #fde68a;
    background: #fffbeb;
    color: #92400e;
  }

  .invoice {
    color: #171717;
    font-weight: 600;
    font-size: 11px;
  }

  .amount {
    text-align: right;
    color: #171717;
    font-weight: 700;
    font-size: 12px;
    white-space: nowrap;
  }

  .empty {
    padding: 28px 16px;
    text-align: center;
    color: #737373;
    font-size: 14px;
  }

  .summaryGrid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .summaryCard {
    border: 1px solid #e7e5e4;
    border-radius: 16px;
    background: #f7f3eb;
    padding: 20px;
  }

  .summaryLabel {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #737373;
  }

  .summaryValue {
    margin-top: 10px;
    font-size: 30px;
    line-height: 1.1;
    color: #171717;
    font-weight: 700;
    word-break: break-word;
  }

  .summarySubtext {
    margin-top: 8px;
    font-size: 13px;
    color: #737373;
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

  return `<a href="${escapeHtml(url)}" style="color:#171717;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;">${safeLabel}</a>`;
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

function formatBillingPeriod(start?: string | null, end?: string | null) {
  const formattedStart = formatDate(start);
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

export function buildBillingReconciliationBodyHtml(report: BillingReconciliationReport) {
  const primaryCurrency = report.rows[0]?.currency || "USD";
  const subscriptionRows = report.rows.filter((row) => row.rowType === "business" || row.rowType === "unmatched");
  const agencyRows = report.rows.filter((row) => row.rowType === "agency_plan" || row.rowType === "agency_add_on");

  const subscriptionRowsHtml = subscriptionRows.length === 0
    ? `<tr><td colspan="7" class="empty">No business subscription charges were found for ${escapeHtml(report.monthLabel)}.</td></tr>`
    : subscriptionRows.map((row) => `
        <tr>
          <td>
            <div class="business">${escapeHtml(row.businessName)}</div>
            ${row.matchStatus === "unmatched" ? '<span class="badge badgeWarning">Unmatched</span>' : ""}
          </td>
          <td><span class="badge">${escapeHtml(row.planName)}</span></td>
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

  const planBreakdownText = report.summary.planBreakdown.length > 0
    ? report.summary.planBreakdown.map((entry) => `${entry.count} ${entry.planName}`).join(" · ")
    : "No charges";

  const planBreakdownAmounts = report.summary.planBreakdown.length > 0
    ? report.summary.planBreakdown.map((entry) => `${formatAmount(entry.amount, primaryCurrency)} × ${entry.count}`).join(" · ")
    : "No paid subscription charges in this month";

  return `
    <div class="page">
      <div>
        <div class="headerTitle">${escapeHtml(report.agencyName)} - ${escapeHtml(report.monthLabel)}</div>
        <div class="headerSubtitle">Subscription billing reconciliation</div>
      </div>

      <div class="monthPill">${escapeHtml(report.monthLabel)}</div>

      <div>
        <div class="sectionTitle">Business subscriptions</div>
        <div class="sectionSubtitle">Monthly subscription charges tied to individual businesses.</div>
      </div>
      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th class="colBusiness">Business</th>
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

      ${agencyRows.length > 0 ? `
        <div>
          <div class="sectionTitle">Agency-level billing</div>
          <div class="sectionSubtitle">Add-ons and agency-wide charges like Massic Opportunities and Execution Credits.</div>
        </div>
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
      ` : ""}

      <div class="summaryGrid">
        <div class="summaryCard">
          <div class="summaryLabel">Total billed - ${escapeHtml(report.summary.reportMonthLabel)}</div>
          <div class="summaryValue">${escapeHtml(formatAmount(report.summary.totalBilledAmount, primaryCurrency))}</div>
          <div class="summarySubtext">${report.summary.totalRows} charge${report.summary.totalRows === 1 ? "" : "s"} included in this reconciliation</div>
        </div>

        <div class="summaryCard">
          <div class="summaryLabel">Plans billed - ${escapeHtml(report.summary.reportMonthLabel)}</div>
          <div class="summaryValue">${escapeHtml(planBreakdownText)}</div>
          <div class="summarySubtext">${escapeHtml(planBreakdownAmounts)}</div>
        </div>
      </div>
    </div>
  `;
}
