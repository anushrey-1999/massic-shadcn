"use client";

import { EmptyState } from "@/components/molecules/EmptyState";
import type { JobResponse } from "@/types/profile-v2";
import { getProfileStrategyGate } from "@/utils/profile-strategy-gate";

interface ProfileStrategyGateProps {
  businessId: string;
  job: JobResponse | null | undefined;
  profileHref?: string;
  className?: string;
}

export function ProfileStrategyGate({
  businessId,
  job,
  profileHref,
  className = "min-h-[calc(100vh-12rem)]",
}: ProfileStrategyGateProps) {
  const gate = getProfileStrategyGate(job);
  if (!gate.blocked) return null;

  return (
    <EmptyState
      title={gate.title}
      description={gate.description}
      className={className}
      isProcessing={gate.reason === "processing"}
      buttons={
        gate.reason === "processing"
          ? undefined
          : [
              {
                label: "Go to Profile",
                href: profileHref || `/business/${businessId}/profile`,
                variant: "outline",
                size: "lg",
              },
            ]
      }
    />
  );
}
