"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { PeriodSelector } from "@/components/molecules/analytics/PeriodSelector";
import { ANALYTICS_TOOLBAR_BUTTON_CLASS } from "@/components/molecules/analytics/AnalyticsHeaderActions";
import { SmartSitemapSourceTags } from "@/components/organisms/smart-sitemap/SmartSitemapCells";
import { SmartSitemapEngagementCard } from "@/components/organisms/smart-sitemap/SmartSitemapEngagementCard";
import { SmartSitemapAISection } from "@/components/organisms/smart-sitemap/SmartSitemapAISection";
import { SmartSitemapIndexingPanel } from "@/components/organisms/smart-sitemap/SmartSitemapIndexingPanel";
import { SmartSitemapKeywordsPanel } from "@/components/organisms/smart-sitemap/SmartSitemapKeywordsPanel";
import { MetricCard } from "@/components/molecules/analytics/MetricCard";
import { SmartSitemapStatusBadge } from "@/components/organisms/smart-sitemap/SmartSitemapStatusBadge";
import { SmartSitemapTrendPanel } from "@/components/organisms/smart-sitemap/SmartSitemapTrendPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import {
  useSmartSitemapPage,
  useSmartSitemapPageIndexing,
} from "@/hooks/use-smart-sitemap";
import {
  CHART_LINE_KEYS,
  DETAIL_METRICS,
  fillDailySeries,
  firstSeenSource,
  formatDay,
  formatMetric,
  metricChangeBadge,
  metricValue,
  pageUrl,
  siteHost,
  type ChartLineKey,
  type DetailMetricKey,
} from "@/lib/smart-sitemap";
import {
  resolveTimePeriodRange,
  type OptInTimePeriod,
  type TimePeriodValue,
} from "@/utils/analytics-period";

const DEFAULT_PERIOD: TimePeriodValue = "60 days";
const OPT_IN_PERIODS: readonly OptInTimePeriod[] = ["60 days"];
const KPI_KEYS: DetailMetricKey[] = [
  "impressions",
  "clicks",
  "position",
  "sessions",
  "keyEvents",
];
const TAB_TRIGGER_CLASS =
  "text-general-foreground h-auto min-h-8 min-w-0 sm:min-w-[125px] flex-1 gap-2 rounded-[10px] px-3 sm:px-4 py-[5.5px] text-sm leading-[1.5] font-medium tracking-[0.07px] data-[state=active]:bg-white data-[state=active]:shadow-none";

type DetailTab = "performance" | "indexing" | "ai";

function readPeriod(value: string | null): TimePeriodValue {
  return value && resolveTimePeriodRange(value as TimePeriodValue)
    ? (value as TimePeriodValue)
    : DEFAULT_PERIOD;
}

export function SmartSitemapPageTemplate({
  businessId,
  pageId,
}: {
  businessId: string;
  pageId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profileData } = useBusinessProfileById(businessId);
  const businessName =
    profileData?.Name || profileData?.DisplayName || "Business";
  const website = profileData?.Website ?? null;

  const period = readPeriod(searchParams.get("period"));
  const requestedTab = searchParams.get("tab");
  const tab: DetailTab =
    requestedTab === "ai" || requestedTab === "indexing" ? requestedTab : "performance";
  const updateParams = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const pageQuery = useSmartSitemapPage(businessId, pageId, period);
  const indexingQuery = useSmartSitemapPageIndexing(businessId, pageId, period);
  const data = pageQuery.data;
  const updating = pageQuery.isFetching && !pageQuery.isLoading;
  const notFound =
    pageQuery.isError &&
    !data &&
    (pageQuery.error as { response?: { status?: number } })?.response
      ?.status === 404;

  const series = useMemo(
    () =>
      data
        ? fillDailySeries(data.series, data.meta.range, {
            gsc: data.meta.sources.gsc.dataThrough,
            ga4: data.meta.sources.ga4.dataThrough,
          })
        : [],
    [data],
  );
  const lineTotals = (scope: "current" | "previous") => {
    const gsc = scope === "current" ? data?.gsc : data?.previous.gsc;
    const ga4 = scope === "current" ? data?.ga4 : data?.previous.ga4;
    return Object.fromEntries(
      CHART_LINE_KEYS.map((key) => [key, metricValue(key, gsc, ga4)]),
    ) as Record<ChartLineKey, number | null>;
  };

  const listHref = `/business/${businessId}/analytics/pages${period === DEFAULT_PERIOD ? "" : `?period=${encodeURIComponent(period)}`}`;
  const path = data?.page.path;
  const firstSeen = data
    ? firstSeenSource(data.page.firstSeen.source, data.page.sources)
    : null;
  const liveUrl = path ? pageUrl(website, path) : null;
  const host = siteHost(website);
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: businessName },
    { label: "Analytics", href: `/business/${businessId}/analytics` },
    { label: "Sitemap", href: listHref },
    { label: path ?? "Page" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-general-primary-foreground">
      <PageHeader breadcrumbs={breadcrumbs} />
      <main className="w-full max-w-[1224px] flex-1 px-5 py-6 md:px-7">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <Link
              href={listHref}
              className="inline-flex items-center gap-1.5 text-xs text-general-muted-foreground transition-colors hover:text-general-foreground"
            >
              <ArrowLeft className="size-3.5" />
              All pages
            </Link>
            {data ? (
              <>
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <h1 className="min-w-0 break-all text-lg font-medium text-general-foreground">
                    {data.page.path}
                  </h1>
                  <SmartSitemapStatusBadge
                    status={data.indexing.status}
                    reason={data.indexing.coverageState}
                  />
                </div>
                {host ? (
                  <p className="text-xs text-general-muted-foreground">
                    {host}
                  </p>
                ) : null}
                <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-default items-center gap-1.5">
                        <dt className="text-general-muted-foreground">
                          First seen
                        </dt>
                        <dd className="text-general-foreground">
                          <span className="font-medium">
                            {formatDay(data.page.firstSeen.date)}
                          </span>
                          {data.page.firstSeen.date ? (
                            <span className="text-general-muted-foreground">
                              {" "}
                              {firstSeen?.label}
                            </span>
                          ) : null}
                        </dd>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      align="start"
                      className="max-w-[320px] text-xs"
                    >
                      {firstSeen?.hint}
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-2">
                    <dt className="text-general-muted-foreground">Found in</dt>
                    <dd>
                      <SmartSitemapSourceTags sources={data.page.sources} />
                    </dd>
                  </div>
                </dl>
              </>
            ) : notFound ? null : (
              <>
                <Skeleton className="h-6 w-72" />
                <Skeleton className="h-3 w-96 max-w-full" />
              </>
            )}
          </div>
          {!notFound ? (
            <div className="flex shrink-0 items-center gap-2">
              {updating ? (
                <span
                  className="inline-flex items-center gap-1.5 text-xs text-general-muted-foreground"
                  role="status"
                >
                  <Loader2 className="size-3.5 animate-spin" />
                  Updating
                </span>
              ) : null}
              {liveUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  className={ANALYTICS_TOOLBAR_BUTTON_CLASS}
                  asChild
                >
                  <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink strokeWidth={1.5} />
                    Open page
                  </a>
                </Button>
              ) : null}
              <PeriodSelector
                value={period}
                onValueChange={(value) =>
                  updateParams({
                    period: value === DEFAULT_PERIOD ? null : value,
                  })
                }
                optInPeriods={OPT_IN_PERIODS}
              />
            </div>
          ) : null}
        </div>

        {notFound ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-general-border bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-general-foreground">
              This page is not in the sitemap
            </p>
            <p className="max-w-md text-sm text-general-muted-foreground">
              It may have been removed from the inventory, or the link belongs
              to another business.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href={listHref}>Back to all pages</Link>
            </Button>
          </div>
        ) : pageQuery.isError && !data ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-general-border bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-general-foreground">
              Page details could not be loaded
            </p>
            <p className="max-w-md text-sm text-general-muted-foreground">
              The request failed or timed out. Try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => pageQuery.refetch()}
              disabled={pageQuery.isFetching}
            >
              {pageQuery.isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {pageQuery.isError && data ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-general-border bg-white px-4 py-2.5 text-sm">
                <span className="text-general-muted-foreground">
                  The new period could not be loaded. Showing the previous
                  results.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => pageQuery.refetch()}
                  disabled={pageQuery.isFetching}
                >
                  Try again
                </Button>
              </div>
            ) : null}

            <div
              className="grid grid-cols-2 rounded-lg border border-general-border bg-white p-2 transition-opacity sm:grid-cols-3 lg:grid-cols-5"
              style={{ opacity: updating ? 0.6 : 1 }}
            >
              {KPI_KEYS.map((key) => {
                const metric = DETAIL_METRICS[key];
                const current = data
                  ? metricValue(key, data.gsc, data.ga4)
                  : null;
                const badge = data
                  ? metricChangeBadge(
                      metric.format,
                      current,
                      metricValue(key, data.previous.gsc, data.previous.ga4),
                    )
                  : undefined;
                return (
                  <MetricCard
                    key={key}
                    label={metric.label}
                    value={
                      current == null
                        ? "--"
                        : formatMetric(metric.format, current)
                    }
                    change={badge?.value}
                    changeUnit={badge?.unit}
                    changeLabel={badge?.label}
                    emptyMessage={`No ${metric.source === "gsc" ? "Search Console" : "Google Analytics"} data for this page`}
                    isLoading={!data}
                  />
                );
              })}
            </div>

            <Tabs
              className="gap-0"
              value={tab}
              onValueChange={(value) =>
                updateParams({ tab: value === "performance" ? null : value })
              }
            >
              <TabsList className="h-auto w-full rounded-[12px] bg-general-border p-1 sm:w-fit">
                <TabsTrigger value="performance" className={TAB_TRIGGER_CLASS}>
                  Performance
                </TabsTrigger>
                <TabsTrigger value="indexing" className={TAB_TRIGGER_CLASS}>
                  Indexing
                </TabsTrigger>
                <TabsTrigger value="ai" className={TAB_TRIGGER_CLASS}>
                  AI
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {tab === "performance" ? (
              data ? (
                <div
                  className="space-y-4 transition-opacity"
                  style={{ opacity: updating ? 0.6 : 1 }}
                >
                  <SmartSitemapTrendPanel
                    key={`${pageId}-${period}`}
                    series={series}
                    totals={lineTotals("current")}
                    previousTotals={lineTotals("previous")}
                  />
                  <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
                    <div className="min-w-0 lg:col-span-2">
                      <SmartSitemapKeywordsPanel
                        key={`${pageId}-${period}`}
                        keywords={data.keywords}
                      />
                    </div>
                    <SmartSitemapEngagementCard
                      current={{ gsc: data.gsc, ga4: data.ga4 }}
                      previous={{
                        gsc: data.previous.gsc,
                        ga4: data.previous.ga4,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Skeleton className="h-[320px] w-full rounded-lg" />
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Skeleton className="h-[200px] w-full rounded-lg lg:col-span-2" />
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                  </div>
                </div>
              )
            ) : tab === "ai" ? (
              data && !pageQuery.isPlaceholderData ? (
                <SmartSitemapAISection
                  key={`${businessId}-${pageId}-${period}`}
                  businessId={businessId}
                  period={period}
                  scopeRevision={Number(
                    (profileData as { Ga4ScopeRevision?: number } | null)?.Ga4ScopeRevision || 0,
                  )}
                  pageScope={{ pageId, from: data.meta.range.from, to: data.meta.range.to }}
                />
              ) : (
                <Skeleton className="h-[400px] w-full rounded-lg" />
              )
            ) : (
              <SmartSitemapIndexingPanel
                pages={indexingQuery.data?.pages}
                isLoading={indexingQuery.isLoading}
                isError={indexingQuery.isError}
                isRefetching={indexingQuery.isFetching}
                hasNextPage={Boolean(indexingQuery.hasNextPage)}
                loadingMore={indexingQuery.isFetchingNextPage}
                onLoadMore={() => {
                  if (!indexingQuery.isFetchingNextPage)
                    indexingQuery.fetchNextPage();
                }}
                onRetry={() => indexingQuery.refetch()}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
