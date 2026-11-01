"use client";

import { RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { cn } from "@/lib/utils";

export function StalePlanEmptyState({
  onCreateNewPlan,
  className,
}: {
  onCreateNewPlan: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      title="This plan is out of date"
      description="Please rerun the plan because the source data has changed."
      icon={<RefreshCw className="size-5" />}
      buttons={[
        {
          label: "Create new plan",
          onClick: onCreateNewPlan,
          variant: "default",
          size: "sm",
        },
      ]}
      showCard={false}
      className={cn("min-h-52 gap-6 px-6 py-10", className)}
      iconClassName="size-10 rounded-lg bg-muted"
    />
  );
}
