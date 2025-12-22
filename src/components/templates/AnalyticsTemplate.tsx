"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { OrganicPerformanceSection } from "@/components/organisms/analytics/OrganicPerformanceSection";
import { LocalSearchSection } from "@/components/organisms/analytics/LocalSearchSection";
import { ReviewsSection } from "@/components/organisms/analytics/ReviewsSection";
import { NavigationTabs, PeriodSelector } from "../molecules/analytics";
import { PageHeader } from "@/components/molecules/PageHeader";
import { TIME_PERIODS, type TimePeriodValue } from "@/hooks/use-gsc-analytics";
import { useBusinessStore } from "@/store/business-store";
import DiscoveryPerformanceSection from "@/components/organisms/analytics/DiscoveryPerformanceSection";
import SourcesSection from "@/components/organisms/analytics/SourcesSection";
import ConversionSection from "@/components/organisms/analytics/ConversionSection";

import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { useEntitlementGate } from "@/hooks/use-entitlement-gate";

const navItems = [
  { id: "discovery", label: "Discovery" },
  { id: "sources", label: "Sources" },
  { id: "conversion", label: "Conversions" },
  { id: "local-search", label: "Local Search" },
];

export function AnalyticsTemplate() {
  const [activeSection, setActiveSection] = useState("discovery");
  const [selectedPeriod, setSelectedPeriod] =
    useState<TimePeriodValue>("3 months");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

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

  const isTrialActive =
    ((profileData as any)?.isTrialActive ??
      (businessProfile as any)?.isTrialActive) === true;
      
  const remainingTrialDays =
    typeof (profileData as any)?.remainingTrialDays === "number"
      ? (profileData as any).remainingTrialDays
      : typeof (businessProfile as any)?.remainingTrialDays === "number"
      ? (businessProfile as any).remainingTrialDays
      : undefined;

  const { getCurrentPlan, computedAlertMessage, handleSubscribe, gateLoading } =
    useEntitlementGate({
      entitlement: "strategy",
      businessId: businessId || undefined,
      alertMessage:
        "Free trial active. Upgrade anytime to unlock all features.",
    });

  const businessName =
    businessProfile?.Name || businessProfile?.DisplayName || "Business";

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Analytics" },
    ],
    [businessName]
  );

  const locations = useMemo(() => {
    if (!businessProfile?.Locations || businessProfile.Locations.length === 0) {
      return [];
    }
    return businessProfile.Locations.map((loc, index) => ({
      value: loc.Name,
      label: `${loc.DisplayName} - ${index + 1}`,
    }));
  }, [businessProfile]);

  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].value);
    }
  }, [locations, selectedLocation]);

  const organicRef = useRef<HTMLDivElement>(null);
  const sectionRefs = {
    discovery: useRef<HTMLDivElement>(null),
    sources: useRef<HTMLDivElement>(null),
    conversion: useRef<HTMLDivElement>(null),
    "local-search": useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const sectionStates: Record<string, boolean> = {};

    const updateActiveSection = () => {
      // If organic is intersecting, discovery should be active
      if (sectionStates["organic"]) {
        setActiveSection("discovery");
        return;
      }

      // Otherwise, find the first intersecting section
      const intersectingSections = Object.entries(sectionRefs)
        .filter(([id]) => sectionStates[id])
        .map(([id]) => id);

      if (intersectingSections.length > 0) {
        setActiveSection(intersectingSections[0]);
      }
    };

    // Observe organic section (part of discovery)
    if (organicRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            sectionStates["organic"] = entry.isIntersecting;
            updateActiveSection();
          });
        },
        { rootMargin: "-200px 0px -50% 0px", threshold: 0.1 }
      );
      observer.observe(organicRef.current);
      observers.push(observer);
    }

    // Observe other sections
    Object.entries(sectionRefs).forEach(([id, ref]) => {
      if (ref.current) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              sectionStates[id] = entry.isIntersecting;
              updateActiveSection();
            });
          },
          { rootMargin: "-200px 0px -50% 0px", threshold: 0.1 }
        );
        observer.observe(ref.current);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen scroll-smooth bg-background">
      <PlanModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        currentPlan={isTrialActive ? "Free Trial" : getCurrentPlan()}
        showFooterButtons={true}
        showAlertBar={true}
        alertSeverity="error"
        alertMessage={computedAlertMessage}
        isDescription={false}
        onSelectPlan={handleSubscribe}
        loading={gateLoading}
      />

      {/* Sticky Header with Breadcrumb and Tabs */}
      <div className="sticky top-0 z-11 bg-foreground-light">
        <PageHeader
          trial={
            isTrialActive
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
        <NavigationTabs
          items={navItems}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          periodSelector={
            <PeriodSelector
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
            />
          }
        />
      </div>

      {/* Scrollable Content */}
      <div className="container mx-auto flex flex-col gap-12 p-5">
            <div id="organic" ref={organicRef} className="scroll-mt-[200px]">
              <OrganicPerformanceSection period={selectedPeriod} />
            </div>

            <div
              id="discovery"
              ref={sectionRefs.discovery}
              className="scroll-mt-[200px]"
            >
              <DiscoveryPerformanceSection period={selectedPeriod} />
            </div>

            <div
              id="sources"
              ref={sectionRefs.sources}
              className="scroll-mt-[200px]"
            >
              <SourcesSection period={selectedPeriod} />
            </div>

            <div
              id="conversion"
              ref={sectionRefs.conversion}
              className="scroll-mt-[200px]"
            >
              <ConversionSection period={selectedPeriod} />
            </div>

            <div
              id="local-search"
              ref={sectionRefs["local-search"]}
              className="scroll-mt-[200px] flex flex-col gap-4"
            >
              <LocalSearchSection
                period={selectedPeriod}
                locations={locations}
                selectedLocation={selectedLocation}
                onLocationChange={setSelectedLocation}
              />

              <ReviewsSection
                period={selectedPeriod}
                selectedLocation={selectedLocation}
              />
            </div>
      </div>
    </div>
  );
}
