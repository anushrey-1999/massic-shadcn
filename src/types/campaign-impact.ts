export const CAMPAIGN_TYPES = [
  "tv", "radio", "streaming_ctv", "print", "outdoor_billboard", "direct_mail",
  "sponsorship", "event", "pr_earned_media", "influencer_creator", "other",
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPES)[number];
export type CampaignEventKind = "date_range" | "one_time";
export type CampaignStatus = "scheduled" | "live" | "collecting_data" | "impact_ready" | "complete" | "partial_data" | "unavailable";
export interface CampaignTrackedTerm { display: string; normalized: string }
export interface CampaignWindow { start: string; end: string; days: number; label?: string }

export interface CampaignEvent {
  id: string; businessId: string; name: string; campaignType: CampaignType; campaignTypeLabel?: string;
  eventKind: CampaignEventKind; startDate: string; endDate: string | null;
  notes: string | null; spendAmount: number | null; currencyCode: string | null;
  trackedTerms: CampaignTrackedTerm[]; gbpLocationNames: string[] | null;
  version: number; status?: CampaignStatus; contaminationCount?: number; hasOverlap?: boolean;
  impactSummary?: string; dataThrough?: string | null;
  performanceSummaries?: CampaignListPerformance[];
  performanceTrend?: CampaignListTrend | null;
  snapshots?: CampaignSnapshot[]; createdAt: string; updatedAt: string;
}

export interface CampaignListPerformance {
  metricKey: "branded_clicks" | "search_clicks" | "sessions" | "key_events"; label: string; source: "gsc" | "ga4";
  baseline: number; value: number;
  absoluteChange: number | null; liftPercent: number | null;
  reportabilityReason: string | null;
}

export interface CampaignListTrendPoint {
  date: string; value: number; phase: "baseline" | "campaign";
}

export interface CampaignListTrend {
  label: string; referenceDate: string; points: CampaignListTrendPoint[];
}

export interface CampaignInput {
  businessId: string; name: string; campaignType: CampaignType; eventKind: CampaignEventKind;
  startDate: string; endDate: string | null; notes?: string; spendAmount?: string | number | null;
  currencyCode?: string | null; trackedTerms?: string[]; gbpLocationNames?: string[] | null;
  editingCampaignId?: string;
}

export interface CampaignPreview {
  status: CampaignStatus;
  windows: { baseline: CampaignWindow | null; primary: CampaignWindow | null; post: CampaignWindow | null; isOngoing: boolean };
  contamination: CampaignContamination[];
}

export interface CampaignContamination {
  source: "campaign"; campaignId: string; name: string; campaignType: CampaignType;
  startDate: string; endDate: string | null; window: "baseline" | "campaign" | "post_campaign"; message: string;
}

export interface CampaignImpactMetric {
  key: string; label: string; unit: "count" | "currency"; availability: string;
  baseline: number | null; primary: number | null; post: number | null;
  absoluteChange: number | null; liftPercent: number | null; reportable: boolean; reportabilityReason: string | null;
}

export interface CampaignImpactSource {
  source: "gsc" | "ga4" | "gbp"; status: string; message: string | null;
  dataThrough: string | null; availableFrom: string | null; metrics: CampaignImpactMetric[];
  topEvents?: Array<{ name: string; total: number }>; locations?: Array<{ name: string; status: string }>;
}

export interface CampaignImpactChartPoint {
  date: string;
  phase: "before" | "during" | "after";
  sessions: number | null;
  clicks: number | null;
  keyEvents: number | null;
}

export type CampaignPresentationTone = "positive" | "negative" | "warning" | "info" | "neutral";
export interface CampaignPresentationChange { text: string; tone: CampaignPresentationTone }
export interface CampaignPresentationHighlight {
  source: CampaignImpactSource["source"]; key: string; label: string; valueText: string; change: CampaignPresentationChange;
}
export interface CampaignPresentationWindow {
  key: "baseline" | "primary" | "post"; label: string; start: string | null; end: string | null;
  days: number | null; dateText: string;
}
export interface CampaignPresentationMetric {
  key: string; label: string; baselineText: string; primaryText: string; postText: string;
  change: CampaignPresentationChange; postChange?: CampaignPresentationChange;
}
export interface CampaignPresentationSource {
  key: CampaignImpactSource["source"]; label: string; status: { label: string; tone: CampaignPresentationTone };
  dataThroughText: string; message: string | null; metrics: CampaignPresentationMetric[];
}
export interface CampaignImpactPresentation {
  version: 1; status: { label: string; tone: CampaignPresentationTone }; campaignTypeLabel: string;
  eventKindLabel: string; dateText: string; comparisonDescription: string; primaryColumnLabel: "Impact" | "During";
  hasPostPeriod: boolean;
  highlights: CampaignPresentationHighlight[]; windows: CampaignPresentationWindow[];
  details: { notes: string | null; spendText: string | null; trackedTermsText: string | null; locationsText: string | null };
  hasDetails: boolean; sources: CampaignPresentationSource[];
}

export interface CampaignImpactReport {
  campaign: CampaignEvent; status: CampaignStatus; lifecycleStatus: CampaignStatus;
  windows: CampaignPreview["windows"]; chartSeries: CampaignImpactChartPoint[];
  dataThrough: string | null; sources: CampaignImpactSource[];
  contamination: CampaignContamination[]; narratives: string[];
  methodology: { postCampaignMaximumDays: number; lowVolumeRule: string; timezoneNote: string; ga4CurrencyNote: string; gscNote: string };
  disclaimer: string; generatedAt: string; presentation: CampaignImpactPresentation;
}

export interface CampaignSnapshot {
  id: string; deliveryStatus: "pending" | "sent" | "failed"; recipients: string[];
  sentAt: string | null; createdAt: string;
}

export interface CampaignApiResponse<T> { success: boolean; data: T; meta?: Record<string, unknown> }
