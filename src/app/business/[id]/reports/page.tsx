"use client";

import * as React from "react";

import { PageHeader } from "@/components/molecules/PageHeader";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { ReportsTableClient } from "@/components/organisms/ReportsTable/reports-table-client";
import { AnalyticsPageTabs } from "@/components/molecules/analytics";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function BusinessReportsPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>("");

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id));
  }, [params]);

  const { profileData, profileDataLoading } = useBusinessProfileById(
    businessId || null
  );

  const businessName =
    profileData?.Name || profileData?.DisplayName || "Business";

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Analytics", href: `/business/${businessId}/analytics` },
      { label: "Reports", href: `/business/${businessId}/reports` },
    ],
    [businessName, businessId]
  );

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (profileDataLoading) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader breadcrumbs={breadcrumbs} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} />
      <div className="w-full max-w-[1224px] px-7 flex items-center gap-4 py-4">
        <AnalyticsPageTabs businessId={businessId} />
      </div>
      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
        <div className="flex-1 min-h-0 overflow-hidden">
          <ReportsTableClient businessId={businessId} />
        </div>
      </div>
    </div>
  );
}
