"use client";

import * as React from "react";

import { PageHeader } from "@/components/molecules/PageHeader";
import { WebPageView } from "@/components/organisms/web-page-actions/web-page-view";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";

interface PageProps {
  params: Promise<{
    id: string;
    pageId: string;
  }>;
}

export default function WebUnifiedPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>("");
  const [pageId, setPageId] = React.useState<string>("");

  React.useEffect(() => {
    params.then(({ id, pageId }) => {
      setBusinessId(id);
      setPageId(pageId);
    });
  }, [params]);

  const { profileData } = useBusinessProfileById(businessId || null)
  const businessName = profileData?.Name || profileData?.DisplayName || "Business"

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Web", href: `/business/${businessId}/web` },
      { label: "View" },
    ],
    [businessName, businessId]
  )

  if (!businessId || !pageId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <PageHeader breadcrumbs={breadcrumbs} />
      <div className="container mx-auto flex-1 min-h-0 py-5 px-4 overflow-hidden flex flex-col">
        <WebPageView businessId={businessId} pageId={pageId} />
      </div>
    </div>
  );
}
