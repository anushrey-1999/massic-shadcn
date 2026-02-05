"use client"

import React from "react";
import { useParams } from "next/navigation";

import { WorkflowStatusBanner } from "@/components/molecules/WorkflowStatusBanner";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { PageHeader } from "@/components/molecules/PageHeader";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { WorkflowStatusBanner as BusinessWorkflowStatusBanner } from "@/components/molecules/WorkflowStatusBanner";
import { WebPageTableClient } from "@/components/organisms/WebPageTable/web-page-table-client";

export default function PitchWebPage() {
  const params = useParams();
  const businessId = (params as any)?.id as string | undefined;
  const { data: jobDetails, isLoading } = useJobByBusinessId(businessId ?? null);

  const workflowStatus = jobDetails?.workflow_status?.status;
  const canShowData = workflowStatus === "success";

  if (!businessId) return null;

  if (isLoading || !canShowData) {
    return (
      <div className="flex flex-col h-screen">
        <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
          <WorkflowStatusBanner
            businessId={businessId}
            profileHref={`/pitches/${businessId}/profile`}
            emptyStateHeight="min-h-[calc(100vh-12rem)]"
          />
        </div>
      </div>
    );
  }

  return <PitchWebSuccessView businessId={businessId} />;
}

function PitchWebSuccessView({ businessId }: { businessId: string }) {
  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null);
  const businessName = profileData?.Name || profileData?.DisplayName || "Business";

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: "Pitches", href: "/pitches" },
      { label: businessName },
      { label: "Web", href: `/pitches/${businessId}/web` },
    ],
    [businessId, businessName]
  );

  if (profileDataLoading) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />
      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
        <BusinessWorkflowStatusBanner
          businessId={businessId}
          profileHref={`/pitches/${businessId}/profile`}
          emptyStateHeight="min-h-[calc(100vh-16rem)]"
        />
        <WebPageTableClient businessId={businessId} hideActions={true}/>
      </div>
    </div>
  );
}

