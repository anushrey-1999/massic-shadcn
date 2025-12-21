"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { usePathname } from "next/navigation"
import {
  OrganicPerformanceSection,
  WebPerformanceSection,
  AISearchSection,
  LocalSearchSection,
  ReviewsSection,
} from "./sections"
import { AnalyticsHeader, NavigationTabs, PeriodSelector } from "./components"
import { TIME_PERIODS, type TimePeriodValue } from "@/hooks/use-gsc-analytics"
import { useBusinessStore } from "@/store/business-store"
import { useBusinessProfileById } from "@/hooks/use-business-profiles"
import { PlanModal } from "@/components/molecules/settings/PlanModal"
import { useEntitlementGate } from "@/hooks/use-entitlement-gate"

const navItems = [
  { id: "organic", label: "Organic" },
  { id: "web", label: "Web" },
  { id: "ai-search", label: "AI Search" },
  { id: "local-search", label: "Local Search" },
  { id: "reviews", label: "Reviews" },
]

export function AnalyticsTemplate() {
  const [activeSection, setActiveSection] = useState("organic")
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriodValue>("3 months")
  const [selectedLocation, setSelectedLocation] = useState("")
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const pathname = usePathname()
  const profiles = useBusinessStore((state) => state.profiles)

  const { businessId, businessProfile } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/)
    if (!match) return { businessId: null as string | null, businessProfile: null }

    const id = match[1]
    const profile = profiles.find((p) => p.UniqueId === id)
    return { businessId: id, businessProfile: profile || null }
  }, [pathname, profiles])

  const { profileData } = useBusinessProfileById(businessId)

  const isTrialActive =
    ((profileData as any)?.isTrialActive ?? (businessProfile as any)?.isTrialActive) === true
  const remainingTrialDays =
    typeof (profileData as any)?.remainingTrialDays === "number"
      ? (profileData as any).remainingTrialDays
      : typeof (businessProfile as any)?.remainingTrialDays === "number"
        ? (businessProfile as any).remainingTrialDays
        : undefined

  const { getCurrentPlan, computedAlertMessage, handleSubscribe, gateLoading } = useEntitlementGate({
    entitlement: "strategy",
    businessId: businessId || undefined,
    alertMessage: "Free trial active. Upgrade anytime to unlock all features.",
  })

  const businessName = businessProfile?.Name || businessProfile?.DisplayName || "Business"

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Analytics" },
    ],
    [businessName]
  )

  const locations = useMemo(() => {
    if (!businessProfile?.Locations || businessProfile.Locations.length === 0) {
      return []
    }
    return businessProfile.Locations.map((loc, index) => ({
      value: loc.Name,
      label: `${loc.DisplayName} - ${index + 1}`,
    }))
  }, [businessProfile])

  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].value)
    }
  }, [locations, selectedLocation])

  const sectionRefs = {
    organic: useRef<HTMLDivElement>(null),
    web: useRef<HTMLDivElement>(null),
    "ai-search": useRef<HTMLDivElement>(null),
    "local-search": useRef<HTMLDivElement>(null),
    reviews: useRef<HTMLDivElement>(null),
  }

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    Object.entries(sectionRefs).forEach(([id, ref]) => {
      if (ref.current) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setActiveSection(id)
              }
            })
          },
          { rootMargin: "-150px 0px -50% 0px", threshold: 0.1 }
        )
        observer.observe(ref.current)
        observers.push(observer)
      }
    })

    return () => {
      observers.forEach((observer) => observer.disconnect())
    }
  }, [])

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen scroll-smooth">
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
      <div className="sticky top-0 z-11 bg-background border-b border-border">
        <AnalyticsHeader
          breadcrumbs={breadcrumbs}
          trial={
            isTrialActive
              ? {
                remainingDays: remainingTrialDays,
              }
              : undefined
          }
          onUpgrade={() => {
            if (!gateLoading) setUpgradeOpen(true)
          }}
        />
        <NavigationTabs
          items={navItems}
          activeSection={activeSection}
          periodSelector={
            <PeriodSelector
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
            />
          }
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex flex-col gap-12 p-7">
        <div id="organic" ref={sectionRefs.organic} className="scroll-mt-[150px]">
          <OrganicPerformanceSection period={selectedPeriod} />
        </div>

        <div id="web" ref={sectionRefs.web} className="scroll-mt-[150px]">
          <WebPerformanceSection period={selectedPeriod} />
        </div>

        <div id="ai-search" ref={sectionRefs["ai-search"]} className="scroll-mt-[150px]">
          <AISearchSection period={selectedPeriod} />
        </div>

        <div id="local-search" ref={sectionRefs["local-search"]} className="scroll-mt-[150px]">
          <LocalSearchSection
            period={selectedPeriod}
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
          />
        </div>

        <div id="reviews" ref={sectionRefs.reviews} className="scroll-mt-[150px]">
          <ReviewsSection period={selectedPeriod} selectedLocation={selectedLocation} />
        </div>

        {/* Spacer to allow last section to scroll to top for proper tab highlighting */}
        <div className="h-[50vh]" aria-hidden="true" />
      </div>
    </div>
  )
}
