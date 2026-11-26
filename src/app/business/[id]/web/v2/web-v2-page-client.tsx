"use client";

import * as React from "react";
import { parseAsStringEnum, useQueryStates } from "nuqs";
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { PageHeader } from "@/components/molecules/PageHeader";
import { WebsiteArchitectureNewPage } from "@/components/organisms/WebsiteArchitectureTable/website-architecture-new-page";
import { WebsiteArchitectureTableClient } from "@/components/organisms/WebsiteArchitectureTable/website-architecture-table-client";
import { WebV2OptimizeTableClient } from "@/components/organisms/WebsiteArchitectureTable/web-v2-optimize-table-client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Typography } from "@/components/ui/typography";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { businessWebHref } from "@/lib/business-navigation";
import { formatVolume } from "@/lib/format";

type WebV2Tab = "new-pages" | "optimize";

const WEB_V2_TABS: WebV2Tab[] = [
  "new-pages",
  "optimize",
];

export function WebV2PageClient({ businessId }: { businessId: string }) {
  const [totalCount, setTotalCount] = React.useState<number | null>(null);
  const [{ tab }, setQuery] = useQueryStates({
    tab: parseAsStringEnum<WebV2Tab>(WEB_V2_TABS).withDefault("new-pages"),
  });
  const { profileData, profileDataLoading } = useBusinessProfileById(businessId);
  const businessName = profileData?.Name || profileData?.DisplayName || "Business";
  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Web", href: businessWebHref(businessId) },
    ],
    [businessId, businessName],
  );

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

  return (
    <div className="flex h-screen flex-col">
      <PageHeader breadcrumbs={breadcrumbs} />
      <EntitlementsGuard
        entitlement="web"
        businessId={businessId}
        alertMessage="You're on Starter. Upgrade your plan to unlock Web."
      >
        <div className="flex min-h-0 w-full max-w-[1224px] flex-1 flex-col p-5">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTotalCount(null);
              void setQuery({ tab: value as WebV2Tab });
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <TabsList className="max-w-full justify-start overflow-x-auto">
                <TabsTrigger value="new-pages">New Pages</TabsTrigger>
                <TabsTrigger value="optimize">Optimize</TabsTrigger>
              </TabsList>
              <div className="ml-auto flex items-center gap-3">
                {totalCount !== null && (
                  <Typography
                    variant="p"
                    className="text-right text-sm tabular-nums text-general-muted-foreground"
                  >
                    {formatVolume(totalCount)} Pages
                  </Typography>
                )}
                <WebsiteArchitectureNewPage key={businessId} businessId={businessId} scope={tab} />
              </div>
            </div>
            <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {tab === "optimize" ? (
                <WebV2OptimizeTableClient
                  businessId={businessId}
                  website={profileData?.Website}
                  onTotalCountChange={setTotalCount}
                />
              ) : (
                <WebsiteArchitectureTableClient
                  businessId={businessId}
                  scope="new-pages"
                  showQuickTypeFilter={false}
                  showDownload={false}
                  showCount={false}
                  onTotalCountChange={setTotalCount}
                  returnToV2
                />
              )}
            </div>
          </Tabs>
        </div>
      </EntitlementsGuard>
    </div>
  );
}
