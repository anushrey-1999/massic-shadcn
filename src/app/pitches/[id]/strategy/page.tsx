"use client"

import React from "react";
import { useParams } from "next/navigation";

import BusinessStrategyPage from "@/app/business/[id]/strategy/page";
import { WorkflowStatusBanner } from "@/components/molecules/WorkflowStatusBanner";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { getWorkflowStatus } from "@/lib/workflow-status";
import { ProfileStrategyGate } from "@/components/molecules/ProfileStrategyGate";
import { getProfileStrategyGate } from "@/utils/profile-strategy-gate";

export default function PitchStrategyPage() {
  const params = useParams();
  const businessId = (params as any)?.id as string | undefined;
  const { data: jobDetails, isLoading } = useJobByBusinessId(businessId ?? null);

  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status;
  const canShowData = coreStatus === "success";
  const profileGate = getProfileStrategyGate(jobDetails);

  const businessParams = React.useMemo(() => {
    return Promise.resolve({ id: businessId || "" });
  }, [businessId]);

  if (!businessId) return null;

  if (!isLoading && profileGate.blocked) {
    return (
      <div className="flex flex-col h-screen">
        <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
          <ProfileStrategyGate
            businessId={businessId}
            job={jobDetails}
            profileHref={`/pitches/${businessId}/profile`}
          />
        </div>
      </div>
    );
  }

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

  return <BusinessStrategyPage params={businessParams} skipEntitlements />;
}

