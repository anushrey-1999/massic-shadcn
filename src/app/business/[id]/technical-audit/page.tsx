"use client";

import * as React from "react";

import { PageHeader } from "@/components/molecules/PageHeader";
import { HealthScoreRing } from "@/components/organisms/TechinicalAudit/HealthScoreRing";
import { CategoriesCard } from "@/components/organisms/TechinicalAudit/CategoriesCard";
import { DomainHealthCard } from "@/components/organisms/TechinicalAudit/DomainHealthCard";
import { IssuesAccordion } from "@/components/organisms/TechinicalAudit/IssuesAccordion";
import { Card } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";
import {
  type AuditIssue,
  type CategoryKey,
} from "@/components/organisms/TechinicalAudit/types";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
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
  const [selectedCategory, setSelectedCategory] =
    React.useState<CategoryKey | null>(null);
  const [openIssueId, setOpenIssueId] = React.useState<string | null>(null);
  const didAutoOpenIssueRef = React.useRef(false);

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id));
  }, [params]);

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null);
  const businessName = profileData?.Name || profileData?.DisplayName || "Business";

  const website = (profileData?.Website as string | undefined) ?? null;
  const techAudit = useTechAudit({ businessId: businessId || null, website });
  const issues = techAudit.data.issues.length > 0 ? techAudit.data.issues : FALLBACK_ISSUES;
  const healthScore = techAudit.data.healthScore ?? 0;
  const pagesCrawled = techAudit.data.pagesCrawled ?? 0;
  const domainHealth = React.useMemo(() => {
    const items = techAudit.data.domainHealth;
    if (!items || items.length === 0) return [];
    const byKey = new Map(items.map((i) => [i.key, i]));

    const pick = (key: string, labelOverride?: string) => {
      const it = byKey.get(key);
      if (!it) return null;
      return labelOverride ? { ...it, label: labelOverride } : it;
    };

    const wwwRedirect =
      pick("www_redirect", "www redirect") ??
      pick("test_www_redirect", "www redirect") ??
      // API currently exposes canonicalization in sample responses; design wants “www redirect”.
      pick("test_canonicalization", "www redirect");

    return [
      pick("ssl", "SSL/TLS"),
      pick("test_https_redirect", "HTTPS Redirect"),
      pick("sitemap", "Sitemap"),
      pick("robots_txt", "Robots.txt"),
      wwwRedirect,
    ].filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [techAudit.data.domainHealth]);
  const domainLabel =
    techAudit.data.raw?.result?.site?.domain ||
    techAudit.data.raw?.site?.domain ||
    techAudit.domain ||
    "";

  const categoryCounts = techAudit.data.categoryCounts ?? FALLBACK_COUNTS;
  const categories = techAudit.data.categoryKeys;

  const visibleIssues = React.useMemo(() => {
    return selectedCategory
      ? issues.filter((i) => i.category === selectedCategory)
      : issues;
  }, [issues, selectedCategory]);

  React.useEffect(() => {
    if (!selectedCategory) return;
    if (categories.length === 0) return;
    if (categories.includes(selectedCategory)) return;
    setSelectedCategory(null);
  }, [categories, selectedCategory]);

  React.useEffect(() => {
    // Auto-open only once (initial load). Allow user to close all accordions.
    if (didAutoOpenIssueRef.current) return;
    if (openIssueId) return;
    if (visibleIssues.length <= 0) return;
    setOpenIssueId(visibleIssues[0]?.id ?? null);
    didAutoOpenIssueRef.current = true;
  }, [openIssueId, visibleIssues]);

  React.useEffect(() => {
    // Reset auto-open when switching businesses.
    didAutoOpenIssueRef.current = false;
    setOpenIssueId(null);
  }, [businessId]);

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Technical Audit", href: `/business/${businessId}/technical-audit` },
    ],
    [businessId, businessName]
  );

  const handleCategoryToggle = React.useCallback((key: CategoryKey) => {
    setSelectedCategory((prev) => (prev === key ? null : key));
  }, []);

  const lastUpdatedLabel = React.useMemo(
    () =>
      formatLastUpdatedLabel({
        status: techAudit.data.status ?? null,
        lastUpdatedAt: techAudit.data.lastUpdatedAt ?? null,
      }),
    [techAudit.data.lastUpdatedAt, techAudit.data.status]
  );

  const showGenerateCta = Boolean(techAudit.domain) && !techAudit.taskId && !techAudit.isCreating;

  const showInitialLoader =
    !businessId ||
    profileDataLoading ||
    (Boolean(techAudit.domain) && !techAudit.storageChecked) ||
    (Boolean(techAudit.taskId) && techAudit.isLoading && !techAudit.data.raw);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader breadcrumbs={breadcrumbs} />

      <div className="w-full max-w-[1224px] p-5">
        <Card className="bg-white border-none shadow-none rounded-xl p-4 flex flex-col gap-4">
          {showInitialLoader ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 h-[calc(100vh-8rem)]">
              <Loader size="lg" />
              <p className="text-base" style={{ color: "#737373" }}>
                Loading Tech audit
              </p>
            </div>
          ) : (
            <>
              {techAudit.domain ? (
                <DomainHealthCard
                  domain={domainLabel}
                  items={domainHealth}
                  lastUpdatedLabel={lastUpdatedLabel}
                  onRegenerate={() => techAudit.createAudit()}
                />
              ) : null}

              <div className="flex flex-col gap-4 lg:flex-row">
                <HealthScoreRing
                  score={Math.round(healthScore)}
                  pagesCrawled={pagesCrawled}
                  deltaLabel={techAudit.data.scoreDeltaLabel ?? undefined}
                />
                <CategoriesCard
                  selectedCategory={selectedCategory}
                  categoryCounts={categoryCounts}
                  categories={categories.length > 0 ? categories : undefined}
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
                      : showGenerateCta
                        ? "Generate audit to see issues."
                        : techAudit.isCreating || techAudit.data.status === "in_progress"
                          ? "Generating audit…"
                          : "No issues found for this filter."
                }
              />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
