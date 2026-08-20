"use client";

import * as React from "react";
import { AlertCircle, ArrowLeft, Download, Edit3, Info, Loader2, Mail, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MultiEmailInput } from "@/components/molecules/MultiEmailInput";
import { CampaignFormSheet } from "@/components/organisms/campaign-impact/CampaignFormSheet";
import { CampaignImpactReportSkeleton } from "@/components/organisms/campaign-impact/CampaignImpactReportSkeleton";
import { CampaignOverlapWarning } from "@/components/organisms/campaign-impact/CampaignOverlapWarning";
import { ProductIcon } from "@/components/organisms/access-request/ProductIcon";
import { PRODUCT_CONFIG } from "@/config/access-request";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { downloadCampaignImpactPdf, useCampaignEvent, useCampaignImpactReport, useCampaignMutations } from "@/hooks/use-campaign-impact";
import { useCan } from "@/hooks/use-permissions";
import { campaignApiError, campaignLocationOptions, formatCampaignDate, formatCampaignDateRange } from "@/lib/campaign-impact";
import { captureCampaignImpactEvent } from "@/lib/analytics/posthog-client";
import type {
  CampaignImpactPresentation,
  CampaignImpactSource,
  CampaignPresentationChange,
  CampaignPresentationMetric,
  CampaignPresentationTone,
  CampaignPresentationWindow,
} from "@/types/campaign-impact";

const TONE_TEXT: Record<CampaignPresentationTone, string> = {
  positive: "text-green-700",
  negative: "text-red-700",
  warning: "text-amber-800",
  info: "text-blue-700",
  neutral: "text-muted-foreground",
};

/**
 * Sources expose up to 21 metrics between them, which buries the signal. These are the ones that
 * answer "did the campaign move anything"; everything else stays behind the show-all toggle.
 */
const KEY_METRIC_KEYS: Record<CampaignImpactSource["source"], readonly string[]> = {
  gsc: ["branded_clicks", "non_branded_clicks", "tracked_term_clicks"],
  ga4: ["sessions", "key_events", "revenue"],
  gbp: ["website_clicks", "call_clicks", "direction_requests"],
};

/** A metric row flattened out of its source so every source shares one table. */
interface MetricRow extends CampaignPresentationMetric {
  sourceKey: CampaignImpactSource["source"];
  isKeyMetric: boolean;
}

function sourceName(source: CampaignImpactSource["source"]): string {
  return PRODUCT_CONFIG[source]?.label || source.toUpperCase();
}

function sourceShortName(source: CampaignImpactSource["source"]): string {
  return PRODUCT_CONFIG[source]?.shortLabel || source.toUpperCase();
}

/**
 * Every number on this page comes from one of three Google products, so each one carries its
 * product mark. Naming follows PRODUCT_CONFIG rather than the API's own source labels.
 */
function SourceMark({ source, size = 14 }: { source: CampaignImpactSource["source"]; size?: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 items-center">
          <ProductIcon product={source} size={size} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>{sourceName(source)}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The flattened metrics table mixes all three products, so each row carries its origin. A short
 * text tag stays legible at table density where a brand mark reads as decoration.
 */
function SourceTag({ source }: { source: CampaignImpactSource["source"] }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 items-center rounded-[4px] border border-general-border px-1 text-[10px] font-medium leading-[16px] tracking-wide text-muted-foreground">
          {sourceShortName(source)}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>{sourceName(source)}</TooltipContent>
    </Tooltip>
  );
}

function PresentationChange({ change }: { change: CampaignPresentationChange }) {
  return <span className={TONE_TEXT[change.tone]}>{change.text}</span>;
}

/** Inline trigger that keeps long-form campaign detail out of the layout until asked for. */
function HintText({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded-[4px] underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6} className="max-w-[320px] text-left">{children}</TooltipContent>
    </Tooltip>
  );
}

function MetaStrip({ facts }: { facts: Array<{ key: string; node: React.ReactNode }> }) {
  if (!facts.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {facts.map((fact, index) => (
        <React.Fragment key={fact.key}>
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          <span>{fact.node}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function windowRangeText(window: CampaignPresentationWindow | undefined): string | null {
  if (!window?.start) return null;
  return formatCampaignDateRange(window.start, window.end);
}

/** Puts the compared periods next to the numbers instead of in a section of their own. */
function comparisonCaption(presentation: CampaignImpactPresentation, windows: Map<string, CampaignPresentationWindow>): string {
  const primaryText = windowRangeText(windows.get("primary"));
  const baselineText = windowRangeText(windows.get("baseline"));
  if (!primaryText || !baselineText) return presentation.comparisonDescription;
  return `${presentation.primaryColumnLabel} ${primaryText} vs before ${baselineText}`;
}

function ColumnLabel({ label, rangeText }: { label: string; rangeText: string | null }) {
  if (!rangeText) return <>{label}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>{rangeText}</TooltipContent>
    </Tooltip>
  );
}

export function CampaignImpactReportTemplate({ businessId, campaignId }: { businessId: string; campaignId: string }) {
  const router = useRouter();
  const canManage = useCan("canGenerateReports");
  const { profileData } = useBusinessProfileById(businessId);
  const detail = useCampaignEvent(businessId, campaignId);
  const impact = useCampaignImpactReport(businessId, campaignId);
  const mutations = useCampaignMutations(businessId);
  const [editOpen, setEditOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [emails, setEmails] = React.useState<string[]>([]);
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [showAllMetrics, setShowAllMetrics] = React.useState(false);
  const shareKey = React.useRef(crypto.randomUUID());
  const report = impact.data;
  const campaign = detail.data || report?.campaign;
  const businessName = profileData?.Name || "Business";
  const locations = React.useMemo(() => campaignLocationOptions((profileData as { Locations?: Array<{ Name?: string; DisplayName?: string }> } | null)?.Locations), [profileData]);
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: businessName }, { label: "Analytics", href: `/business/${businessId}/analytics` }, { label: "Campaign Tracking", href: `/business/${businessId}/analytics/campaigns` }, { label: campaign?.name || "Impact report" }];
  const snapshots = detail.data?.snapshots || [];

  const windows = React.useMemo(
    () => new Map((report?.presentation.windows || []).map(window => [window.key, window])),
    [report],
  );

  // The presentation payload omits availability, so the raw metrics decide what is worth a row.
  const metricRows = React.useMemo<MetricRow[]>(() => {
    if (!report) return [];
    const hidden = new Set<string>();
    for (const source of report.sources) {
      for (const metric of source.metrics) {
        if (metric.availability === "not_configured" || (metric.baseline == null && metric.primary == null)) {
          hidden.add(`${source.source}:${metric.key}`);
        }
      }
    }
    return report.presentation.sources.flatMap(source =>
      source.metrics
        .filter(metric => !hidden.has(`${source.key}:${metric.key}`))
        .map(metric => ({
          ...metric,
          sourceKey: source.key,
          isKeyMetric: (KEY_METRIC_KEYS[source.key] || []).includes(metric.key),
        })),
    );
  }, [report]);

  const keyMetricRows = React.useMemo(() => metricRows.filter(metric => metric.isKeyMetric), [metricRows]);
  // Falling back to every row keeps the table populated when a campaign only reports secondary metrics.
  const visibleMetricRows = showAllMetrics || !keyMetricRows.length ? metricRows : keyMetricRows;
  const hiddenMetricCount = metricRows.length - keyMetricRows.length;

  const sourceNotes = React.useMemo(
    () => (report?.presentation.sources || []).filter(source => source.status.tone !== "positive" || source.message),
    [report],
  );


  React.useEffect(() => {
    if (!report) return;
    captureCampaignImpactEvent("campaign_impact_loaded", { business_id: businessId, campaign_type: report.campaign.campaignType, event_kind: report.campaign.eventKind, status: report.status, has_overlap: report.contamination.length > 0, source_count: report.sources.length });
  }, [businessId, report]);

  async function download(snapshotId?: string) {
    if (!campaign) return;
    setDownloading(snapshotId || "current");
    try {
      const blob = await downloadCampaignImpactPdf(campaign.id, snapshotId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${campaign.name.replace(/[^a-z0-9_ -]/gi, "").slice(0, 80) || "campaign"}-impact.pdf`;
      link.click(); URL.revokeObjectURL(url);
      captureCampaignImpactEvent("campaign_pdf_downloaded", { business_id: businessId, campaign_type: campaign.campaignType, event_kind: campaign.eventKind, origin: "impact_report" });
      toast.success("Download started");
    } catch (error) { toast.error(campaignApiError(error, "The PDF could not be downloaded.")); }
    finally { setDownloading(null); }
  }

  async function share() {
    if (!campaign || !emails.length) return;
    try {
      await mutations.share.mutateAsync({ id: campaign.id, emails, idempotencyKey: shareKey.current });
      captureCampaignImpactEvent("campaign_report_shared", { business_id: businessId, campaign_type: campaign.campaignType, event_kind: campaign.eventKind, origin: "impact_report" });
      toast.success("Campaign report shared");
      setShareOpen(false); setEmails([]); shareKey.current = crypto.randomUUID();
    } catch (error) { toast.error(campaignApiError(error, "The report could not be shared.")); }
  }

  if (detail.isLoading || impact.isLoading) {
    return <div className="min-h-screen bg-general-primary-foreground"><PageHeader breadcrumbs={breadcrumbs} /><CampaignImpactReportSkeleton /></div>;
  }
  if (detail.isError || impact.isError || !campaign || !report) {
    return <div className="min-h-screen"><PageHeader breadcrumbs={breadcrumbs} /><div className="flex min-h-[480px] flex-col items-center justify-center gap-3 p-7 text-center"><AlertCircle className="size-9 text-destructive" /><h1 className="text-lg font-medium">Report could not be loaded</h1><p className="text-sm text-muted-foreground">The campaign may have been removed, or a data source is temporarily unavailable.</p><div className="flex gap-2"><Button variant="outline" onClick={() => router.push(`/business/${businessId}/analytics/campaigns`)}><ArrowLeft className="size-4" />Campaigns</Button><Button onClick={() => { void detail.refetch(); void impact.refetch(); }}><RefreshCw className="size-4" />Try again</Button></div></div></div>;
  }

  const presentation = report.presentation;
  const locationLabels = (campaign.gbpLocationNames || []).map(name => locations.find(option => option.value === name)?.label || name);
  const metaFacts: Array<{ key: string; node: React.ReactNode }> = [
    { key: "type", node: presentation.campaignTypeLabel },
    {
      key: "dates",
      node: campaign.eventKind === "one_time"
        ? formatCampaignDate(campaign.startDate)
        : formatCampaignDateRange(campaign.startDate, campaign.endDate),
    },
  ];
  if (presentation.details.spendText) metaFacts.push({ key: "spend", node: `${presentation.details.spendText} spend` });
  if (campaign.trackedTerms.length) {
    metaFacts.push({
      key: "terms",
      node: <HintText label={`${campaign.trackedTerms.length} search${campaign.trackedTerms.length === 1 ? "" : "es"} tracked`}>{presentation.details.trackedTermsText}</HintText>,
    });
  }
  if (locationLabels.length) {
    metaFacts.push({
      key: "locations",
      node: <HintText label={`${locationLabels.length} location${locationLabels.length === 1 ? "" : "s"}`}>{locationLabels.join(", ")}</HintText>,
    });
  }
  if (presentation.details.notes) {
    metaFacts.push({
      key: "notes",
      node: <HintText label="Notes"><span className="whitespace-pre-wrap">{presentation.details.notes}</span></HintText>,
    });
  }

  return (
    <div className="min-h-screen bg-general-primary-foreground">
      <PageHeader breadcrumbs={breadcrumbs} />
      <main className="w-full max-w-[1224px] space-y-4 px-5 py-5 md:px-7">
        <div className="flex flex-col gap-3 border-b border-general-border pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 h-7 px-2 text-xs" onClick={() => router.push(`/business/${businessId}/analytics/campaigns`)}>
              <ArrowLeft className="size-3.5" />Campaigns
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-medium">{campaign.name}</h1>
              <Badge variant="outline" className={`${TONE_TEXT[presentation.status.tone]} border-0`}>{presentation.status.label}</Badge>
              <CampaignOverlapWarning overlaps={report.contamination} context="report" primaryPeriodLabel={presentation.primaryColumnLabel} />
            </div>
            <MetaStrip facts={metaFacts} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)} disabled={!canManage}><Edit3 className="size-4" />Edit</Button>
            <Button variant="outline" onClick={() => void download()} disabled={!canManage || Boolean(downloading)}>
              {downloading === "current" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}PDF
            </Button>
            <Button onClick={() => { shareKey.current = crypto.randomUUID(); setShareOpen(true); }} disabled={!canManage}><Mail className="size-4" />Share</Button>
          </div>
        </div>

        <section aria-labelledby="results-heading" className="overflow-hidden rounded-[8px] border border-general-border bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <h2 id="results-heading" className="font-medium">Results</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="rounded-[4px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="How these results are measured">
                    <Info className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6} className="max-w-[320px] text-left">{report.disclaimer}</TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground">{comparisonCaption(presentation, windows)}</p>
          </div>

          {presentation.highlights.length ? (
            <div className="grid divide-y divide-general-border border-t border-general-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {presentation.highlights.map(highlight => (
                <div key={`${highlight.source}-${highlight.key}`} className="min-w-0 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <SourceMark source={highlight.source} />
                    <p className="truncate text-xs text-muted-foreground">{highlight.label}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-xl font-medium tabular-nums">{highlight.valueText}</p>
                    <div className="text-xs font-medium"><PresentationChange change={highlight.change} /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {metricRows.length ? (
            <div className="overflow-x-auto border-t border-general-border">
              <table className={`w-full text-sm ${presentation.hasPostPeriod ? "min-w-[720px]" : "min-w-[600px]"}`}>
                <thead className="bg-general-primary-foreground text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Metric</th>
                    <th className="px-4 py-2 text-right font-medium"><ColumnLabel label="Before" rangeText={windowRangeText(windows.get("baseline"))} /></th>
                    <th className="px-4 py-2 text-right font-medium"><ColumnLabel label={presentation.primaryColumnLabel} rangeText={windowRangeText(windows.get("primary"))} /></th>
                    {presentation.hasPostPeriod ? <th className="px-4 py-2 text-right font-medium"><ColumnLabel label="After" rangeText={windowRangeText(windows.get("post"))} /></th> : null}
                    <th className="px-4 py-2 text-right font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMetricRows.map(metric => (
                    <tr key={`${metric.sourceKey}-${metric.key}`} className="border-t border-general-border hover:bg-general-secondary/60">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{metric.label}</span>
                          <SourceTag source={metric.sourceKey} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{metric.baselineText}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{metric.primaryText}</td>
                      {presentation.hasPostPeriod ? <td className="px-4 py-2.5 text-right tabular-nums">{metric.postText}</td> : null}
                      <td className="px-4 py-2.5 text-right"><PresentationChange change={metric.change} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="border-t border-general-border px-4 py-6 text-center text-sm text-muted-foreground">
              Results will appear here when connected data is available.
            </p>
          )}

          {hiddenMetricCount > 0 && keyMetricRows.length ? (
            <div className="border-t border-general-border">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-full justify-center rounded-none text-xs font-normal text-muted-foreground hover:text-foreground"
                aria-expanded={showAllMetrics}
                onClick={() => setShowAllMetrics(value => !value)}
              >
                {showAllMetrics ? "Show key metrics only" : `Show all ${metricRows.length} metrics`}
              </Button>
            </div>
          ) : null}

          {report.dataThrough || sourceNotes.length ? (
            <div className="space-y-1 border-t border-general-border px-4 py-2.5 text-xs text-muted-foreground">
              {report.dataThrough ? <p>Data through {formatCampaignDate(report.dataThrough)}</p> : null}
              {sourceNotes.map(source => (
                <p key={source.key} className="flex items-center gap-1.5">
                  <ProductIcon product={source.key} size={12} />
                  {sourceName(source.key)}: {source.message || source.status.label}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      </main>

      <CampaignFormSheet open={editOpen} onOpenChange={setEditOpen} businessId={businessId} locations={locations} campaign={campaign} onSaved={() => { void detail.refetch(); void impact.refetch(); }} />
      <Dialog open={shareOpen} onOpenChange={open => !mutations.share.isPending && setShareOpen(open)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-medium">Share campaign report</DialogTitle>
            <DialogDescription>Recipients receive a PDF copy of the report as it looks now.</DialogDescription>
          </DialogHeader>
          <div className="py-1"><MultiEmailInput value={emails} onChange={setEmails} disabled={mutations.share.isPending} /></div>
          {snapshots.length ? (
            <div className="overflow-hidden rounded-[8px] border border-general-border">
              <p className="border-b border-general-border bg-general-primary-foreground px-3 py-2 text-xs text-muted-foreground">
                Previously shared ({snapshots.length})
              </p>
              <div className="max-h-[180px] divide-y divide-general-border overflow-y-auto">
                {snapshots.map(snapshot => (
                  <div key={snapshot.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{snapshot.deliveryStatus === "sent" ? new Date(snapshot.sentAt || snapshot.createdAt).toLocaleDateString() : `Delivery ${snapshot.deliveryStatus}`}</p>
                      <p className="text-xs text-muted-foreground">{snapshot.recipients.length} recipient{snapshot.recipients.length === 1 ? "" : "s"}</p>
                    </div>
                    {snapshot.deliveryStatus === "sent" ? (
                      <Button variant="outline" size="sm" onClick={() => void download(snapshot.id)} disabled={downloading === snapshot.id}>
                        {downloading === snapshot.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}PDF
                      </Button>
                    ) : <Badge variant="outline" className="capitalize">{snapshot.deliveryStatus}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)} disabled={mutations.share.isPending}>Cancel</Button>
            <Button onClick={() => void share()} disabled={!emails.length || mutations.share.isPending}>
              {mutations.share.isPending ? <><Loader2 className="size-4 animate-spin" />Sending</> : <><Mail className="size-4" />Share report</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
