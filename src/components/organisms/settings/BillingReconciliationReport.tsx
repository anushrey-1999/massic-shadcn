"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableElement, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import type { BillingReconciliationReport as BillingReconciliationReportData } from "@/types/billing-reconciliation-types";

interface BillingReconciliationReportProps {
  report: BillingReconciliationReportData;
  onDownloadCsv: () => void;
  onDownloadPdf: () => void;
  isDownloadingPdf?: boolean;
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

function getBillingDocumentDisplay(row: BillingReconciliationReportData["rows"][number]) {
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

function BillingDocumentLink({
  primaryLabel,
  secondaryLabel,
  url,
}: {
  primaryLabel: string;
  secondaryLabel?: string | null;
  url?: string | null;
}) {
  return (
    <div className="space-y-1">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title="Click to open this billing document in Stripe"
          className="inline-flex underline decoration-dotted underline-offset-4 transition hover:text-primary"
        >
          {primaryLabel}
        </a>
      ) : (
        <span>{primaryLabel}</span>
      )}
      {secondaryLabel ? (
        <div className="text-xs font-normal text-muted-foreground">
          {secondaryLabel}
        </div>
      ) : null}
    </div>
  );
}

export function BillingReconciliationReport({
  report,
  onDownloadCsv,
  onDownloadPdf,
  isDownloadingPdf = false,
}: BillingReconciliationReportProps) {
  const primaryCurrency = report.rows[0]?.currency || "USD";
  const subscriptionRows = report.rows.filter((row) => row.rowType === "business");
  const agencyRows = report.rows.filter((row) => row.rowType === "agency_plan" || row.rowType === "agency_add_on");

  return (
    <Card className="border border-muted/40 shadow-sm">
      <CardHeader className="space-y-4 border-b border-border/50 pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              {report.agencyName} - {report.monthLabel}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Subscription billing reconciliation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownloadCsv}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button size="sm" onClick={onDownloadPdf} disabled={isDownloadingPdf}>
              {isDownloadingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-5">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-foreground">Business subscriptions</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Monthly subscription charges tied to individual businesses.
            </div>
          </div>

          <Table className="rounded-xl border border-border/60">
            <TableElement className="table-fixed min-w-[980px]">
              <TableHeader>
                <TableRow className="bg-[#F7F3EB]">
                  <TableHead className="w-[22%] px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Business</TableHead>
                  <TableHead className="w-[160px] px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Plan</TableHead>
                  <TableHead className="w-[19%] px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Billing Period</TableHead>
                  <TableHead className="w-[12%] px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Last Billed</TableHead>
                  <TableHead className="w-[12%] px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Next Billing</TableHead>
                  <TableHead className="w-[15%] px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Invoice</TableHead>
                  <TableHead className="w-[100px] px-4 py-3 text-right text-xs uppercase tracking-[0.08em] text-muted-foreground">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No business subscription charges were found for {report.monthLabel}.
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptionRows.map((row) => {
                    const documentDisplay = getBillingDocumentDisplay(row);
                    return (
                    <TableRow key={`${row.invoiceId}-${row.stripeSubscriptionItemId || row.invoiceNumber}-${row.businessName}`}>
                      <TableCell className="px-4 py-4 align-top">
                        <div className="font-medium text-foreground">{row.businessName}</div>
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top">
                        <Badge
                          variant="secondary"
                          className="inline-flex max-w-full whitespace-normal break-words rounded-full bg-[#F7F3EB] px-3 py-1 text-center text-xs font-medium leading-tight text-foreground hover:bg-[#F7F3EB]"
                        >
                          {row.planName}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top text-sm text-muted-foreground">
                        {formatBillingPeriod(row.billingPeriodStart, row.billingPeriodEnd)}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top text-sm text-muted-foreground">
                        {formatDate(row.lastBilledAt)}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top text-sm text-muted-foreground">
                        {formatDate(row.nextBillingAt)}
                      </TableCell>
                      <TableCell className="break-all px-4 py-4 align-top text-sm font-medium text-foreground">
                        <BillingDocumentLink
                          primaryLabel={documentDisplay.primaryLabel}
                          secondaryLabel={documentDisplay.secondaryLabel}
                          url={row.billingDocumentUrl}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right align-top text-sm font-semibold text-foreground">
                        {formatAmount(row.amount, row.currency)}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </TableElement>
          </Table>
        </div>

        {agencyRows.length > 0 ? (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-foreground">Agency-level billing</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Add-ons and agency-wide charges like Massic Opportunities and Execution Credits.
              </div>
            </div>

            <Table className="rounded-xl border border-border/60">
              <TableElement className="table-fixed min-w-[760px]">
                <TableHeader>
                  <TableRow className="bg-[#F7F3EB]">
                    <TableHead className="w-[24%] px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Item</TableHead>
                    <TableHead className="w-[31%] px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Details</TableHead>
                    <TableHead className="w-[15%] px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Last Billed</TableHead>
                    <TableHead className="w-[18%] px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Invoice/Receipt</TableHead>
                    <TableHead className="w-[12%] px-4 py-3 text-right text-xs uppercase tracking-[0.08em] text-muted-foreground">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencyRows.map((row) => {
                    const documentDisplay = getBillingDocumentDisplay(row);
                    return (
                      <TableRow key={`${row.invoiceId}-${row.planName}`}>
                      <TableCell className="px-4 py-4 align-top">
                        <div className="font-medium text-foreground">{row.planName}</div>
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top text-sm text-muted-foreground">
                        {row.detailLabel || (row.rowType === "agency_plan" ? "Agency-wide plan" : "-")}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top text-sm text-muted-foreground">
                        {formatDate(row.lastBilledAt)}
                      </TableCell>
                      <TableCell className="break-all px-4 py-4 align-top text-sm font-medium text-foreground">
                        <BillingDocumentLink
                          primaryLabel={documentDisplay.primaryLabel}
                          secondaryLabel={documentDisplay.secondaryLabel}
                          url={row.billingDocumentUrl}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right align-top text-sm font-semibold text-foreground">
                        {formatAmount(row.amount, row.currency)}
                      </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </TableElement>
            </Table>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-[#F7F3EB] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Total billed - {report.summary.reportMonthLabel}
            </div>
            <div className="mt-3 text-3xl font-semibold text-foreground">
              {formatAmount(report.summary.totalBilledAmount, primaryCurrency)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {report.summary.totalRows} charge{report.summary.totalRows === 1 ? "" : "s"} included in this reconciliation
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-[#F7F3EB] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Plans billed - {report.summary.reportMonthLabel}
            </div>
            <div className="mt-3 text-3xl font-semibold text-foreground">
              {report.summary.planBreakdown.length > 0
                ? report.summary.planBreakdown.map((entry) => `${entry.count} ${entry.planName}`).join(" · ")
                : "No charges"}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {report.summary.planBreakdown.length > 0
                ? report.summary.planBreakdown.map((entry) => `${formatAmount(entry.amount, primaryCurrency)} × ${entry.count}`).join(" · ")
                : "No paid subscription charges in this month"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
