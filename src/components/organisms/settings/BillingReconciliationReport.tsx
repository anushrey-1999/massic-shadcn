"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableElement, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChartSpline,
  File,
  FileSpreadsheet,
  Gem,
  Loader2,
  Puzzle,
  ReceiptText,
  Target,
  Zap,
} from "lucide-react";
import type { BillingReconciliationReport as BillingReconciliationReportData } from "@/types/billing-reconciliation-types";
import { cn } from "@/lib/utils";

interface BillingReconciliationReportProps {
  report: BillingReconciliationReportData;
  onDownloadCsv: () => void;
  onDownloadPdf: () => void;
  onGenerateReport?: () => void;
  isDownloadingPdf?: boolean;
  isGeneratingReport?: boolean;
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

function getReportLabel(report: BillingReconciliationReportData) {
  return report.periodLabel || report.monthLabel;
}

function getPlanIcon(planName: string) {
  const normalizedPlanName = planName.toLowerCase();

  if (normalizedPlanName.includes("growth")) return Zap;
  if (normalizedPlanName.includes("starter")) return ChartSpline;
  if (normalizedPlanName.includes("core")) return Puzzle;
  if (normalizedPlanName.includes("opportunit")) return Target;
  if (normalizedPlanName.includes("execution") || normalizedPlanName.includes("credit")) return Gem;

  return Zap;
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
    <div className="min-w-0">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title="Click to open this billing document in Stripe"
          className="block truncate text-[#2563EB] transition hover:text-primary"
        >
          {primaryLabel}
        </a>
      ) : (
        <span className="block truncate">{primaryLabel}</span>
      )}
      {secondaryLabel ? (
        <div className="truncate text-[10px] font-normal leading-normal tracking-[0.15px] text-muted-foreground">
          {secondaryLabel}
        </div>
      ) : null}
    </div>
  );
}

function PlanBadge({
  planName,
  className,
  tinted = false,
}: {
  planName: string;
  className?: string;
  tinted?: boolean;
}) {
  const Icon = getPlanIcon(planName);

  return (
    <Badge
      variant="secondary"
      className={cn(
        "inline-flex min-h-6 gap-1.5 rounded-lg border-0 px-2 py-[3px] text-[10px] font-medium leading-normal tracking-[0.15px] text-muted-foreground",
        tinted ? "bg-[#418770]/10 hover:bg-[#418770]/10" : "bg-secondary hover:bg-secondary",
        className
      )}
    >
      <Icon className="size-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{planName}</span>
    </Badge>
  );
}

export function BillingReconciliationReport({
  report,
  onDownloadCsv,
  onDownloadPdf,
  onGenerateReport,
  isDownloadingPdf = false,
  isGeneratingReport = false,
}: BillingReconciliationReportProps) {
  const primaryCurrency = report.rows[0]?.currency || "USD";
  const subscriptionRows = report.rows.filter((row) => row.rowType === "business");
  const agencyRows = report.rows.filter((row) => row.rowType === "agency_plan" || row.rowType === "agency_add_on");
  const reportLabel = getReportLabel(report);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-start justify-between px-6 pb-6 pr-16 pt-9">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ReceiptText className="size-[29px] shrink-0 text-foreground" />
            <h2 className="truncate text-2xl font-semibold leading-[1.2] tracking-[-0.48px] text-foreground">
              {reportLabel} Billing Report
            </h2>
          </div>
          <Badge
            variant="secondary"
            className="min-h-6 shrink-0 rounded-lg border-0 px-2 py-[3px] text-xs font-medium leading-normal tracking-[0.18px]"
          >
            {report.agencyName}
          </Badge>
        </div>

        {onGenerateReport ? (
          <Button
            onClick={onGenerateReport}
            disabled={isGeneratingReport}
            className="min-h-9 shrink-0 rounded-lg px-4 py-[7.5px] text-sm font-medium"
          >
            {isGeneratingReport ? "Generating..." : "Generate New Report"}
          </Button>
        ) : null}
      </div>

      <div className="h-px shrink-0 bg-border" />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-2.5 lg:grid-cols-[294px_minmax(0,1fr)]">
            <div className="rounded-xl border border-border bg-[#418770]/5 px-4 py-3">
              <div className="font-mono text-xs font-normal leading-normal text-muted-foreground">
                TOTAL BILLED
              </div>
              <div className="mt-2 text-2xl font-semibold leading-[1.2] tracking-[-0.48px] text-foreground">
                {formatAmount(report.summary.totalBilledAmount, primaryCurrency)}
              </div>
              <div className="mt-2 text-[10px] font-medium leading-normal tracking-[0.15px] text-secondary-foreground">
                {report.summary.totalRows} charge{report.summary.totalRows === 1 ? "" : "s"} included in this reconciliation
              </div>
            </div>

            <div className="rounded-xl border border-border bg-[#418770]/5 px-4 py-3">
              <div className="font-mono text-xs font-normal leading-normal text-muted-foreground">
                PLANS BILLED
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {report.summary.planBreakdown.length > 0 ? (
                  report.summary.planBreakdown.map((entry) => (
                    <div key={entry.planName} className="min-w-0 space-y-1">
                      <div className="flex items-end gap-1">
                        <span className="text-2xl font-semibold leading-[1.2] tracking-[-0.48px] text-foreground">
                          {entry.count}
                        </span>
                        <span className="pb-0.5 text-[10px] font-normal leading-normal tracking-[0.15px] text-[#A3A3A3]">
                          {formatPlanAmount(entry.amount, entry.count, primaryCurrency)}
                        </span>
                      </div>
                      <PlanBadge planName={entry.planName} tinted className="w-full justify-center" />
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No charges</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-base font-medium leading-normal text-foreground">
              Business subscriptions
            </div>

            <Table className="rounded-lg border border-border">
              <TableElement className="table-fixed min-w-[872px]">
                <TableHeader>
                  <TableRow className="h-[33px] bg-background">
                    <TableHead className="w-[158px] px-2 py-[7.5px] text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Business Name</TableHead>
                    <TableHead className="w-[128px] px-2 py-[7.5px] text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Plan</TableHead>
                    <TableHead className="w-[140px] px-2 py-[7.5px] text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Billing Period</TableHead>
                    <TableHead className="w-[128px] px-2 py-[7.5px] text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Last Billed</TableHead>
                    <TableHead className="w-[128px] px-2 py-[7.5px] text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Next Billing</TableHead>
                    <TableHead className="w-[128px] px-2 py-[7.5px] text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Invoice</TableHead>
                    <TableHead className="w-[62px] px-2 py-[7.5px] text-right text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 px-2 text-center text-sm text-muted-foreground">
                        No business subscription charges were found for {reportLabel}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptionRows.map((row) => {
                      const documentDisplay = getBillingDocumentDisplay(row);

                      return (
                        <TableRow key={`${row.invoiceId}-${row.stripeSubscriptionItemId || row.invoiceNumber}-${row.businessName}`} className="h-9">
                          <TableCell className="px-2 py-1.5 text-xs font-medium leading-normal tracking-[0.18px] text-secondary-foreground">
                            <div className="truncate">{row.businessName}</div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5">
                            <PlanBadge planName={row.planName} />
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-xs font-normal leading-normal tracking-[0.18px] text-muted-foreground">
                            <div className="truncate">{formatBillingPeriod(row.billingPeriodStart, row.billingPeriodEnd)}</div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-xs font-normal leading-normal tracking-[0.18px] text-muted-foreground">
                            <div className="truncate">{formatDate(row.lastBilledAt)}</div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-xs font-normal leading-normal tracking-[0.18px] text-muted-foreground">
                            <div className="truncate">{formatDate(row.nextBillingAt)}</div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-xs font-normal leading-normal tracking-[0.18px]">
                            <BillingDocumentLink
                              primaryLabel={documentDisplay.primaryLabel}
                              secondaryLabel={documentDisplay.secondaryLabel}
                              url={row.billingDocumentUrl}
                            />
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right text-xs font-medium leading-normal tracking-[0.18px] text-secondary-foreground">
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
            <div className="space-y-2.5">
              <div className="text-base font-medium leading-normal text-foreground">
                Agency-level billing
              </div>

              <Table className="rounded-lg border border-border">
                <TableElement className="table-fixed min-w-[872px]">
                  <TableHeader>
                    <TableRow className="h-[33px] bg-background">
                      <TableHead className="w-[187px] px-2 py-[7.5px] text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Item</TableHead>
                      <TableHead className="w-[250px] px-2 py-[7.5px] text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Details</TableHead>
                      <TableHead className="w-[187px] px-2 py-[7.5px] text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Last Billed</TableHead>
                      <TableHead className="w-[187px] px-2 py-[7.5px] text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Invoice/Receipt</TableHead>
                      <TableHead className="w-[62px] px-2 py-[7.5px] text-right text-xs font-medium leading-normal tracking-[0.18px] text-[#A3A3A3]">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agencyRows.map((row) => {
                      const documentDisplay = getBillingDocumentDisplay(row);

                      return (
                        <TableRow key={`${row.invoiceId}-${row.planName}`} className="h-[30px]">
                          <TableCell className="px-2 py-1.5 text-xs font-medium leading-normal tracking-[0.18px] text-secondary-foreground">
                            <div className="truncate">{row.planName}</div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-xs font-normal leading-normal tracking-[0.18px] text-muted-foreground">
                            <div className="truncate">{row.detailLabel || (row.rowType === "agency_plan" ? "Agency-wide plan" : "-")}</div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-xs font-normal leading-normal tracking-[0.18px] text-muted-foreground">
                            <div className="truncate">{formatDate(row.lastBilledAt)}</div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-xs font-normal leading-normal tracking-[0.18px]">
                            <BillingDocumentLink
                              primaryLabel={documentDisplay.primaryLabel}
                              secondaryLabel={documentDisplay.secondaryLabel}
                              url={row.billingDocumentUrl}
                            />
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right text-xs font-medium leading-normal tracking-[0.18px] text-secondary-foreground">
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
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-3 bg-background px-6 py-4">
        <Button
          variant="secondary"
          onClick={onDownloadCsv}
          className="min-h-10 rounded-lg px-6 py-[9.5px] text-sm font-medium"
        >
          <FileSpreadsheet className="mr-2 size-[13.25px]" />
          Download CSV
        </Button>
        <Button
          variant="secondary"
          onClick={onDownloadPdf}
          disabled={isDownloadingPdf}
          className="min-h-10 rounded-lg px-6 py-[9.5px] text-sm font-medium"
        >
          {isDownloadingPdf ? (
            <Loader2 className="mr-2 size-[13.25px] animate-spin" />
          ) : (
            <File className="mr-2 size-[13.25px]" />
          )}
          Download PDF
        </Button>
      </div>
    </div>
  );
}
