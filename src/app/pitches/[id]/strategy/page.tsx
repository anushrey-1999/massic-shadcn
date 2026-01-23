"use client"

import React from "react";
import { useParams } from "next/navigation";

import BusinessStrategyPage from "@/app/business/[id]/strategy/page";
import { WorkflowStatusBanner } from "@/components/molecules/WorkflowStatusBanner";
import { useJobByBusinessId } from "@/hooks/use-jobs";

export default function PitchStrategyPage() {
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

  return <BusinessStrategyPage params={businessParams} />;
}

