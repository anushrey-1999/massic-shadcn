export type AdminAvailabilityState = "available" | "partial" | "unavailable";

export interface AdminAvailability {
  state: AdminAvailabilityState;
  reason: string | null;
}

export interface AdminRange {
  key: AdminRangeKey;
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
}

export type AdminRangeKey =
  | "last_7_days"
  | "last_28_days"
  | "mtd"
  | "last_month"
  | "qtd"
  | "ytd"
  | "lifetime";

export type AdminModuleKey =
  | "network-performance"
  | "growth"
  | "api-cost"
  | "industry"
  | "category-insights"
  | "platform-totals"
  | "subscription";

export interface AdminKpi {
  key: string;
  label: string;
  value: number | null;
  previous: number | null;
  changePct: number | null;
  trend: Array<{ date: string; value: number }>;
  availability: AdminAvailability;
  contextLabel?: string;
}

export interface AdminBreakdownRow {
  group: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
  changePct: number | null;
  sharePct: number;
  trend: number[];
}

export interface AdminModuleData {
  meta: {
    module: AdminModuleKey;
    label: string;
    range: AdminRange;
    freshnessDate: string | null;
    completedAt: string | null;
    watermark: string;
    metric: string;
    groupBy: string;
    sourceFreshness?: AdminSourceFreshness;
    cacheState?: AdminCacheState;
    entityStatus?: "strong" | "dip" | "check" | "no_signal";
    scope?: "lifetime_llm";
  };
  kpis: AdminKpi[];
  breakdown: {
    rows: AdminBreakdownRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  apiCost?: AdminApiCostData;
  subscription?: AdminSubscriptionData;
}

export interface AdminSubscriptionSummary {
  snapshotDate: string | null;
  mrr: number;
  arr: number;
  newMrr: number;
  retainedMrr: number;
  payingAgencies: number;
  activeBusinessPlans: number;
  activeAgencyPlans: number;
  executionCreditRevenue: number;
  previousExecutionCreditRevenue: number;
}

export interface AdminSubscriptionRecurringRow {
  scope: "business" | "agency" | "unknown";
  planKey: string;
  planLabel: string;
  activeCount: number;
  mrr: number;
  arr: number;
  newMrr: number;
  retainedMrr: number;
}

export interface AdminExecutionCreditAgency {
  agencyId: string | null;
  agencyName: string;
  revenue: number;
  refunded: number;
  credits: number;
  purchases: number;
}

export interface AdminSubscriptionData {
  summary: AdminSubscriptionSummary | null;
  recurringBreakdown: AdminSubscriptionRecurringRow[];
  executionCredits: {
    totalRevenue: number;
    totalRefunded: number;
    totalCredits: number;
    purchases: number;
    agencies: AdminExecutionCreditAgency[];
  };
  coverage: {
    available: boolean;
    reason: string | null;
    accountId: string | null;
    livemode: boolean | null;
    lastSuccessfulSync: string | null;
    unresolvedCount: number;
    currency: string;
    cronEnabled?: boolean;
  };
  stripeDashboardUrl: string;
}

export interface AdminApiCostProvider {
  key: "api_cost_openai" | "api_cost_anthropic";
  label: string;
  cost: number;
  sharePct: number;
}

export interface AdminApiCostBusiness {
  businessId: string;
  businessName: string | null;
  website: string | null;
  displayName: string;
  agencyId: string | null;
  agencyName: string | null;
  isPitch: boolean;
  cost: number;
  percentOfTotal: number;
  attributed: boolean;
}

export interface AdminApiCostWorkflow {
  workflowName: string;
  displayName: string;
  cost: number;
  percentOfTotal: number;
}

export interface AdminApiCostAgency {
  agencyId: string | null;
  agencyName: string | null;
  displayName: string;
  cost: number;
  percentOfTotal: number;
  businessCount: number;
  attributed: boolean;
}

export interface AdminCostRankRow {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
  siteUrl?: string | null;
  cost: number;
  sharePct: number;
}

export interface AdminApiCostData {
  scope: "lifetime_llm";
  fetchedAt: string;
  coverage: string;
  trackedBusinessCount: number;
  providers: AdminApiCostProvider[];
  businesses: AdminApiCostBusiness[];
  workflows: AdminApiCostWorkflow[];
  agencies: AdminApiCostAgency[];
  agencyAttributionAvailable: boolean;
  unattributedCost: number;
  unknownBusinessCost: number;
  reconciliation: {
    businessBreakdownTotal: number;
    inferTotalCost: number;
    delta: number;
  };
}

export interface AdminSourceFreshness {
  gscThrough: string | null;
  ga4Through: string | null;
}

export type AdminCacheState = "fresh" | "stale";

export interface AdminIndustrySyncRun {
  id: string;
  trigger: "manual" | "scheduled";
  status: "queued" | "running" | "completed" | "partial" | "failed";
  requestedBy: string | null;
  totalBusinesses: number;
  resolvedCount: number;
  missingCount: number;
  errorCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  errorDetails: Array<{ message: string; source?: string }> | null;
}

export interface AdminBusiness {
  business_id: string;
  business_name: string;
  website: string | null;
  agency_id: string | null;
  agency_name: string | null;
  industry: string;
  cms: string;
  state: string;
  country: string;
  plan: string;
  subscription_state: string | null;
  connected_gsc: boolean;
  connected_ga4: boolean;
  connected_gbp: boolean;
  connected_cms: boolean;
  publishing_enabled: boolean;
  freshness_date: string | null;
  impressions: number | null;
  clicks: number | null;
  organic_users: number | null;
  goals: number | null;
  status: "strong" | "dip" | "check" | "no_signal";
  mrr: number | null;
  billing_plan?: string | null;
  access_type?: "paid" | "trial" | "whitelisted" | "no_plan";
  is_whitelisted?: boolean;
  trial_end_date?: string | null;
}

export interface AdminBusinessesData {
  rows: AdminBusiness[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  analyticsRange: {
    start: string;
    end: string;
    days: number;
  };
}

export interface AdminSessionUser {
  userId: number;
  email: string;
  name: string;
  role: "SUPER_ADMIN";
  grantId: number;
}

export interface AdminOverviewData {
  meta: {
    freshnessDate: string | null;
    completedAt: string | null;
    watermark: string;
    sourceFreshness?: AdminSourceFreshness;
    cacheState?: AdminCacheState;
  };
  network: AdminModuleData;
  growth: AdminModuleData;
  platform: AdminModuleData;
  subscription: AdminModuleData;
  businesses: AdminBusinessesData;
}
