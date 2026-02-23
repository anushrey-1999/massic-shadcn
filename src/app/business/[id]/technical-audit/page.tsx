"use client";

import * as React from "react";

import { PageHeader } from "@/components/molecules/PageHeader";
import { HealthScoreRing } from "@/components/organisms/TechinicalAudit/HealthScoreRing";
import { CategoriesCard } from "@/components/organisms/TechinicalAudit/CategoriesCard";
import { IssuesAccordion } from "@/components/organisms/TechinicalAudit/IssuesAccordion";
import { Card } from "@/components/ui/card";
import {
  type AuditIssue,
  type CategoryKey,
} from "@/components/organisms/TechinicalAudit/types";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";

const DUMMY_ISSUES: AuditIssue[] = [
  {
    id: "missing-meta-descriptions",
    title: "Missing Meta Descriptions",
    category: "content",
    description: "Pages lack meta descriptions entirely",
    impact: "high",
    affectedPages: [
      "/services/web-design",
      "/blog/seo-guide-2024",
      "/contact",
      "/about-us/team",
    ],
    solutionSteps: [
      "Identify all pages missing meta descriptions.",
      "Write unique 150–160 char descriptions for each.",
      "Include primary keyword naturally in first half.",
      "Publish via CMS or AutoFix for supported pages.",
    ],
  },
  {
    id: "broken-internal-links",
    title: "Broken Internal Links",
    category: "links",
    description: "Internal links returning 4xx/5xx responses",
    impact: "medium",
    affectedPages: ["/services/", "/services/accounting/", "/services/full-bookkeeping/"],
    solutionSteps: [
      "Find all internal links pointing to non-200 responses.",
      "Update URLs or add redirects to the correct destination.",
      "Re-crawl to confirm the issue is resolved.",
    ],
  },
  {
    id: "render-blocking-resources",
    title: "Render-Blocking Resources",
    category: "performance",
    description: "Critical resources delay first render",
    impact: "low",
    affectedPages: ["/", "/services/"],
    solutionSteps: [
      "Defer non-critical scripts and inline critical CSS where possible.",
      "Load third-party scripts after interaction or with async/defer.",
      "Re-test page timing metrics and Core Web Vitals.",
    ],
  },
  {
    id: "missing-h1",
    title: "Missing H1 Tag",
    category: "content",
    description: "Some pages do not include an H1",
    impact: "medium",
    affectedPages: ["/"],
    solutionSteps: [
      "Add a single descriptive H1 per page.",
      "Ensure it aligns with the page's primary topic and title.",
    ],
  },
  {
    id: "image-alt-missing",
    title: "Images Missing Alt Text",
    category: "accessibility",
    description: "Some images do not provide alt attributes",
    impact: "low",
    affectedPages: ["/", "/services/"],
    solutionSteps: [
      "Add descriptive alt text to meaningful images.",
      "Use empty alt (alt=\"\") for decorative images.",
    ],
  },
  {
    id: "mixed-content",
    title: "Mixed Content References",
    category: "security",
    description: "HTTPS pages reference some HTTP assets",
    impact: "high",
    affectedPages: ["/services/accounting/"],
    solutionSteps: [
      "Locate HTTP asset references and replace them with HTTPS URLs.",
      "Validate no console warnings and no blocked content.",
    ],
  },
  {
    id: "canonical-missing",
    title: "Canonical Tag Missing",
    category: "technical",
    description: "Some pages do not specify canonical URLs",
    impact: "medium",
    affectedPages: ["/blog/"],
    solutionSteps: [
      "Add canonical tags to indexable pages.",
      "Ensure canonicals match the preferred URL version.",
    ],
  },
  {
    id: "duplicate-title",
    title: "Duplicate Title Tags",
    category: "content",
    description: "Multiple pages share the same title tag",
    impact: "medium",
    affectedPages: ["/", "/services/"],
    solutionSteps: [
      "Rewrite titles to be unique and page-specific.",
      "Keep titles concise and keyword-aligned.",
    ],
  },
];

export default function BusinessTechnicalAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [businessId, setBusinessId] = React.useState<string>("");
  const [selectedCategory, setSelectedCategory] =
    React.useState<CategoryKey | null>(null);
  const [openIssueId, setOpenIssueId] = React.useState<string | null>(
    "missing-meta-descriptions"
  );
  const [doneIssueIds, setDoneIssueIds] = React.useState<Set<string>>(
    () => new Set()
  );

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id));
  }, [params]);

  const { profileData } = useBusinessProfileById(businessId || null);
  const businessName = profileData?.Name || profileData?.DisplayName || "Business";

  const healthScore = 68;
  const pagesCrawled = 154;

  const categoryCounts = React.useMemo(() => {
    const base: Record<CategoryKey, { total: number; critical: number }> = {
      technical: { total: 0, critical: 0 },
      links: { total: 0, critical: 0 },
      content: { total: 0, critical: 0 },
      performance: { total: 0, critical: 0 },
      security: { total: 0, critical: 0 },
      accessibility: { total: 0, critical: 0 },
    };

    for (const issue of DUMMY_ISSUES) {
      base[issue.category].total += 1;
      if (issue.impact === "high") base[issue.category].critical += 1;
    }
    return base;
  }, []);

  const visibleIssues = React.useMemo(() => {
    return selectedCategory
      ? DUMMY_ISSUES.filter((i) => i.category === selectedCategory)
      : DUMMY_ISSUES;
  }, [selectedCategory]);

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

  const handleToggleDone = React.useCallback((issueId: string) => {
    setDoneIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <PageHeader breadcrumbs={breadcrumbs} />

      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5">
        <Card className="bg-white border-none shadow-none rounded-xl p-4 h-full min-h-0 flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            <HealthScoreRing score={healthScore} pagesCrawled={pagesCrawled} />
            <CategoriesCard
              selectedCategory={selectedCategory}
              categoryCounts={categoryCounts}
              lastUpdatedLabel="Last updated 12 Feb"
              onCategoryToggle={handleCategoryToggle}
            />
          </div>

          <IssuesAccordion
            issues={visibleIssues}
            openIssueId={openIssueId}
            onOpenIssueIdChange={setOpenIssueId}
            doneIssueIds={doneIssueIds}
            onToggleDone={handleToggleDone}
          />
        </Card>
      </div>
    </div>
  );
}
