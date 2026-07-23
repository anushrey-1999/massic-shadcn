"use client";

import { useState, useEffect, useMemo, useCallback, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Eye,
  Loader2,
  MousePointerClick,
  RefreshCw,
  Settings2,
  Target,
} from "lucide-react";
import {
  OrganicPerformanceSection,
} from "@/components/organisms/analytics/OrganicPerformanceSection";
import {
  AnalyticsFilterControls,
  AnalyticsReportsActions,
  PeriodSelector,
  PrimaryDriversSheet,
  type AnalyticsGroupBy,
  type AnalyticsKeywordScope,
} from "../molecules/analytics";
import { PageHeader } from "@/components/molecules/PageHeader";
import { type TimePeriodValue } from "@/hooks/use-gsc-analytics";
import { useBusinessStore } from "@/store/business-store";
import DiscoveryPerformanceSection from "@/components/organisms/analytics/DiscoveryPerformanceSection";
import { LocalSearchSection } from "@/components/organisms/analytics/LocalSearchSection";
import SourcesSection from "@/components/organisms/analytics/SourcesSection";
import ConversionSection from "@/components/organisms/analytics/ConversionSection";
import ConversionOverviewSection from "@/components/organisms/analytics/ConversionOverviewSection";
import { Button } from "@/components/ui/button";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { useEntitlementGate } from "@/hooks/use-entitlement-gate";
import { usePrefetchAnalyticsPages } from "@/hooks/use-prefetch-analytics-pages";
import { useStrategy } from "@/hooks/use-strategy";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useOrganicDeepdiveFilters,
  type DeepdiveKeywordScope,
  type DeepdiveFilter,
} from "@/hooks/use-organic-deepdive-filters";
import { OrganicDeepdiveHeader } from "@/components/organisms/organic-deepdive/OrganicDeepdiveHeader";
import { getFallbackAnalyticsGrouping } from "@/utils/analytics-chart-grouping";
import { CustomContentGroupsModal } from "@/components/molecules/analytics/CustomContentGroupsModal";
import { useGscIngestionStatus } from "@/hooks/use-gsc-ingestion-status";
import {
  type Ga4IngestionStatus,
  useGa4Scope,
} from "@/hooks/use-ga4-scope";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const CHART_LINE_KEYS = ["impressions", "clicks", "sessions", "goals"] as const;
const METRIC_TOOLTIPS: Record<(typeof CHART_LINE_KEYS)[number], string> = {
  impressions: "Impressions",
  clicks: "Clicks",
  sessions: "Sessions",
  goals: "Goals",
};
const ALL_GROUP_BY_OPTIONS: AnalyticsGroupBy[] = ["day", "week", "month"];

function formatIngestionStage(stage: string | null | undefined): string {
  if (!stage) return "Preparing Analytics data";
  return stage
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function analyticsScopeLabel(path: string | null | undefined): string {
  return path ? `Landing pages under ${path}` : "Whole GA4 property";
}

interface Ga4IngestionPanelProps {
  status: Ga4IngestionStatus;
  stage?: string | null;
  progress?: number | null;
  error?: string | null;
  retryError?: string | null;
  isRetrying: boolean;
  canRetry: boolean;
  onRetry: () => void;
  onEditScope: () => void;
}

function Ga4IngestionPanel({
  status,
  stage,
  progress,
  error,
  retryError,
  isRetrying,
  canRetry,
  onRetry,
  onEditScope,
}: Ga4IngestionPanelProps) {
  const failed = status === "failed";
  const title =
    status === "queued"
      ? "Analytics reimport is queued"
      : failed
        ? "Analytics import failed"
        : "Analytics data is being imported";

  return (
    <div className="p-7">
      <Alert
        variant={failed ? "destructive" : "info"}
        className="min-h-[240px] p-6"
        aria-live="polite"
      >
        <div className="flex h-full flex-col justify-between gap-6">
          <div className="flex items-start gap-4">
            {failed ? (
              <AlertCircle className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
            ) : (
              <Loader2 className="mt-0.5 size-6 shrink-0 animate-spin" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <AlertTitle className="text-lg">{title}</AlertTitle>
              <AlertDescription className="mt-2 max-w-3xl">
                {failed
                  ? error || "Massic could not finish importing the selected GA4 data scope."
                  : "Analytics is temporarily unavailable while Massic replaces the dataset. Google Search Console data and generated reports are unaffected."}
              </AlertDescription>

              {!failed ? (
                <div className="mt-6 max-w-2xl">
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium">{formatIngestionStage(stage)}</span>
                    {progress !== null && progress !== undefined ? (
                      <span>{Math.round(progress)}%</span>
                    ) : (
                      <span className="text-muted-foreground">Waiting for progress</span>
                    )}
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-general-border"
                    role="progressbar"
                    aria-label="GA4 import progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress ?? undefined}
                    aria-valuetext={
                      progress === null || progress === undefined
                        ? formatIngestionStage(stage)
                        : undefined
                    }
                  >
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary transition-[width]",
                        (progress === null || progress === undefined) && "w-1/4 animate-pulse"
                      )}
                      style={
                        progress !== null && progress !== undefined
                          ? { width: `${progress}%` }
                          : undefined
                      }
                    />
                  </div>
                </div>
              ) : null}

              {retryError ? (
                <p className="mt-4 text-sm text-destructive">{retryError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {failed && canRetry ? (
              <Button type="button" onClick={onRetry} disabled={isRetrying}>
                {isRetrying ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="size-4" aria-hidden="true" />
                )}
                {isRetrying ? "Queuing retry…" : "Retry import"}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onEditScope} disabled={isRetrying}>
              <Settings2 className="size-4" aria-hidden="true" />
              Edit scope
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}

function normalizeBrandTerms(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((term) => String(term || "").trim())
      .filter(Boolean);
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((term) => String(term || "").trim())
          .filter(Boolean);
      }
    } catch {
      return raw
        .split(",")
        .map((term) => term.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export function AnalyticsTemplate() {
  const searchParams = useSearchParams();
  const [selectedPeriod, setSelectedPeriod] =
    useState<TimePeriodValue>("3 months");
  const [selectedTab, setSelectedTab] = useState<"all" | "organic">(
    searchParams.get("tab") === "organic" ? "organic" : "all"
  );
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>("day");
  const [showAnomalyHighlights, setShowAnomalyHighlights] = useState(false);
  const [availableGroupByOptions, setAvailableGroupByOptions] =
    useState<AnalyticsGroupBy[]>(ALL_GROUP_BY_OPTIONS);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [customContentGroupsOpen, setCustomContentGroupsOpen] = useState(false);
  const [primaryDriversOpen, setPrimaryDriversOpen] = useState(false);
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    impressions: true,
    clicks: true,
    sessions: true,
    goals: true,
  });
  const overviewVisibleLines =
    selectedTab === "all"
      ? { impressions: false, clicks: false, sessions: true, goals: true }
      : visibleLines;

  const handleChartLineToggle = useCallback((key: string, checked: boolean) => {
    setVisibleLines((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length;
      if (!checked && checkedCount <= 1) return prev;
      return { ...prev, [key]: checked };
    });
  }, []);

  const pathname = usePathname();
  const router = useRouter();
  const profiles = useBusinessStore((state) => state.profiles);

  const { businessId, businessProfile } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/);
    if (!match)
      return { businessId: null as string | null, businessProfile: null };

    const id = match[1];
    const profile = profiles.find((p) => p.UniqueId === id);
    return { businessId: id, businessProfile: profile || null };
  }, [pathname, profiles]);

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId);
  const { isIngestionActive: isGscIngestionActive } = useGscIngestionStatus(profileData as any);
  const profileGa4Status =
    ((profileData as any)?.Ga4IngestionStatus ??
      (businessProfile as any)?.Ga4IngestionStatus ??
      null) as Ga4IngestionStatus;
  const isBusinessActive =
    ((profileData as any)?.IsActive ?? (businessProfile as any)?.IsActive) !== false;
  const ga4ScopeQuery = useGa4Scope(businessId, {
    enabled: Boolean(businessId && !profileDataLoading && isBusinessActive),
  });
  const profileForGa4Scope = (profileData || businessProfile) as any;
  const ga4IngestionStatus = ga4ScopeQuery.data?.status ?? profileGa4Status;
  const desiredGa4Scope =
    ga4ScopeQuery.data?.desiredPagePathScope ??
    profileForGa4Scope?.Ga4PagePathScope ??
    null;
  const currentGa4Scope =
    ga4ScopeQuery.data?.currentPagePathScope ??
    profileForGa4Scope?.Ga4IngestedPagePathScope ??
    null;
  const desiredGa4ScopeRevision =
    ga4ScopeQuery.data?.desiredRevision ??
    Number(profileForGa4Scope?.Ga4ScopeRevision || 0);
  const currentGa4ScopeRevision =
    ga4ScopeQuery.data?.currentRevision ??
    Number(profileForGa4Scope?.Ga4IngestedScopeRevision || 0);
  const isGa4ScopeReplacementPending = Boolean(
    desiredGa4ScopeRevision !== currentGa4ScopeRevision ||
      desiredGa4Scope !== currentGa4Scope
  );
  const isGa4DataBlocked =
    isGa4ScopeReplacementPending && ga4IngestionStatus === "failed";
  const isToolbarDataBlocked = isGscIngestionActive || isGa4DataBlocked;
  const { prefetchPage1 } = usePrefetchAnalyticsPages(businessId);
  const { fetchStrategyTopicKeywords } = useStrategy(businessId || "");
  const urlTopicName = searchParams.get("topicName")?.trim() || "";
  const hasLegacyQueryTerms = searchParams.getAll("query_term").length > 0;
  const shouldResolveTopicKeywords = urlTopicName.length > 0 && !hasLegacyQueryTerms;

  const {
    data: topicKeywords = [],
    isLoading: topicKeywordsLoading,
    isFetching: topicKeywordsFetching,
    isError: topicKeywordsError,
    error: topicKeywordsErrorData,
    refetch: refetchTopicKeywords,
  } = useQuery({
    queryKey: ["analytics-topic-keywords", businessId, urlTopicName],
    queryFn: () => fetchStrategyTopicKeywords(urlTopicName),
    enabled: !!businessId && shouldResolveTopicKeywords && !isGa4DataBlocked,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: 2,
  });

  useEffect(() => {
    if (
      businessId &&
      !isGa4DataBlocked &&
      !profileDataLoading &&
      !ga4ScopeQuery.isLoading
    ) {
      let cleanup: (() => void) | undefined;
      prefetchPage1().then((cleanupFn) => {
        cleanup = cleanupFn;
      });
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [
    businessId,
    ga4ScopeQuery.isLoading,
    isGa4DataBlocked,
    prefetchPage1,
    profileDataLoading,
  ]);

  const isTrialActive =
    ((profileData as any)?.isTrialActive ??
      (businessProfile as any)?.isTrialActive) === true;

  const remainingTrialDays =
    typeof (profileData as any)?.remainingTrialDays === "number"
      ? (profileData as any).remainingTrialDays
      : typeof (businessProfile as any)?.remainingTrialDays === "number"
        ? (businessProfile as any).remainingTrialDays
        : undefined;

  const { getCurrentPlan, computedAlertMessage, handleSubscribe, gateLoading, subscriptionData } =
    useEntitlementGate({
      entitlement: "strategy",
      businessId: businessId || undefined,
      alertMessage:
        "Free trial active. Upgrade anytime to unlock all features.",
    });

  const isWhitelisted =
    (subscriptionData as any)?.whitelisted === true ||
    (subscriptionData as any)?.status === "whitelisted";

  const showTrialBanner = isTrialActive && !isWhitelisted;

  const businessName =
    businessProfile?.Name || businessProfile?.DisplayName || "Business";

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      {
        label: "Analytics",
        href: businessId ? `/business/${businessId}/analytics` : undefined,
      },
    ],
    [businessName, businessId]
  );

  const localSearchLocations = useMemo(() => {
    const locs = (profileData as any)?.Locations ?? businessProfile?.Locations ?? [];
    const seen = new Set<string>();
    return (locs as { Name?: string; DisplayName?: string; Url?: string }[])
      .filter((loc) => {
        const key = loc.Name ?? "";
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((loc) => {
        const name = loc.Name ?? "";
        const locationId = name.includes("/") ? name.split("/").pop()! : name;
        const displayName = loc.DisplayName || "";
        const label = displayName && locationId
          ? `${displayName} (${locationId})`
          : displayName || locationId || name;
        return { value: name, label };
      });
  }, [profileData, businessProfile]);
  const brandTerms = useMemo(
    () =>
      normalizeBrandTerms(
        (profileData as any)?.BrandTerms ??
          (profileData as any)?.brand_terms ??
          businessProfile?.BrandTerms
      ),
    [profileData, businessProfile?.BrandTerms]
  );
  const topicQueryFilter = useMemo(
    () =>
      shouldResolveTopicKeywords && topicKeywords.length > 0
        ? { topicName: urlTopicName, keywords: topicKeywords }
        : null,
    [shouldResolveTopicKeywords, topicKeywords, urlTopicName]
  );
  const {
    filters,
    filtersForApi,
    addFilter,
    removeFilter,
    clearAllFilters,
    keywordScopeFilter,
  } = useOrganicDeepdiveFilters(brandTerms, topicQueryFilter);
  const keywordScope = (keywordScopeFilter?.expression ??
    "all") as AnalyticsKeywordScope;
  const headerMetricKeys =
    selectedTab === "all"
      ? (["sessions", "goals"] as const)
      : CHART_LINE_KEYS;
  const topicKeywordLookupPending =
    shouldResolveTopicKeywords &&
    (!businessId ||
      ((topicKeywordsLoading || topicKeywordsFetching) && topicKeywords.length === 0));
  const topicKeywordLookupEmpty =
    shouldResolveTopicKeywords &&
    !!businessId &&
    !topicKeywordLookupPending &&
    !topicKeywordsError &&
    topicKeywords.length === 0;

  useEffect(() => {
    if (searchParams.get("tab") === "organic") {
      setSelectedTab("organic");
    }
  }, [searchParams]);

  const handleOverviewFilterSelect = useCallback((filter: DeepdiveFilter) => {
    addFilter(filter);
  }, [addFilter]);

  const handleKeywordScopeChange = useCallback(
    (value: AnalyticsKeywordScope) => {
      if (value === "all") {
        removeFilter("keyword_scope");
        return;
      }

      addFilter({
        dimension: "keyword_scope",
        expression: value as DeepdiveKeywordScope,
        operator: "equals",
      });
    },
    [addFilter, removeFilter]
  );

  const handleTabChange = useCallback(
    (value: string) => {
      const nextTab = value as "all" | "organic";

      if (nextTab === selectedTab) return;

      setSelectedTab(nextTab);

      if (filters.length > 0) {
        clearAllFilters();
      }
    },
    [clearAllFilters, filters.length, selectedTab]
  );

  useEffect(() => {
    if (availableGroupByOptions.includes(groupBy)) return;
    setGroupBy(getFallbackAnalyticsGrouping(groupBy, availableGroupByOptions));
  }, [availableGroupByOptions, groupBy]);

  useEffect(() => {
    if (selectedTab !== "all" || keywordScope === "all") return;
    removeFilter("keyword_scope");
  }, [keywordScope, removeFilter, selectedTab]);

  const INGESTION_ALLOWED_PERIODS = [
    "7 days",
    "14 days",
    "28 days",
    "last week",
    "this month",
    "last month",
    "3 months",
  ] as const;
  useEffect(() => {
    if (!isGscIngestionActive) return;
    if (!INGESTION_ALLOWED_PERIODS.includes(selectedPeriod as any)) {
      setSelectedPeriod("3 months");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGscIngestionActive]);

  useEffect(() => {
    setShowDeferredSections(false);
    if (isGa4DataBlocked) return;

    let completed = false;
    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const revealDeferredSections = () => {
      if (completed) return;
      completed = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      startTransition(() => {
        setShowDeferredSections(true);
      });
    };

    timeoutId = window.setTimeout(revealDeferredSections, 250);

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(revealDeferredSections);
    }

    return () => {
      completed = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [businessId, isGa4DataBlocked]);

  return (
    <div className="flex flex-col min-h-screen scroll-smooth ">
      <PlanModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        currentPlan={isWhitelisted ? "Whitelisted" : showTrialBanner ? "Free Trial" : getCurrentPlan()}
        showFooterButtons={true}
        showAlertBar={true}
        alertSeverity="error"
        alertMessage={computedAlertMessage}
        isDescription={false}
        onSelectPlan={handleSubscribe}
        loading={gateLoading}
      />

      {/* Sticky Header with Breadcrumb and Tabs */}
      <div className="sticky top-0 z-11 bg-foreground-light border-b border-general-border">
        <PageHeader
          trial={
            showTrialBanner
              ? {
                remainingDays: remainingTrialDays,
              }
              : undefined
          }
          onUpgrade={() => {
            if (!gateLoading) setUpgradeOpen(true);
          }}
          breadcrumbs={breadcrumbs}
        />
        <div className="w-full max-w-[1224px] px-7 flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Tabs
              className="gap-0"
              value={selectedTab}
              onValueChange={handleTabChange}
            >
              <TabsList className="h-auto w-[206px] rounded-[12px] bg-general-border p-1">
                <TabsTrigger
                  value="all"
                  className="min-h-8 rounded-[10px] px-4 py-[5.5px] text-sm leading-6 tracking-[0.07px]"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="organic"
                  className="min-h-8 rounded-[10px] px-4 py-[5.5px] text-sm leading-6 tracking-[0.07px]"
                >
                  Organic
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {ga4IngestionStatus === "completed" &&
            !isGa4ScopeReplacementPending &&
            currentGa4Scope ? (
              <Badge
                variant="outline"
                className="max-w-[180px] gap-1.5 border-general-border bg-general-secondary font-medium text-general-foreground"
                title={analyticsScopeLabel(currentGa4Scope)}
              >
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                <span className="truncate">
                  GA4 · {currentGa4Scope}
                </span>
              </Badge>
            ) : null}
            <div className="h-12 w-px shrink-0 bg-general-border" aria-hidden="true" />
            <AnalyticsReportsActions
              onPrimaryDrivers={() => {
                if (!businessId) return;
                setPrimaryDriversOpen(true);
              }}
              onViewReports={() => {
                if (!businessId) return;
                router.push(`/business/${businessId}/reports`);
              }}
              onContentGroupsClick={() => {
                if (!businessId) return;
                setCustomContentGroupsOpen(true);
              }}
              onIndexing={() => {
                if (!businessId) return;
                router.push(`/business/${businessId}/indexing`);
              }}
              reportsDisabled={!businessId}
              primaryDriversDisabled={!businessId}
              isIngestionActive={isToolbarDataBlocked}
              contentGroupsDisabled={!businessId || isGa4DataBlocked}
              indexingDisabled={!businessId}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {headerMetricKeys.map((key) => (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-[8px] border-general-border bg-white shadow-xs",
                        selectedTab === "all" && "cursor-default opacity-70",
                        selectedTab !== "all" && !visibleLines[key] && "bg-transparent shadow-none"
                      )}
                      onClick={() => {
                        if (selectedTab === "all" || isGa4DataBlocked) return;
                        handleChartLineToggle(key, !visibleLines[key]);
                      }}
                      disabled={selectedTab === "all" || isGa4DataBlocked}
                      aria-label={METRIC_TOOLTIPS[key]}
                      aria-pressed={selectedTab === "all" ? true : visibleLines[key]}
                    >
                      {key === "impressions" ? (
                        <Eye className="h-4 w-4 text-[#a855f7]" />
                      ) : key === "clicks" ? (
                        <MousePointerClick className="h-4 w-4 rotate-90 text-[#2563eb]" />
                      ) : key === "sessions" ? (
                        <BarChart3 className="h-4 w-4 text-[#f97316]" />
                      ) : (
                        <Target className="h-4 w-4 text-[#10b981]" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    {METRIC_TOOLTIPS[key]}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <div className="h-12 w-px shrink-0 bg-general-border" aria-hidden="true" />
            <AnalyticsFilterControls
              periodSelector={
                <PeriodSelector
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                  disabledGroupByOptions={ALL_GROUP_BY_OPTIONS.filter(
                    (option) => !availableGroupByOptions.includes(option)
                  )}
                  className="h-10 cursor-pointer rounded-[8px] border-[#d4d4d4] bg-transparent px-4 py-[7.5px] text-sm font-medium tracking-[0.07px] shadow-none"
                  ingestionActive={isGscIngestionActive}
                  disabled={isGa4DataBlocked}
                />
              }
              keywordScope={keywordScope}
              onKeywordScopeChange={handleKeywordScopeChange}
              showKeywordScope={selectedTab === "organic"}
              hasActiveKeywordScope={keywordScope !== "all"}
              anomalyHighlightsEnabled={isToolbarDataBlocked ? false : showAnomalyHighlights}
              onAnomalyHighlightsChange={isToolbarDataBlocked ? undefined : setShowAnomalyHighlights}
              isIngestionActive={isToolbarDataBlocked}
            />
          </div>
        </div>
        {filters.length > 0 ? (
          <div className="w-full max-w-[1224px] px-7">
            <OrganicDeepdiveHeader
              filters={filters}
              onRemoveFilter={removeFilter}
            />
          </div>
        ) : null}
      </div>

      {/* Tab Content */}
      <div className="w-full max-w-[1224px] flex flex-col">
        {isGa4DataBlocked ? (
          <Ga4IngestionPanel
            status={ga4IngestionStatus}
            stage={
              ga4ScopeQuery.data?.stage ??
              profileForGa4Scope?.Ga4IngestionStage ??
              null
            }
            progress={ga4ScopeQuery.data?.progress}
            error={
              ga4ScopeQuery.data?.error ??
              profileForGa4Scope?.Ga4IngestionError ??
              null
            }
            retryError={ga4ScopeQuery.saveError?.message}
            isRetrying={ga4ScopeQuery.isSaving}
            canRetry={Boolean(businessId && ga4ScopeQuery.data)}
            onRetry={() => {
              if (!businessId || !ga4ScopeQuery.data) return;
              void ga4ScopeQuery
                .updateScope({
                  businessUniqueId: businessId,
                  pagePathScope: ga4ScopeQuery.data.desiredPagePathScope,
                })
                .catch(() => undefined);
            }}
            onEditScope={() => {
              if (!businessId) return;
              router.push(
                `/settings?ga4ScopeBusinessId=${encodeURIComponent(businessId)}`
              );
            }}
          />
        ) : topicKeywordLookupPending ? (
          <div className="p-7">
            <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-white p-6 text-center text-muted-foreground">
              Loading topic keywords...
            </div>
          </div>
        ) : shouldResolveTopicKeywords && topicKeywordsError ? (
          <div className="p-7">
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg bg-white p-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="font-medium text-destructive">Failed to load topic keywords</p>
              <p className="text-sm text-muted-foreground">
                {topicKeywordsErrorData instanceof Error
                  ? topicKeywordsErrorData.message
                  : "An error occurred"}
              </p>
              <Button onClick={() => refetchTopicKeywords()}>Try Again</Button>
            </div>
          </div>
        ) : topicKeywordLookupEmpty ? (
          <div className="p-7">
            <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-white p-6 text-center text-muted-foreground">
              No keywords were found for this topic.
            </div>
          </div>
        ) : (
          <>
            <div className="p-7 pb-10">
              <OrganicPerformanceSection
                period={selectedPeriod}
                visibleLines={overviewVisibleLines}
                onLegendToggle={handleChartLineToggle}
                filters={filtersForApi}
                funnelVariant={selectedTab === "all" ? "sessions-goals" : "default"}
                ga4TrafficScope={selectedTab}
                groupBy={groupBy}
                onAvailableGroupingsChange={setAvailableGroupByOptions}
                showAnomalyHighlights={isGscIngestionActive ? false : showAnomalyHighlights}
                isIngestionActive={isGscIngestionActive}
              />
            </div>
            <DiscoveryPerformanceSection
              period={selectedPeriod}
              visibleMetrics={overviewVisibleLines}
              filters={filtersForApi}
              onSelectFilter={isGscIngestionActive ? undefined : handleOverviewFilterSelect}
              onOpenCustomContentGroups={() => setCustomContentGroupsOpen(true)}
              hideTopQueries={selectedTab === "all"}
              hideHowYouRank={selectedTab === "all"}
              ga4TrafficScope={selectedTab}
              isIngestionActive={isGscIngestionActive}
            />
            {showDeferredSections ? (
              <>
                <SourcesSection
                  period={selectedPeriod}
                  hideChannelsChart={selectedTab === "organic"}
                  ga4TrafficScope={selectedTab}
                />
                {selectedTab === "all" ? (
                  <ConversionOverviewSection period={selectedPeriod} />
                ) : null}
                <ConversionSection
                  period={selectedPeriod}
                  ga4TrafficScope={selectedTab}
                />
                <LocalSearchSection period={selectedPeriod} locations={localSearchLocations} />
              </>
            ) : null}
          </>
        )}
      </div>

      <CustomContentGroupsModal
        open={customContentGroupsOpen}
        onOpenChange={setCustomContentGroupsOpen}
        businessUniqueId={businessId}
        siteUrl={businessProfile?.Website || null}
        period={selectedPeriod}
        trafficScope={selectedTab}
      />

      <PrimaryDriversSheet
        open={primaryDriversOpen}
        onOpenChange={setPrimaryDriversOpen}
        businessId={businessId}
        businessName={businessName}
      />
    </div>
  );
}
