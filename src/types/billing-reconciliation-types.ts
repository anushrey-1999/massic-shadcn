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

export interface BillingReconciliationRow {
  rowType: BillingReconciliationRowType;
  businessName: string;
  planName: string;
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

export interface BillingReconciliationPlanBreakdown {
  planName: string;
  count: number;
  amount: number;
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
  rows: BillingReconciliationRow[];
  summary: BillingReconciliationSummary;
}
