"use client"

import React from "react";
import { useParams } from "next/navigation";

import BusinessAdsPage from "@/app/business/[id]/ads/page";
import { WorkflowStatusBanner } from "@/components/molecules/WorkflowStatusBanner";
import { useJobByBusinessId } from "@/hooks/use-jobs";

export default function PitchAdsPage() {
  const params = useParams();
  const businessId = (params as any)?.id as string | undefined;
  const { data: jobDetails, isLoading } = useJobByBusinessId(businessId ?? null);

  const workflowStatus = jobDetails?.workflow_status?.status;
  const canShowData = workflowStatus === "success";

  const businessParams = React.useMemo(() => {
    return Promise.resolve({ id: businessId || "" });
  }, [businessId]);

  if (!businessId) return null;

  if (isLoading || !canShowData) {
    return (
      <div className="flex flex-col h-screen">
        <WorkflowStatusBanner
          businessId={businessId}
          profileHref={`/pitches/${businessId}/profile`}
          emptyStateHeight="h-[calc(100vh-12rem)]"
        />
      </div>
    );
  }

  return <BusinessAdsPage params={businessParams} />;
}

