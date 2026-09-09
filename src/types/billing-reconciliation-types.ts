export type BillingReconciliationRowType =
  | "business"
  | "agency_plan"
  | "agency_add_on"
  | "unmatched";

export type BillingReconciliationMatchStatus =
  | "matched_business"
  | "matched_agency_plan"
  | "matched_agency_add_on"
  | "unmatched";

export type BillingReconciliationPeriod =
  | "month"
  | "last_quarter"
  | "this_quarter"
  | "year_to_date"
  | "all_time";

export type BillingReconciliationChargeType = "recurring" | "upgrade";

export interface BillingReconciliationRow {
  rowType: BillingReconciliationRowType;
  businessName: string;
  planName: string;
  chargeType?: BillingReconciliationChargeType | null;
  detailLabel?: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  lastBilledAt: string | null;
  nextBillingAt: string | null;
  invoiceNumber: string;
  invoiceId: string;
  billingDocumentLabel?: string | null;
  billingDocumentUrl?: string | null;
  amount: number;
  currency: string;
  stripeSubscriptionId: string | null;
  stripeSubscriptionItemId: string | null;
  matchStatus: BillingReconciliationMatchStatus;
}

export interface BillingReconciliationPlanAmountBreakdown {
  unitAmount: number;
  count: number;
}

export interface BillingReconciliationPlanBreakdown {
  planName: string;
  count: number;
  amount: number;
  amountBreakdown?: BillingReconciliationPlanAmountBreakdown[];
}

export interface BillingReconciliationSummary {
  reportMonthLabel: string;
  totalBilledAmount: number;
  totalRows: number;
  planBreakdown: BillingReconciliationPlanBreakdown[];
}

export interface BillingReconciliationReport {
  agencyName: string;
  month: string;
  monthLabel: string;
  period?: BillingReconciliationPeriod;
  periodLabel?: string;
  startDate?: string | null;
  endDate?: string | null;
  rows: BillingReconciliationRow[];
  summary: BillingReconciliationSummary;
}
