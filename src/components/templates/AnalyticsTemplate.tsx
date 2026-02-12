"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Eye, MousePointerClick, Target } from "lucide-react";
import {
  OrganicPerformanceSection,
  type OrganicPerformanceSectionProps,
} from "@/components/organisms/analytics/OrganicPerformanceSection";
import { AnalyticsPageTabs, PeriodSelector } from "../molecules/analytics";
import { PageHeader } from "@/components/molecules/PageHeader";
import { type TimePeriodValue } from "@/hooks/use-gsc-analytics";
import { useBusinessStore } from "@/store/business-store";
import DiscoveryPerformanceSection from "@/components/organisms/analytics/DiscoveryPerformanceSection";
import { LocalSearchSection } from "@/components/organisms/analytics/LocalSearchSection";
import SourcesSection from "@/components/organisms/analytics/SourcesSection";
import ConversionSection from "@/components/organisms/analytics/ConversionSection";
import { Button } from "@/components/ui/button";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { useEntitlementGate } from "@/hooks/use-entitlement-gate";
import { usePrefetchAnalyticsPages } from "@/hooks/use-prefetch-analytics-pages";
import { cn } from "@/lib/utils";

const CHART_LINE_KEYS = ["impressions", "clicks", "goals"] as const;

export function AnalyticsTemplate() {
  const [selectedPeriod, setSelectedPeriod] =
    useState<TimePeriodValue>("3 months");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    impressions: true,
    clicks: true,
    goals: true,
  });

  const handleChartLineToggle = useCallback((key: string, checked: boolean) => {
    setVisibleLines((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length;
      if (!checked && checkedCount <= 1) return prev;
      return { ...prev, [key]: checked };
    });
  }, []);

  const pathname = usePathname();
  const profiles = useBusinessStore((state) => state.profiles);

  const { businessId, businessProfile } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/);
    if (!match)
      return { businessId: null as string | null, businessProfile: null };

    const id = match[1];
    const profile = profiles.find((p) => p.UniqueId === id);
    return { businessId: id, businessProfile: profile || null };
  }, [pathname, profiles]);

  const { profileData } = useBusinessProfileById(businessId);
  const { prefetchPage1 } = usePrefetchAnalyticsPages(businessId);

  useEffect(() => {
    if (businessId) {
      let cleanup: (() => void) | undefined;
      prefetchPage1().then((cleanupFn) => {
        cleanup = cleanupFn;
      });
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [businessId, prefetchPage1]);

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
    return (locs as { Name?: string; DisplayName?: string }[]).map((loc) => ({
      value: loc.Name ?? "",
      label: loc.DisplayName || loc.Name || "",
    }));
  }, [profileData, businessProfile]);

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
          <AnalyticsPageTabs businessId={businessId} />
          <div className="flex items-center gap-2">
            {CHART_LINE_KEYS.map((key) => (
              <Button
                key={key}
                variant="outline"
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0",
                  visibleLines[key] ? "bg-white" : "bg-transparent"
                )}
                onClick={() =>
                  handleChartLineToggle(key, !visibleLines[key])
                }
                title={
                  key === "impressions"
                    ? "Impressions"
                    : key === "clicks"
                      ? "Clicks"
                      : "Goals"
                }
                aria-pressed={visibleLines[key]}
              >
                {key === "impressions" ? (
                  <Eye className="h-4 w-4 text-gray-500" />
                ) : key === "clicks" ? (
                  <MousePointerClick className="h-4 w-4 text-blue-600 rotate-90" />
                ) : (
                  <Target className="h-4 w-4 text-emerald-600" />
                )}
              </Button>
            ))}
            <PeriodSelector
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
            />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="w-full max-w-[1224px] flex flex-col">
        <div className="p-7 pb-10">
          <OrganicPerformanceSection
            period={selectedPeriod}
            visibleLines={visibleLines}
            onLegendToggle={handleChartLineToggle}
          />
        </div>
        <DiscoveryPerformanceSection period={selectedPeriod} />
        <SourcesSection period={selectedPeriod} />
        <ConversionSection period={selectedPeriod} />
        <LocalSearchSection period={selectedPeriod} locations={localSearchLocations} />
      </div>
    </div>
  );
}
