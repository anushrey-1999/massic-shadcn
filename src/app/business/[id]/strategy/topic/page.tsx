"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsJson } from "nuqs";
import { AlertCircle, Layers, List } from "lucide-react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { WorkflowStatusBanner } from "@/components/molecules/WorkflowStatusBanner";
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { WebPageTable } from "@/components/organisms/WebPageTable/web-page-table";
import { SocialTableClient } from "@/components/organisms/SocialTable/social-table-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Typography } from "@/components/ui/typography";
import { useBlogPagePlan } from "@/hooks/use-blog-page-plan";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { useStrategy } from "@/hooks/use-strategy";
import { getWorkflowStatus, isWorkflowSuccess } from "@/lib/workflow-status";
import type { QueryKeys } from "@/types/data-table-types";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

type TopicFilter = {
  id: string;
  field: string;
  value: string | string[];
  variant: string;
  operator: string;
  filterId: string;
};

const TOPIC_PAGE_SIZE = 10;
const TOPIC_PAGE_SIZE_OPTIONS = [10, 30, 50, 100, 200];
type TopicActionsLayout = "tabs" | "stacked";

function buildKeywordFilter(field: "supporting_keywords" | "related_keywords", keywords: string[]): TopicFilter | null {
  if (keywords.length === 0) return null;

  return {
    id: field,
    field,
    filterId: field,
    value: keywords,
    variant: "multiSelect",
    operator: "inArray",
  };
}

function TopicSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-[420px] flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <Typography variant="h3" className="text-base font-semibold text-general-foreground">
          {title}
        </Typography>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function TopicActionSectionContent({
  businessId,
  keywords,
  isWebReady,
  isSocialReady,
  section,
}: {
  businessId: string;
  keywords: string[];
  isWebReady: boolean;
  isSocialReady: boolean;
  section: "web" | "engage" | "publish";
}) {
  if (section === "web") {
    return isWebReady ? (
      <TopicWebPagesTable businessId={businessId} keywords={keywords} />
    ) : (
      <WorkflowStatusBanner
        businessId={businessId}
        workflowKey="webpages"
        emptyStateHeight="min-h-[320px]"
      />
    );
  }

  return isSocialReady ? (
    <TopicSocialTable
      businessId={businessId}
      keywords={keywords}
      strategyType={section === "engage" ? "engage" : "publish"}
      title={section === "engage" ? "Engage" : "Publish"}
    />
  ) : (
    <WorkflowStatusBanner
      businessId={businessId}
      workflowKey="social_channels"
      emptyStateHeight="min-h-[320px]"
    />
  );
}

function TopicDetailsPanel({
  topicName,
  keywords,
}: {
  topicName: string;
  keywords: string[];
}) {
  return (
    <section className="rounded-lg bg-white p-4">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <Typography variant="p" className="text-xs font-mono uppercase text-general-muted-foreground">
            Topic
          </Typography>
          <Typography variant="h2" className="text-xl font-semibold text-general-foreground">
            {topicName}
          </Typography>
        </div>
        <div className="space-y-2">
          <Typography variant="p" className="text-xs font-mono uppercase text-general-muted-foreground">
            Keywords
          </Typography>
          <div className="flex flex-wrap items-start gap-1">
            {keywords.map((keyword) => (
              <Badge key={keyword} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TopicWebPagesTable({
  businessId,
  keywords,
}: {
  businessId: string;
  keywords: string[];
}) {
  const queryKeys: QueryKeys = React.useMemo(
    () => ({
      page: "topicWebPage",
      perPage: "topicWebPerPage",
      sort: "topicWebSort",
      filters: "topicWebFilters",
      joinOperator: "topicWebJoinOperator",
    }),
    []
  );

  const [page] = useQueryState(queryKeys.page, parseAsInteger.withDefault(1));
  const [perPage] = useQueryState(queryKeys.perPage, parseAsInteger.withDefault(TOPIC_PAGE_SIZE));
  const [search, setSearch] = useQueryState("topicWebSearch", parseAsString.withDefault(""));
  const [sort] = useQueryState(
    queryKeys.sort,
    parseAsJson<Array<{ field: string; desc: boolean }>>((value) => {
      if (Array.isArray(value)) return value as Array<{ field: string; desc: boolean }>;
      return null;
    }).withDefault([])
  );
  const [filters] = useQueryState(
    queryKeys.filters,
    parseAsJson<TopicFilter[]>((value) => {
      if (Array.isArray(value)) return value as TopicFilter[];
      return null;
    }).withDefault([])
  );
  const [joinOperator] = useQueryState(queryKeys.joinOperator, parseAsString.withDefault("and"));

  const { fetchWebPages } = useBlogPagePlan(businessId);
  const topicFilter = React.useMemo(() => buildKeywordFilter("supporting_keywords", keywords), [keywords]);
  const effectiveFilters = React.useMemo(() => {
    return topicFilter ? [topicFilter, ...(filters || [])] : filters || [];
  }, [filters, topicFilter]);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "strategy-topic-web-pages",
      businessId,
      keywords,
      page,
      perPage,
      search || "",
      JSON.stringify(sort),
      JSON.stringify(filters),
      joinOperator,
    ],
    queryFn: () =>
      fetchWebPages({
        business_id: businessId,
        page,
        perPage,
        search: search || undefined,
        sort: sort || [],
        filters: effectiveFilters as any,
        joinOperator: (joinOperator || "and") as "and" | "or",
      }),
    enabled: !!businessId && keywords.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    placeholderData: (previousData) => previousData,
    retry: 2,
  });

  if (isError) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg bg-white p-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-destructive">Failed to load web pages</p>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "An error occurred"}
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <WebPageTable
      businessId={businessId}
      data={data?.data || []}
      pageCount={data?.pageCount || 0}
      offeringCounts={{}}
      queryKeys={queryKeys}
      isLoading={isLoading && !data}
      isFetching={isFetching}
      search={search}
      onSearchChange={setSearch}
      pageSize={TOPIC_PAGE_SIZE}
      pageSizeOptions={TOPIC_PAGE_SIZE_OPTIONS}
    />
  );
}

function TopicSocialTable({
  businessId,
  keywords,
  title,
  strategyType,
}: {
  businessId: string;
  keywords: string[];
  title: string;
  strategyType: "engage" | "publish";
}) {
  const topicFilter = React.useMemo(() => buildKeywordFilter("related_keywords", keywords), [keywords]);
  const baseFilters = React.useMemo(() => (topicFilter ? [topicFilter] : []), [topicFilter]);
  const keyPrefix = strategyType === "engage" ? "topicSocialEngage" : "topicSocialPublish";

  return (
    <SocialTableClient
      businessId={businessId}
      strategyType={strategyType}
      queryKeys={{
        page: `${keyPrefix}Page`,
        perPage: `${keyPrefix}PerPage`,
        sort: `${keyPrefix}Sort`,
        filters: `${keyPrefix}Filters`,
        joinOperator: `${keyPrefix}JoinOperator`,
      }}
      searchKey={`${keyPrefix}Search`}
      channelNameKey={`${keyPrefix}Channel`}
      campaignNameKey={`${keyPrefix}Campaign`}
      defaultPerPage={TOPIC_PAGE_SIZE}
      defaultJoinOperator="and"
      pageSizeOptions={TOPIC_PAGE_SIZE_OPTIONS}
      baseFilters={baseFilters}
      tacticsBaseFilters={baseFilters}
      toolbarRightPrefix={
        <Typography variant="p" className="text-sm font-mono text-general-muted-foreground">
          {title}
        </Typography>
      }
    />
  );
}

function StrategyTopicContent({
  businessId,
  topicName,
  keywords,
  keywordsLoading,
  keywordsError,
  keywordsErrorMessage,
  onRetryKeywords,
  isWebReady,
  isSocialReady,
}: {
  businessId: string;
  topicName: string;
  keywords: string[];
  keywordsLoading: boolean;
  keywordsError: boolean;
  keywordsErrorMessage?: string;
  onRetryKeywords: () => void;
  isWebReady: boolean;
  isSocialReady: boolean;
}) {
  const [layout, setLayout] = React.useState<TopicActionsLayout>("tabs");

  if (!topicName.trim()) {
    return (
      <div className="w-full max-w-[1224px] flex-1 p-5">
        <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-white p-6 text-center text-muted-foreground">
          This topic link is missing a topic name.
        </div>
      </div>
    );
  }

  if (keywordsLoading) {
    return (
      <div className="w-full max-w-[1224px] flex-1 p-5">
        <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-white p-6 text-center text-muted-foreground">
          Loading topic keywords...
        </div>
      </div>
    );
  }

  if (keywordsError) {
    return (
      <div className="w-full max-w-[1224px] flex-1 p-5">
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg bg-white p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium text-destructive">Failed to load topic keywords</p>
          <p className="text-sm text-muted-foreground">
            {keywordsErrorMessage || "An error occurred"}
          </p>
          <Button onClick={onRetryKeywords}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <div className="w-full max-w-[1224px] flex-1 p-5">
        <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-white p-6 text-center text-muted-foreground">
          No keywords were found for this topic.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1224px] flex-1 min-h-0 overflow-y-auto p-5">
      <div className="flex min-h-full flex-col gap-8">
        <TopicDetailsPanel topicName={topicName} keywords={keywords} />

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => setLayout((current) => (current === "tabs" ? "stacked" : "tabs"))}
              aria-label={layout === "tabs" ? "Show stacked view" : "Show tabbed view"}
              title={layout === "tabs" ? "Show stacked view" : "Show tabbed view"}
            >
              {layout === "tabs" ? <List className="size-4" /> : <Layers className="size-4" />}
            </Button>
          </div>

          {layout === "tabs" ? (
            <Tabs defaultValue="web" className="flex min-h-[520px] flex-col">
              <TabsList className="w-fit shrink-0">
                <TabsTrigger value="web">Web New Pages</TabsTrigger>
                <TabsTrigger value="engage">Social Engage</TabsTrigger>
                <TabsTrigger value="publish">Social Publish</TabsTrigger>
              </TabsList>
              <TabsContent value="web" className="mt-4 min-h-0 flex-1">
                <div className="h-[520px]">
                  <TopicActionSectionContent
                    businessId={businessId}
                    keywords={keywords}
                    isWebReady={isWebReady}
                    isSocialReady={isSocialReady}
                    section="web"
                  />
                </div>
              </TabsContent>
              <TabsContent value="engage" className="mt-4 min-h-0 flex-1">
                <div className="h-[520px]">
                  <TopicActionSectionContent
                    businessId={businessId}
                    keywords={keywords}
                    isWebReady={isWebReady}
                    isSocialReady={isSocialReady}
                    section="engage"
                  />
                </div>
              </TabsContent>
              <TabsContent value="publish" className="mt-4 min-h-0 flex-1">
                <div className="h-[520px]">
                  <TopicActionSectionContent
                    businessId={businessId}
                    keywords={keywords}
                    isWebReady={isWebReady}
                    isSocialReady={isSocialReady}
                    section="publish"
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col gap-8">
              <TopicSection title="Web New Pages">
                <TopicActionSectionContent
                  businessId={businessId}
                  keywords={keywords}
                  isWebReady={isWebReady}
                  isSocialReady={isSocialReady}
                  section="web"
                />
              </TopicSection>

              <TopicSection title="Social Engage">
                <TopicActionSectionContent
                  businessId={businessId}
                  keywords={keywords}
                  isWebReady={isWebReady}
                  isSocialReady={isSocialReady}
                  section="engage"
                />
              </TopicSection>

              <TopicSection title="Social Publish">
                <TopicActionSectionContent
                  businessId={businessId}
                  keywords={keywords}
                  isWebReady={isWebReady}
                  isSocialReady={isSocialReady}
                  section="publish"
                />
              </TopicSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BusinessStrategyTopicPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState("");
  const [topicName] = useQueryState("topicName", parseAsString.withDefault(""));
  const normalizedTopicName = topicName.trim();

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id));
  }, [params]);

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null);
  const { data: jobDetails, isLoading: jobDetailsLoading } = useJobByBusinessId(businessId || null);
  const { fetchStrategyTopicKeywords } = useStrategy(businessId);

  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status;
  const showMainContent = coreStatus === "success";
  const isWebReady = showMainContent && isWorkflowSuccess(jobDetails, "webpages");
  const isSocialReady = showMainContent && isWorkflowSuccess(jobDetails, "social_channels");
  const businessName = profileData?.Name || profileData?.DisplayName || "Business";
  const displayTopicName = topicName || "Topic";

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Strategy", href: `/business/${businessId}/strategy` },
      { label: displayTopicName },
    ],
    [businessName, businessId, displayTopicName]
  );

  const {
    data: keywords = [],
    isLoading: keywordsLoading,
    isFetching: keywordsFetching,
    isError: keywordsError,
    error: keywordsErrorData,
    refetch: refetchKeywords,
  } = useQuery({
    queryKey: ["strategy-topic-keywords", businessId, normalizedTopicName],
    queryFn: () => fetchStrategyTopicKeywords(normalizedTopicName),
    enabled:
      !!businessId &&
      !jobDetailsLoading &&
      showMainContent &&
      normalizedTopicName.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: 2,
  });

  if (!businessId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (profileDataLoading) {
    return (
      <div className="flex h-screen flex-col">
        <PageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const content = !jobDetailsLoading && showMainContent ? (
    <StrategyTopicContent
      businessId={businessId}
      topicName={normalizedTopicName}
      keywords={keywords}
      keywordsLoading={keywordsLoading || (keywordsFetching && keywords.length === 0)}
      keywordsError={keywordsError}
      keywordsErrorMessage={
        keywordsErrorData instanceof Error ? keywordsErrorData.message : undefined
      }
      onRetryKeywords={() => refetchKeywords()}
      isWebReady={isWebReady}
      isSocialReady={isSocialReady}
    />
  ) : (
    <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
      <WorkflowStatusBanner
        businessId={businessId}
        emptyStateHeight="min-h-[calc(100vh-12rem)]"
      />
    </div>
  );

  return (
    <div className="flex h-screen flex-col">
      <PageHeader breadcrumbs={breadcrumbs} />
      <EntitlementsGuard entitlement="strategy" businessId={businessId}>
        {content}
      </EntitlementsGuard>
    </div>
  );
}
