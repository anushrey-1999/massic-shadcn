"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { getOverallWorkflowStatus } from "@/lib/workflow-status";

export function AgentAccessGuard({
  businessId,
  children,
}: {
  businessId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const job = useJobByBusinessId(businessId);
  const status = getOverallWorkflowStatus(job.data);

  if (job.isLoading) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center" role="status">
        <MassicAmoebaLoader label="Checking Agent access…" />
      </div>
    );
  }

  if (job.data && status === "success") {
    return <>{children}</>;
  }

  const title = job.isError
    ? "We couldn’t check your strategy"
    : status === "pending" || status === "processing"
      ? "Your strategy is still running"
      : "Complete your profile to use Massic Agent";
  const description = job.isError
    ? "Try checking again. If the issue continues, open your profile and confirm your business details."
    : status === "pending" || status === "processing"
      ? "Massic Agent will be available after every strategy workflow finishes successfully."
      : status === "error"
        ? "Your strategy did not finish successfully. Review your profile and run the strategy again before using Massic Agent."
        : "Complete your business profile and run the strategy before using Massic Agent.";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.push(`/business/${encodeURIComponent(businessId)}/analytics`);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {job.isError && (
            <Button variant="outline" onClick={() => void job.refetch()} disabled={job.isFetching}>
              {job.isFetching ? "Checking…" : "Try again"}
            </Button>
          )}
          <Button onClick={() => router.push(`/business/${encodeURIComponent(businessId)}/profile`)}>
            Complete profile &amp; run strategy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
