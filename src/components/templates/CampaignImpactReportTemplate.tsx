"use client";

import * as React from "react";
import { AlertCircle, ArrowLeft, CalendarRange, ChevronDown, Download, Edit3, Info, Loader2, Mail, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiEmailInput } from "@/components/molecules/MultiEmailInput";
import { CampaignFormSheet } from "@/components/organisms/campaign-impact/CampaignFormSheet";
import { CampaignImpactReportSkeleton } from "@/components/organisms/campaign-impact/CampaignImpactReportSkeleton";
import { CampaignOverlapWarning } from "@/components/organisms/campaign-impact/CampaignOverlapWarning";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { downloadCampaignImpactPdf, useCampaignEvent, useCampaignImpactReport, useCampaignMutations } from "@/hooks/use-campaign-impact";
import { useCan } from "@/hooks/use-permissions";
import { campaignApiError, campaignLocationOptions } from "@/lib/campaign-impact";
import { captureCampaignImpactEvent } from "@/lib/analytics/posthog-client";
import type { CampaignPresentationChange, CampaignPresentationSource, CampaignPresentationTone } from "@/types/campaign-impact";

const TONE_TEXT: Record<CampaignPresentationTone, string> = {
  positive: "text-green-700",
  negative: "text-red-700",
  warning: "text-amber-800",
  info: "text-blue-700",
  neutral: "text-muted-foreground",
};

function PresentationChange({ change, compact = false }: { change: CampaignPresentationChange; compact?: boolean }) {
  return <span className={TONE_TEXT[change.tone]}>{change.text}{!compact && change.badge ? <Badge variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-amber-800">{change.badge}</Badge> : null}</span>;
}

function SourceTable({ source, primaryColumnLabel, hasPostPeriod }: { source: CampaignPresentationSource; primaryColumnLabel: string; hasPostPeriod: boolean }) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-general-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-general-border px-4 py-3">
        <div><p className="font-medium">{source.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{source.dataThroughText}</p></div>
        <Badge variant="outline" className={TONE_TEXT[source.status.tone]}>{source.status.label}</Badge>
      </div>
      <div className="overflow-x-auto"><table className={`w-full text-sm ${hasPostPeriod ? "min-w-[760px]" : "min-w-[640px]"}`}><thead className="bg-general-primary-foreground text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Metric</th><th className="px-4 py-2 text-right font-medium">Before</th><th className="px-4 py-2 text-right font-medium">{primaryColumnLabel}</th>{hasPostPeriod ? <th className="px-4 py-2 text-right font-medium">After</th> : null}<th className="px-4 py-2 text-right font-medium">Change</th></tr></thead><tbody>{source.metrics.map(metric => <tr key={metric.key} className="border-t border-general-border hover:bg-general-secondary/60"><td className="px-4 py-3 font-medium">{metric.label}</td><td className="px-4 py-3 text-right tabular-nums">{metric.baselineText}</td><td className="px-4 py-3 text-right tabular-nums">{metric.primaryText}</td>{hasPostPeriod ? <td className="px-4 py-3 text-right tabular-nums">{metric.postText}</td> : null}<td className="px-4 py-3 text-right"><PresentationChange change={metric.change} /></td></tr>)}</tbody></table></div>
      {source.message ? <p className="border-t border-general-border px-4 py-3 text-xs text-muted-foreground">{source.message}</p> : null}
    </div>
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
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [emails, setEmails] = React.useState<string[]>([]);
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const shareKey = React.useRef(crypto.randomUUID());
  const report = impact.data;
  const campaign = detail.data || report?.campaign;
  const businessName = profileData?.Name || "Business";
  const locations = React.useMemo(() => campaignLocationOptions((profileData as { Locations?: Array<{ Name?: string; DisplayName?: string }> } | null)?.Locations), [profileData]);
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: businessName }, { label: "Analytics", href: `/business/${businessId}/analytics` }, { label: "Campaign Tracking", href: `/business/${businessId}/analytics/campaigns` }, { label: campaign?.name || "Impact report" }];

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
  return (
    <div className="min-h-screen bg-general-primary-foreground">
      <PageHeader breadcrumbs={breadcrumbs} />
      <main className="w-full max-w-[1224px] space-y-5 px-5 py-6 md:px-7">
        <div className="flex flex-col gap-5 border-b border-general-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => router.push(`/business/${businessId}/analytics/campaigns`)}><ArrowLeft className="size-4" />Campaigns</Button>
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-medium">{campaign.name}</h1><Badge variant="outline" className={`${TONE_TEXT[presentation.status.tone]} border-0`}>{presentation.status.label}</Badge></div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"><span>{presentation.campaignTypeLabel}</span><span className="hidden sm:inline">·</span><span className="flex items-center gap-1.5"><CalendarRange className="size-4" />{presentation.dateText}</span></div>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setEditOpen(true)} disabled={!canManage}><Edit3 className="size-4" />Edit</Button><Button variant="outline" onClick={() => void download()} disabled={!canManage || Boolean(downloading)}>{downloading === "current" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}PDF</Button><Button onClick={() => { shareKey.current = crypto.randomUUID(); setShareOpen(true); }} disabled={!canManage}><Mail className="size-4" />Share</Button></div>
        </div>

        <CampaignOverlapWarning overlaps={report.contamination} context="report" primaryPeriodLabel={presentation.primaryColumnLabel} />

        <section aria-labelledby="results-heading">
          <div className="mb-3 flex items-center justify-between"><div><h2 id="results-heading" className="font-medium">At a glance</h2><p className="mt-0.5 text-xs text-muted-foreground">{presentation.comparisonDescription}</p></div></div>
          <div className="overflow-hidden rounded-[8px] border border-general-border bg-white">
            {presentation.highlights.length ? <div className="grid divide-y divide-general-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">{presentation.highlights.map(highlight => <div key={`${highlight.source}-${highlight.key}`} className="min-w-0 px-3 py-2.5"><p className="truncate text-xs text-muted-foreground">{highlight.label}</p><div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><p className="text-xl font-medium tabular-nums">{highlight.valueText}</p><div className="text-xs font-medium"><PresentationChange change={highlight.change} compact /></div></div></div>)}</div> : <div className="p-4 text-sm text-muted-foreground">Results will appear here when connected data is available.</div>}
          </div>
        </section>

        <section className="overflow-hidden rounded-[8px] border border-general-border bg-white"><div className="flex min-h-10 items-center justify-between gap-3 px-3 py-2"><h2 className="font-medium">Comparison</h2>{presentation.hasDetails ? <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Campaign details<ChevronDown className={`size-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`} /></Button></CollapsibleTrigger></Collapsible> : null}</div><div className="grid divide-y divide-general-border border-t border-general-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">{presentation.windows.map(window => <div key={window.key} className="min-w-0 px-3 py-2.5"><p className="text-xs text-muted-foreground">{window.label}</p><p className="mt-1 truncate text-sm font-medium">{window.dateText}</p></div>)}</div>{presentation.hasDetails ? <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}><CollapsibleContent><div className="grid gap-3 border-t border-general-border p-3 text-sm sm:grid-cols-2">{presentation.details.notes ? <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap">{presentation.details.notes}</p></div> : null}{presentation.details.trackedTermsText ? <div><p className="text-xs text-muted-foreground">Tracked searches</p><p className="mt-1">{presentation.details.trackedTermsText}</p></div> : null}{presentation.details.locationsText ? <div><p className="text-xs text-muted-foreground">Locations</p><p className="mt-1">{presentation.details.locationsText}</p></div> : null}{presentation.details.spendText ? <div><p className="text-xs text-muted-foreground">Spend</p><p className="mt-1">{presentation.details.spendText}</p></div> : null}</div></CollapsibleContent></Collapsible> : null}</section>

        <section aria-labelledby="source-results-heading"><div className="mb-3"><h2 id="source-results-heading" className="font-medium">Full results</h2><p className="mt-0.5 text-xs text-muted-foreground">Choose a source to see every metric</p></div><Tabs defaultValue={presentation.sources[0]?.key || "gsc"} className="gap-3"><TabsList className="h-10 max-w-full overflow-x-auto rounded-[8px] p-1">{presentation.sources.map(source => <TabsTrigger key={source.key} value={source.key} className="h-8 rounded-[6px] px-3">{source.label}</TabsTrigger>)}</TabsList>{presentation.sources.map(source => <TabsContent key={source.key} value={source.key}><SourceTable source={source} primaryColumnLabel={presentation.primaryColumnLabel} hasPostPeriod={presentation.hasPostPeriod} /></TabsContent>)}</Tabs></section>

        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" />{report.disclaimer}</p>

        {detail.data?.snapshots?.length ? <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="rounded-[8px] border border-general-border bg-white"><CollapsibleTrigger asChild><Button variant="ghost" className="h-auto w-full justify-between rounded-[8px] px-4 py-3"><span>Shared reports ({detail.data.snapshots.length})</span><ChevronDown className={`size-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} /></Button></CollapsibleTrigger><CollapsibleContent><div className="divide-y divide-general-border border-t border-general-border px-4">{detail.data.snapshots.map(snapshot => <div key={snapshot.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{snapshot.deliveryStatus === "sent" ? new Date(snapshot.sentAt || snapshot.createdAt).toLocaleString() : `Delivery ${snapshot.deliveryStatus}`}</p><p className="text-xs text-muted-foreground">{snapshot.recipients.length} recipient{snapshot.recipients.length === 1 ? "" : "s"}</p></div>{snapshot.deliveryStatus === "sent" ? <Button variant="outline" size="sm" onClick={() => void download(snapshot.id)} disabled={downloading === snapshot.id}>{downloading === snapshot.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Download</Button> : <Badge variant="outline" className="w-fit capitalize">{snapshot.deliveryStatus}</Badge>}</div>)}</div></CollapsibleContent></Collapsible> : null}
      </main>

      <CampaignFormSheet open={editOpen} onOpenChange={setEditOpen} businessId={businessId} locations={locations} campaign={campaign} onSaved={() => { void detail.refetch(); void impact.refetch(); }} />
      <Dialog open={shareOpen} onOpenChange={open => !mutations.share.isPending && setShareOpen(open)}><DialogContent className="sm:max-w-[480px]"><DialogHeader><DialogTitle className="font-medium">Share campaign report</DialogTitle><DialogDescription>Recipients receive a PDF copy of the report as it looks now.</DialogDescription></DialogHeader><div className="py-3"><MultiEmailInput value={emails} onChange={setEmails} disabled={mutations.share.isPending} /></div><DialogFooter><Button variant="outline" onClick={() => setShareOpen(false)} disabled={mutations.share.isPending}>Cancel</Button><Button onClick={() => void share()} disabled={!emails.length || mutations.share.isPending}>{mutations.share.isPending ? <><Loader2 className="size-4 animate-spin" />Sending</> : <><Mail className="size-4" />Share report</>}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
