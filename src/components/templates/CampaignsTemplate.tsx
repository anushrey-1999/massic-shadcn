"use client";

import * as React from "react";
import { AlertTriangle, ArrowLeft, CalendarRange, FileText, Info, Loader2, Megaphone, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DatePickerField } from "@/components/molecules/DatePickerField";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableElement, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CampaignFormSheet } from "@/components/organisms/campaign-impact/CampaignFormSheet";
import { CampaignImpactReportSheet } from "@/components/organisms/campaign-impact/CampaignImpactReportSheet";
import { CampaignMessageBanner } from "@/components/organisms/campaign-impact/CampaignMessageBanner";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { useCampaignEvents, useCampaignMutations } from "@/hooks/use-campaign-impact";
import { useCan } from "@/hooks/use-permissions";
import { campaignApiError, campaignLocationOptions, CAMPAIGN_STATUS, CAMPAIGN_TYPE_LABELS, formatCampaignDate, formatCampaignDateRange } from "@/lib/campaign-impact";
import { captureCampaignImpactEvent } from "@/lib/analytics/posthog-client";
import { CAMPAIGN_TYPES, type CampaignEvent, type CampaignListPerformance, type CampaignListTrend, type CampaignStatus } from "@/types/campaign-impact";

function formatTrendDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function CampaignTrendChart({ trend, label, startDate, endDate }: { trend?: CampaignListTrend | null; label: string; startDate: string; endDate: string | null }) {
  const gradientId = React.useId().replace(/:/g, "");
  const data = React.useMemo(() => {
    if (!trend?.points.length) return [];
    const firstCampaignIndex = trend.points.findIndex(point => point.phase === "campaign");
    return trend.points.map((point, index) => ({
      ...point,
      baselineValue: point.phase === "baseline" || index === firstCampaignIndex ? point.value : null,
      campaignValue: point.phase === "campaign" || index === firstCampaignIndex - 1 ? point.value : null,
    }));
  }, [trend]);
  const dateLabels = <div className="flex h-4 items-end justify-between gap-2 px-0.5 text-[9px] leading-none text-muted-foreground"><span>Start {formatTrendDate(startDate)}</span>{endDate ? <span>End {formatTrendDate(endDate)}</span> : null}</div>;
  if (!trend || !data.length) return <div className="flex h-16 w-full flex-col rounded-[6px] bg-general-secondary px-1 pb-1" aria-label={`${label}: no trend available`}><div className="min-h-0 flex-1" />{dateLabels}</div>;
  return (
    <div className="flex h-16 w-full flex-col" aria-label={`${label} search clicks trend, starting ${formatTrendDate(startDate)}${endDate ? ` and ending ${formatTrendDate(endDate)}` : ""}`}>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 3, bottom: 1, left: 3 }}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.18} /><stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
          <Area type="monotone" dataKey="baselineValue" stroke="var(--muted-foreground)" fill={`url(#${gradientId})`} strokeWidth={1.5} connectNulls={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="campaignValue" stroke="var(--general-primary)" strokeWidth={1.75} dot={false} connectNulls={false} isAnimationActive={false} />
          <ReferenceLine x={startDate || trend.referenceDate} stroke="var(--muted-foreground)" strokeWidth={1.5} strokeOpacity={0.65} />
          {endDate ? <ReferenceLine x={endDate} stroke="var(--muted-foreground)" strokeWidth={1.25} strokeDasharray="3 2" strokeOpacity={0.6} /> : null}
          <RechartsTooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 2", strokeOpacity: 0.5 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as { date?: string; value?: number } | undefined;
              if (!active || !point?.date || point.value == null) return null;
              const [year, month, day] = point.date.split("-").map(Number);
              const date = new Date(Date.UTC(year, month - 1, day));
              return <div className="rounded-[6px] border border-general-border bg-white px-3 py-2 shadow-xs"><p className="text-xs font-medium">{new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(date)}</p><p className="mt-1 text-sm font-medium tabular-nums">{point.value.toLocaleString("en-US", { maximumFractionDigits: 1 })} <span className="font-normal text-muted-foreground">clicks</span></p><p className="mt-0.5 text-[10px] text-muted-foreground">7 day moving avg</p></div>;
            }}
          />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {dateLabels}
    </div>
  );
}

function MetricSummary({ summary }: { summary?: CampaignListPerformance }) {
  if (!summary) return <span className="text-xs text-muted-foreground">—</span>;
  const change = summary.liftPercent != null
    ? `${summary.liftPercent > 0 ? "+" : ""}${summary.liftPercent}%`
    : summary.reportabilityReason === "new_activity" ? "New activity" : null;
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">{summary.label}</p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-sm font-medium tabular-nums">{summary.value.toLocaleString()}</span>
        {change ? <span className={`whitespace-nowrap ${summary.liftPercent != null && summary.liftPercent < 0 ? "text-xs font-medium text-red-700" : "text-xs font-medium text-green-700"}`}>{change}</span> : null}
      </div>
    </div>
  );
}

function PerformanceSummary({ summaries = [] }: { summaries?: CampaignListPerformance[] }) {
  const byKey = new Map(summaries.map(summary => [summary.metricKey, summary]));
  const metricKeys: CampaignListPerformance["metricKey"][] = ["branded_clicks", "sessions", "key_events", "search_clicks"];
  return (
    <div className="grid grid-cols-4 divide-x divide-general-border">
      {metricKeys.map(metricKey => (
        <div key={metricKey} className="min-w-0 px-2 first:pl-0 last:pr-0">
          <MetricSummary summary={byKey.get(metricKey)} />
        </div>
      ))}
    </div>
  );
}

export function CampaignsTemplate({ businessId }: { businessId: string }) {
  const router = useRouter();
  const canManage = useCan("canGenerateReports");
  const { profileData, profileDataLoading } = useBusinessProfileById(businessId);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [type, setType] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CampaignEvent | null>(null);
  const [deleting, setDeleting] = React.useState<CampaignEvent | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string | null>(null);
  const filters = React.useMemo(() => ({
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(type !== "all" ? { type } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }), [debouncedSearch, from, status, to, type]);
  const campaigns = useCampaignEvents(businessId, filters);
  const mutations = useCampaignMutations(businessId);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const locations = React.useMemo(
    () => campaignLocationOptions(profileData?.Locations),
    [profileData]
  );
  const businessName = profileData?.Name || "Business";
  const breadcrumbs = [
    { label: "Home", href: "/" }, { label: businessName },
    { label: "Analytics", href: `/business/${businessId}/analytics` },
    { label: "Campaign Tracking" },
  ];

  const hasFilters = Boolean(debouncedSearch || type !== "all" || status !== "all" || from || to);
  function clearFilters() { setSearch(""); setDebouncedSearch(""); setType("all"); setStatus("all"); setFrom(""); setTo(""); }
  function openCreate() { captureCampaignImpactEvent("campaign_tracking_opened", { business_id: businessId, origin: "campaign_list" }); setEditing(null); setFormOpen(true); }
  function openEdit(campaign: CampaignEvent) { setEditing(campaign); setFormOpen(true); }
  function openReport(campaignId: string) {
    setSelectedCampaignId(campaignId);
  }
  async function confirmDelete() {
    if (!deleting) return;
    try { await mutations.remove.mutateAsync(deleting.id); captureCampaignImpactEvent("campaign_deleted", { business_id: businessId, campaign_type: deleting.campaignType, event_kind: deleting.eventKind }); toast.success("Campaign deleted"); setDeleting(null); }
    catch (error) { toast.error(campaignApiError(error, "The campaign could not be deleted.")); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-general-primary-foreground">
      <PageHeader breadcrumbs={breadcrumbs} />
      <main className="w-full max-w-[1224px] flex-1 px-5 py-6 md:px-7">
        <div className="flex flex-col gap-5 border-b border-general-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" className="mb-3 -ml-2 gap-2" onClick={() => router.push(`/business/${businessId}/analytics`)}><ArrowLeft className="size-4" />Analytics</Button>
            <h1 className="text-xl font-medium text-general-foreground">Campaign Tracking</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Compare marketing activity with changes in search, website, and local performance.</p>
          </div>
          <Button onClick={openCreate} disabled={!canManage || profileDataLoading} className="w-full gap-2 sm:w-auto" title={!canManage ? "Requires report-generation permission" : undefined}><Plus className="size-4" />Add campaign</Button>
        </div>

        {!canManage ? (
          <CampaignMessageBanner
            icon={Info}
            title="View-only access"
            description="You can view results, but you need report permissions to make changes or share reports."
            variant="info"
            className="mt-5"
          />
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:items-center">
            <div className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} className="h-9 pl-9" placeholder="Search campaigns" aria-label="Search campaigns" /></div>
            <Select value={type} onValueChange={setType}><SelectTrigger className="h-9 w-full lg:w-[152px]"><SelectValue placeholder="All types" /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{CAMPAIGN_TYPES.map(value => <SelectItem value={value} key={value}>{CAMPAIGN_TYPE_LABELS[value]}</SelectItem>)}</SelectContent></Select>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-9 w-full lg:w-[152px]"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(CAMPAIGN_STATUS).map(([value, item]) => <SelectItem value={value} key={value}>{item.label}</SelectItem>)}</SelectContent></Select>
            <DatePickerField placeholder="From date" value={from} onChange={setFrom} maxDate={to} clearable className="h-9 lg:w-[148px]" />
            <DatePickerField placeholder="To date" value={to} onChange={setTo} minDate={from} clearable className="h-9 lg:w-[148px]" />
            <div className="flex min-w-[68px] items-center justify-end gap-2">
              {campaigns.isFetching && !campaigns.isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Updating campaigns" /> : null}
              {hasFilters ? <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button> : null}
            </div>
        </div>

        <section className="mt-4 overflow-hidden rounded-[8px] border border-general-border bg-white" aria-live="polite">
          {campaigns.isLoading ? (
            <div className="space-y-1 p-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-[76px] w-full" />)}</div>
          ) : campaigns.isError ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center"><AlertTriangle className="size-8 text-destructive" /><div><h2 className="font-medium">Campaigns could not be loaded</h2><p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p></div><Button variant="outline" onClick={() => campaigns.refetch()}><RefreshCw className="size-4" />Try again</Button></div>
          ) : !campaigns.data?.length ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-10 text-center"><span className="mb-4 grid size-12 place-items-center rounded-full bg-general-secondary"><Megaphone className="size-6 text-muted-foreground" /></span><h2 className="font-medium">{hasFilters ? "No matching campaigns" : "No campaigns yet"}</h2><p className="mt-1 max-w-md text-sm text-muted-foreground">{hasFilters ? "Try clearing a filter or using another search." : "Add a campaign to compare performance before, during, and after it."}</p>{canManage && !hasFilters ? <Button className="mt-4" onClick={openCreate}><Plus className="size-4" />Add first campaign</Button> : null}</div>
          ) : (
            <Table className="w-full">
              <TableElement className="min-w-[1125px] table-fixed">
                <colgroup><col className="w-[160px]" /><col className="w-[175px]" /><col className="w-[380px]" /><col className="w-[170px]" /><col className="w-[200px]" /><col className="w-[40px]" /></colgroup>
                <TableHeader className="bg-general-primary-foreground"><TableRow className="h-9 bg-general-primary-foreground hover:bg-general-primary-foreground"><TableHead className="px-3 text-xs text-muted-foreground">Campaign</TableHead><TableHead className="px-3 text-xs text-muted-foreground">Dates</TableHead><TableHead className="px-3 text-xs text-muted-foreground">Performance vs before</TableHead><TableHead className="px-3 text-xs text-muted-foreground">Status</TableHead><TableHead className="px-3 text-xs text-muted-foreground">Search trend</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                <TableBody>{campaigns.data.map(campaign => {
                  const statusKey = (campaign.status || "collecting_data") as CampaignStatus;
                  const statusMeta = CAMPAIGN_STATUS[statusKey];
                  const dateLabel = campaign.eventKind === "one_time" ? formatCampaignDate(campaign.startDate) : formatCampaignDateRange(campaign.startDate, campaign.endDate);
                  return <TableRow key={campaign.id} className="group h-[84px] cursor-pointer hover:bg-general-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onClick={() => openReport(campaign.id)} tabIndex={0} onKeyDown={event => { if (event.key === "Enter") openReport(campaign.id); }}>
                    <TableCell className="px-3"><div className="min-w-0"><Tooltip><TooltipTrigger asChild><p className="truncate font-medium text-general-foreground">{campaign.name}</p></TooltipTrigger><TooltipContent side="top" sideOffset={6} className="max-w-[320px] whitespace-normal break-words text-left">{campaign.name}</TooltipContent></Tooltip><p className="mt-1 text-xs text-muted-foreground">{CAMPAIGN_TYPE_LABELS[campaign.campaignType]} · {campaign.eventKind === "one_time" ? "One-time event" : campaign.endDate ? "Campaign" : "Ongoing"}</p></div></TableCell>
                    <TableCell className="px-3"><div className="flex min-w-0 items-center gap-2 text-sm"><CalendarRange className="size-4 shrink-0 text-muted-foreground" /><span className="truncate whitespace-nowrap" title={dateLabel}>{dateLabel}</span></div></TableCell>
                    <TableCell className="px-3"><PerformanceSummary summaries={campaign.performanceSummaries} /></TableCell>
                    <TableCell className="px-3"><div className="flex items-center gap-2 whitespace-nowrap"><Badge variant="outline" className={`${statusMeta.className} shrink-0 whitespace-nowrap border-0 font-medium`}>{statusMeta.label}</Badge>{campaign.hasOverlap ? <Tooltip><TooltipTrigger asChild><span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[4px] text-amber-700 hover:bg-amber-50" onClick={event => event.stopPropagation()}><AlertTriangle className="size-4 shrink-0" strokeWidth={1.75} /><span className="sr-only">Overlaps another campaign</span></span></TooltipTrigger><TooltipContent side="top" sideOffset={6}>Another campaign overlaps these dates.</TooltipContent></Tooltip> : null}</div></TableCell>
                    <TableCell className="px-3"><CampaignTrendChart trend={campaign.performanceTrend} label={campaign.name} startDate={campaign.startDate} endDate={campaign.endDate} /></TableCell>
                    <TableCell
                      className="px-2 text-right"
                      onClick={event => event.stopPropagation()}
                      onKeyDown={event => event.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-[6px] border border-transparent bg-general-secondary text-general-unofficial-mid-alt hover:border-general-border hover:bg-general-border data-[state=open]:border-general-border data-[state=open]:bg-general-border"
                            aria-label={`Actions for ${campaign.name}`}
                          >
                            <MoreHorizontal className="size-4" strokeWidth={1.5} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          sideOffset={6}
                          className="w-44 rounded-[8px] border-general-border p-1.5"
                        >
                          <DropdownMenuItem
                            className="h-9 cursor-pointer gap-2 rounded-[6px] px-2.5"
                            onClick={event => {
                              event.stopPropagation();
                              openReport(campaign.id);
                            }}
                          >
                            <FileText className="size-4 text-muted-foreground" strokeWidth={1.5} />
                            View report
                          </DropdownMenuItem>
                          {canManage ? (
                            <>
                              <DropdownMenuItem
                                className="h-9 cursor-pointer gap-2 rounded-[6px] px-2.5"
                                onClick={event => {
                                  event.stopPropagation();
                                  openEdit(campaign);
                                }}
                              >
                                <Pencil className="size-4 text-muted-foreground" strokeWidth={1.5} />
                                Edit campaign
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1 bg-general-border" />
                              <DropdownMenuItem
                                className="h-9 cursor-pointer gap-2 rounded-[6px] px-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onClick={event => {
                                  event.stopPropagation();
                                  setDeleting(campaign);
                                }}
                              >
                                <Trash2 className="size-4" strokeWidth={1.5} />
                                Delete campaign
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>;
                })}</TableBody>
              </TableElement>
            </Table>
          )}
        </section>
      </main>

      <CampaignImpactReportSheet
        open={Boolean(selectedCampaignId)}
        onOpenChange={open => { if (!open) setSelectedCampaignId(null); }}
        businessId={businessId}
        campaignId={selectedCampaignId}
      />
      <CampaignFormSheet open={formOpen} onOpenChange={setFormOpen} businessId={businessId} locations={locations} campaign={editing} />
      <AlertDialog open={Boolean(deleting)} onOpenChange={open => !open && !mutations.remove.isPending && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete campaign?</AlertDialogTitle><AlertDialogDescription>This removes “{deleting?.name}” from Campaign Tracking and Analytics. Previously shared reports stay available.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={mutations.remove.isPending}>Cancel</AlertDialogCancel><AlertDialogAction onClick={event => { event.preventDefault(); void confirmDelete(); }} disabled={mutations.remove.isPending} className="bg-destructive text-white hover:bg-destructive/90">{mutations.remove.isPending ? <><Loader2 className="size-4 animate-spin" />Deleting</> : "Delete campaign"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
