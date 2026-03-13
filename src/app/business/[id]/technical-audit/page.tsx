"use client";

import * as React from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/molecules/PageHeader";
import { HealthScoreRing } from "@/components/organisms/TechinicalAudit/HealthScoreRing";
import { CategoriesCard } from "@/components/organisms/TechinicalAudit/CategoriesCard";
import { DomainHealthCard } from "@/components/organisms/TechinicalAudit/DomainHealthCard";
import { IssuesAccordion } from "@/components/organisms/TechinicalAudit/IssuesAccordion";
import { ApplyCreditsModal } from "@/components/molecules/ApplyCreditsModal";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { CreditModal } from "@/components/molecules/settings/CreditModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader, LoaderOverlay } from "@/components/ui/loader";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  type AuditIssue,
  type CategoryKey,
} from "@/components/organisms/TechinicalAudit/types";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { useEntitlementGate } from "@/hooks/use-entitlement-gate";
import { useExecutionCredits } from "@/hooks/use-execution-credits";
import { useTechnicalAuditExecution } from "@/hooks/use-technical-audit-execution";
import { useTechAudit } from "@/hooks/use-tech-audit";

const FALLBACK_ISSUES: AuditIssue[] = [];
const FALLBACK_COUNTS: Record<
  CategoryKey,
  { total: number; critical: number; warning: number; notice: number }
> = {
  technical: { total: 0, critical: 0, warning: 0, notice: 0 },
  links: { total: 0, critical: 0, warning: 0, notice: 0 },
  content: { total: 0, critical: 0, warning: 0, notice: 0 },
  performance: { total: 0, critical: 0, warning: 0, notice: 0 },
  security: { total: 0, critical: 0, warning: 0, notice: 0 },
  accessibility: { total: 0, critical: 0, warning: 0, notice: 0 },
};

const FIXED_CATEGORY_KEYS: CategoryKey[] = [
  "technical",
  "links",
  "content",
  "performance",
];

function formatLastUpdatedLabel(params: {
  status: string | null;
  lastUpdatedAt: Date | null;
}) {
  const { status, lastUpdatedAt } = params;
  if (!lastUpdatedAt) {
    if (status === "in_progress") return "Updating…";
    return "Last updated —";
  }

  const dateLabel = lastUpdatedAt.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
  if (status === "in_progress") return `Updating… (as of ${dateLabel})`;
  return `Last updated ${dateLabel}`;
}

export default function BusinessTechnicalAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [businessId, setBusinessId] = React.useState<string>("");
  const [regenOverlayOpen, setRegenOverlayOpen] = React.useState(false);
  const [hasStartedAudit, setHasStartedAudit] = React.useState(false);
  const [selectedCategory, setSelectedCategory] =
    React.useState<CategoryKey | null>(null);
  const [openIssueId, setOpenIssueId] = React.useState<string | null>(null);
  const didAutoOpenIssueRef = React.useRef(false);

  // Execution-blocked: set when can-execute denies the request
  const [executionBlocked, setExecutionBlocked] = React.useState(false);

  // Modal state
  const [showPlanModal, setShowPlanModal] = React.useState(false);
  const [planModalMessage, setPlanModalMessage] = React.useState("");
  const [showApplyCreditsModal, setShowApplyCreditsModal] = React.useState(false);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = React.useState(false);
  const [buyCreditsAlertMessage, setBuyCreditsAlertMessage] = React.useState("");
  const [pendingAuditAction, setPendingAuditAction] =
    React.useState<(() => Promise<void>) | null>(null);
  const [pendingCreditsRequired, setPendingCreditsRequired] = React.useState(10);
  const [pendingCreditsBalance, setPendingCreditsBalance] = React.useState(0);

  // Resolve businessId from route params
  React.useEffect(() => {
    let active = true;
    setBusinessId("");
    params.then(({ id }) => {
      if (active) setBusinessId(id);
    });
    return () => { active = false; };
  }, [params]);

  // ── Hooks ──
  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null);
  const businessName = profileData?.Name || profileData?.DisplayName || "Business";

  const {
    business,
    entitled,
    gateLoading,
    subscriptionLoading,
    getCurrentPlan,
    computedAlertMessage,
    handleSubscribe,
  } = useEntitlementGate({
    entitlement: "analytics",
    businessId: businessId || undefined,
    alertMessage: "Upgrade your plan to access this feature.",
  });

  const { creditsBalance, purchaseCredits, refetchData: refetchCreditsData } =
    useExecutionCredits();

  const { checkCanExecute, isCheckingCanExecute, updateUsage, isUpdatingUsage } =
    useTechnicalAuditExecution();

  const website = (profileData?.Website as string | undefined) ?? null;

  // Only enable the audit hook when the user actually has plan access
  const hasAccess = !gateLoading && entitled;
  const techAudit = useTechAudit({
    businessId: hasAccess ? businessId || null : null,
    website: hasAccess ? website : null,
    autoCreateOnMissing: false,
  });

  // Reset blocked state when switching businesses
  React.useEffect(() => {
    setExecutionBlocked(false);
    setHasStartedAudit(false);
  }, [businessId]);

  // ── Derived data ──
  const issues = techAudit.data.issues.length > 0 ? techAudit.data.issues : FALLBACK_ISSUES;
  const healthScore = techAudit.data.healthScore ?? 0;
  const pagesCrawled = techAudit.data.pagesCrawled ?? 0;
  const categoryCounts = techAudit.data.categoryCounts ?? FALLBACK_COUNTS;
  const categories = FIXED_CATEGORY_KEYS;
  const domainLabel =
    techAudit.data.raw?.result?.site?.domain ||
    techAudit.data.raw?.site?.domain ||
    techAudit.domain ||
    "";

  const domainHealth = React.useMemo(() => {
    const items = techAudit.data.domainHealth;
    if (!items || items.length === 0) return [];
    const byKey = new Map(items.map((i) => [i.key, i]));
    const pick = (key: string, label?: string) => {
      const it = byKey.get(key);
      return it ? (label ? { ...it, label } : it) : null;
    };
    return [
      pick("ssl", "SSL/TLS"),
      pick("test_https_redirect", "HTTPS Redirect"),
      pick("sitemap", "Sitemap"),
      pick("robots_txt", "Robots.txt"),
      pick("canonicalization", "Canonicalization") ?? pick("test_canonicalization", "Canonicalization"),
    ].filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [techAudit.data.domainHealth]);

  const visibleIssues = React.useMemo(() => {
    return selectedCategory ? issues.filter((i) => i.category === selectedCategory) : issues;
  }, [issues, selectedCategory]);

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Technical Audit", href: `/business/${businessId}/technical-audit` },
    ],
    [businessId, businessName]
  );

  const lastUpdatedLabel = React.useMemo(
    () =>
      formatLastUpdatedLabel({
        status: techAudit.data.status ?? null,
        lastUpdatedAt: techAudit.data.lastUpdatedAt ?? null,
      }),
    [techAudit.data.lastUpdatedAt, techAudit.data.status]
  );

  // ── Category/issue UI helpers ──
  React.useEffect(() => {
    if (!selectedCategory || categories.length === 0) return;
    if (!categories.includes(selectedCategory)) setSelectedCategory(null);
  }, [categories, selectedCategory]);

  React.useEffect(() => {
    if (didAutoOpenIssueRef.current || openIssueId || visibleIssues.length === 0) return;
    setOpenIssueId(visibleIssues[0]?.id ?? null);
    didAutoOpenIssueRef.current = true;
  }, [openIssueId, visibleIssues]);

  React.useEffect(() => {
    didAutoOpenIssueRef.current = false;
    setOpenIssueId(null);
  }, [businessId]);

  // ── Audit execution ──
  const executeTechnicalAudit = React.useCallback(
    async (mode: "generate" | "regenerate") => {
      if (!businessId) return;
      if (mode === "regenerate") setRegenOverlayOpen(true);
      if (mode === "generate") setHasStartedAudit(true);

      try {
        await techAudit.createAudit();
      } catch {
        if (mode === "regenerate") setRegenOverlayOpen(false);
        if (mode === "generate") setHasStartedAudit(false);
        return;
      }

      try {
        const usageResult = await updateUsage({ businessId });
        if (!usageResult?.success) {
          toast.error(usageResult?.message || "Technical audit started, but usage could not be recorded.");
        }
        await refetchCreditsData();
      } catch (err: any) {
        toast.error(err?.message || "Technical audit started, but usage tracking could not be updated.");
      }
    },
    [businessId, techAudit, updateUsage, refetchCreditsData]
  );

  const requestTechnicalAudit = React.useCallback(
    async (mode: "generate" | "regenerate") => {
      if (!businessId || !techAudit.domain) return;

      try {
        const result = await checkCanExecute({ businessId });
        const creditsRequired = result.credits_option?.credits_required ?? 10;
        const currentCredits =
          result.credits_option?.agency_credits_balance ??
          result.execution_credits?.current_balance ??
          creditsBalance?.current_balance ??
          0;

        // No plan / feature not available
        if (!result.success || (!result.can_execute && !result.credits_option)) {
          setPlanModalMessage(result.message || computedAlertMessage);
          setShowPlanModal(true);
          setExecutionBlocked(true);
          return;
        }

        // Plan usage exhausted, can pay with credits
        if (result.credits_option?.can_execute_with_credits) {
          setPendingCreditsRequired(creditsRequired);
          setPendingCreditsBalance(currentCredits);
          setPendingAuditAction(() => () => executeTechnicalAudit(mode));
          setShowApplyCreditsModal(true);
          return;
        }

        // Plan usage exhausted, not enough credits
        if (!result.can_execute && result.credits_option) {
          setPendingCreditsRequired(creditsRequired);
          setPendingCreditsBalance(currentCredits);
          setPendingAuditAction(() => () => executeTechnicalAudit(mode));
          setBuyCreditsAlertMessage(
            `You've used your included technical audit for this billing period. Apply ${creditsRequired} Execution Credits to run another technical audit. Current balance: ${currentCredits} credits.`
          );
          setShowBuyCreditsModal(true);
          return;
        }

        // All good — run the audit
        await executeTechnicalAudit(mode);
      } catch (err: any) {
        toast.error(err?.message || "Failed to start technical audit.");
      }
    },
    [businessId, techAudit.domain, checkCanExecute, creditsBalance?.current_balance, computedAlertMessage, executeTechnicalAudit]
  );

  // Close regen overlay when audit enters polling or finishes
  React.useEffect(() => {
    if (!regenOverlayOpen) return;
    if (techAudit.createError) { setRegenOverlayOpen(false); return; }
    if (techAudit.data.status === "in_progress") { setRegenOverlayOpen(false); return; }
    if (!techAudit.isCreating && techAudit.hasFetched && !techAudit.isFetching) setRegenOverlayOpen(false);
  }, [regenOverlayOpen, techAudit.createError, techAudit.data.status, techAudit.hasFetched, techAudit.isCreating, techAudit.isFetching]);

  // ── Handlers ──
  const handleCategoryToggle = React.useCallback((key: CategoryKey) => {
    setSelectedCategory((prev) => (prev === key ? null : key));
  }, []);

  const handleRegenerate = React.useCallback(() => {
    void requestTechnicalAudit("regenerate");
  }, [requestTechnicalAudit]);

  const handleApplyCreditsConfirm = React.useCallback(async () => {
    if (!pendingAuditAction) return;
    const action = pendingAuditAction;
    setShowApplyCreditsModal(false);
    setPendingAuditAction(null);
    try { await action(); } catch { /* handled in execution flow */ }
  }, [pendingAuditAction]);

  const handlePlanSubscribe = React.useCallback(
    async (planName: string, action: "UPGRADE" | "DOWNGRADE" | "SUBSCRIBE") => {
      if (!business) return;
      await handleSubscribe(planName, action);
    },
    [business, handleSubscribe]
  );

  // ── Render decision: exactly one of these is true ──
  const isLoading = !businessId || profileDataLoading || gateLoading;
  const needsUpgrade = !isLoading && (!entitled || executionBlocked);
  const auditReady = !isLoading && !needsUpgrade;

  const isPolling = auditReady && (techAudit.isCreating || techAudit.data.status === "in_progress");
  const hasAuditData = auditReady && Boolean(techAudit.data.raw);

  const showEmptyState =
    auditReady &&
    techAudit.notFound &&
    !isPolling &&
    !hasStartedAudit &&
    !techAudit.isFetching &&
    !techAudit.fetchError;

  const auditLoading =
    auditReady &&
    !hasAuditData &&
    !isPolling &&
    Boolean(techAudit.domain) &&
    (!techAudit.hasFetched || techAudit.isLoading);

  const regenerateDisabled =
    isCheckingCanExecute || isUpdatingUsage || techAudit.isCreating ||
    !techAudit.data.raw || techAudit.data.status === "in_progress";

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader breadcrumbs={breadcrumbs} />

      <div className="w-full max-w-[1224px] p-5">
        {/* 1. Loading */}
        {isLoading && (
          <Card className="bg-white border-none shadow-none rounded-xl p-4">
            <div className="flex flex-col items-center justify-center gap-4 py-16 h-[calc(100vh-8rem)]">
              <Loader size="lg" />
              <p className="text-base" style={{ color: "#737373" }}>Loading Tech audit</p>
            </div>
          </Card>
        )}

        {/* 2. No plan / execution blocked → upgrade message */}
        {needsUpgrade && (
          <div className="flex min-h-[50vh] items-center justify-center p-12 text-center">
            <div className="w-full max-w-xl">
              <p className="text-lg text-muted-foreground">
                Upgrade your plan to access this feature.
              </p>
              <Button className="mt-4" onClick={() => setShowPlanModal(true)}>
                View Plans
              </Button>
            </div>
          </div>
        )}

        {/* 3. Has plan access → audit content */}
        {auditReady && (
          <LoaderOverlay isLoading={regenOverlayOpen} message="Regenerating technical audit…">
            <Card className="bg-white border-none shadow-none rounded-xl p-4 flex flex-col gap-4">
              {auditLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 h-[calc(100vh-8rem)]">
                  <Loader size="lg" />
                  <p className="text-base" style={{ color: "#737373" }}>Loading Tech audit</p>
                </div>
              ) : (
                <>
                  {(isPolling || (hasStartedAudit && (techAudit.notFound || techAudit.isFetching))) && (
                    <Alert variant="info">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <AlertTitle>
                            {techAudit.isCreating ? "Regenerating your audit" : "We’re generating your audit"}
                          </AlertTitle>
                          <AlertDescription>
                            Once your audit results are ready, this banner will disappear automatically.
                          </AlertDescription>
                        </div>
                        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-700" />
                      </div>
                    </Alert>
                  )}

                  {hasAuditData ? (
                    <>
                      {techAudit.domain && (
                        <DomainHealthCard
                          domain={domainLabel}
                          items={domainHealth}
                          lastUpdatedLabel={lastUpdatedLabel}
                          onRegenerate={handleRegenerate}
                          regenerateDisabled={regenerateDisabled}
                        />
                      )}

                      <div className="flex flex-col gap-4 lg:flex-row">
                        <HealthScoreRing
                          score={Math.round(healthScore)}
                          pagesCrawled={pagesCrawled}
                          deltaLabel={techAudit.data.scoreDeltaLabel ?? "—"}
                        />
                        <CategoriesCard
                          selectedCategory={selectedCategory}
                          categoryCounts={categoryCounts}
                          categories={categories}
                          onCategoryToggle={handleCategoryToggle}
                        />
                      </div>

                      <IssuesAccordion
                        issues={visibleIssues}
                        openIssueId={openIssueId}
                        onOpenIssueIdChange={setOpenIssueId}
                        emptyStateText={
                          !techAudit.domain
                            ? "Add a valid website to generate a technical audit."
                            : techAudit.createError
                              ? techAudit.createError.message || "Failed to generate technical audit."
                              : techAudit.isCreating || techAudit.data.status === "in_progress"
                                ? "Generating audit…"
                                : "No issues found for this filter."
                        }
                      />
                    </>
                  ) : hasStartedAudit ? (
                    <div className="space-y-4">
                      <Card className="rounded-xl border border-border bg-general-primary-foreground shadow-none py-0">
                        <div className="flex items-center justify-between border-b border-border px-3 py-4">
                          <Skeleton className="h-5 w-40" />
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-8 w-28" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-16 w-full" />
                          ))}
                        </div>
                      </Card>

                      <div className="flex flex-col gap-4 lg:flex-row">
                        <Card className="w-full lg:w-[201px] gap-2 rounded-xl border-none px-3 py-3 shadow-none">
                          <Skeleton className="h-5 w-28 mx-auto" />
                          <div className="flex justify-center py-3">
                            <Skeleton className="h-[177px] w-[177px] rounded-full" />
                          </div>
                          <Skeleton className="h-5 w-full" />
                        </Card>

                        <Card className="flex-1 gap-3 rounded-xl border-none py-3 shadow-none">
                          <div className="flex items-center justify-between px-3">
                            <Skeleton className="h-5 w-28" />
                          </div>
                          <div className="grid grid-cols-1 gap-3 px-3 md:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, idx) => (
                              <Skeleton key={idx} className="h-[92px] w-full rounded-lg" />
                            ))}
                          </div>
                        </Card>
                      </div>

                      <Card className="flex flex-col gap-0 rounded-xl border border-border py-0 shadow-none">
                        <div className="grid grid-cols-[1fr_110px] items-center border-b border-border px-3 py-3">
                          <Skeleton className="h-5 w-40" />
                          <div className="flex justify-end">
                            <Skeleton className="h-5 w-24" />
                          </div>
                        </div>
                        <div className="space-y-2 p-3">
                          {Array.from({ length: 6 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-10 w-full rounded-lg" />
                          ))}
                        </div>
                      </Card>
                    </div>
                  ) : null}

                  {!hasAuditData && !isPolling && techAudit.fetchError && (
                    <div className="py-8">
                      <Alert variant="destructive">
                        <AlertTitle>Couldn&apos;t load technical audit</AlertTitle>
                        <AlertDescription>
                          Please try again.
                          <div className="mt-3">
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => void techAudit.refetch()}
                            >
                              Retry
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {showEmptyState && (
                    <div className="flex flex-col items-center justify-center gap-4 py-16 h-[calc(100vh-8rem)] text-center">
                      <p className="text-lg font-medium text-general-foreground">
                        No technical audit yet
                      </p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Generate your first technical audit{domainLabel ? ` for ${domainLabel}` : ""}.
                      </p>
                      <Button
                        type="button"
                        onClick={() => void requestTechnicalAudit("generate")}
                        disabled={!techAudit.domain || isCheckingCanExecute || techAudit.isCreating || isUpdatingUsage}
                      >
                        Generate
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </LoaderOverlay>
        )}
      </div>

      {/* Modals */}
      <PlanModal
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        currentPlan={getCurrentPlan()}
        showFooterButtons={true}
        showAlertBar={true}
        alertSeverity="error"
        alertMessage={planModalMessage || computedAlertMessage}
        isDescription={false}
        onSelectPlan={handlePlanSubscribe}
        loading={gateLoading || subscriptionLoading}
      />

      <ApplyCreditsModal
        open={showApplyCreditsModal}
        onOpenChange={(open) => {
          setShowApplyCreditsModal(open);
          if (!open) setPendingAuditAction(null);
        }}
        onApplyCredits={handleApplyCreditsConfirm}
        creditsBalance={pendingCreditsBalance || creditsBalance?.current_balance || 0}
        creditsToApply={pendingCreditsRequired}
        reportType="technical-audit"
        isApplying={techAudit.isCreating || isUpdatingUsage}
      />

      <CreditModal
        open={showBuyCreditsModal}
        onClose={() => {
          setShowBuyCreditsModal(false);
          setBuyCreditsAlertMessage("");
          setPendingAuditAction(null);
        }}
        currentBalance={pendingCreditsBalance || creditsBalance?.current_balance || 0}
        autoTopupEnabled={creditsBalance?.auto_topup_enabled ?? false}
        autoTopupThreshold={creditsBalance?.auto_topup_threshold ?? 0}
        onPurchaseCredits={purchaseCredits}
        alertMessage={buyCreditsAlertMessage}
        description="You need more execution credits to run another technical audit. Purchase credits to continue."
      />
    </div>
  );
}
