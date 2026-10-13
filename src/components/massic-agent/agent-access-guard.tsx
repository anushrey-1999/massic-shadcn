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

export function AgentAccessGuard({
  businessId,
  children,
}: {
  businessId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const job = useJobByBusinessId(businessId);

  if (job.isLoading) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center" role="status">
        <MassicAmoebaLoader label="Checking Agent access…" />
      </div>
    );
  }

  if (job.data?.job_id) {
    return <>{children}</>;
  }

  const title = job.isError
    ? "We couldn’t check your business profile"
    : "Create your business profile to use Massic Agent";
  const description = job.isError
    ? "Try checking again. If the issue continues, open your profile and confirm your business details."
    : "Set up your business profile before using Massic Agent.";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          if (window.history.length > 1) router.back();
          else router.replace(`/business/${encodeURIComponent(businessId)}/analytics`);
        }
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
            Create profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
