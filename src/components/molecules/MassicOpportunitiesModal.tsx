"use client";

import { ArrowLeft, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MassicOpportunitiesPlanCard } from "@/components/molecules/PlanCard";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface MassicOpportunitiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade?: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
  alertMessage?: string;
  isActive?: boolean;
  isUpgrading?: boolean;
  isDeactivating?: boolean;
  isReactivating?: boolean;
  cancelAtPeriodEnd?: boolean;
  periodEndDate?: Date;
}

export function MassicOpportunitiesModal({
  open,
  onOpenChange,
  onUpgrade,
  onDeactivate,
  onReactivate,
  alertMessage,
  isActive = false,
  isUpgrading = false,
  isDeactivating = false,
  isReactivating = false,
  cancelAtPeriodEnd = false,
  periodEndDate,
}: MassicOpportunitiesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] p-0 overflow-visible bg-transparent border-none shadow-none"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Upgrade Plan</DialogTitle>
        </VisuallyHidden>
        <div className="flex items-center gap-3 mb-4 -mt-12">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-white shadow-sm shrink-0 h-12"
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Button>
          {alertMessage && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 h-12 flex-1">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-800 flex-1">{alertMessage}</p>
            </div>
          )}
          {!alertMessage && cancelAtPeriodEnd && periodEndDate && (
            <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3 h-12 flex-1">
              <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
              <p className="text-sm text-orange-800 flex-1">
                Your subscription will be cancelled on {new Date(periodEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          )}
        </div>
        <MassicOpportunitiesPlanCard
          onUpgrade={onUpgrade}
          onDeactivate={onDeactivate}
          onReactivate={onReactivate}
          isActive={isActive}
          isUpgrading={isUpgrading}
          isDeactivating={isDeactivating}
          isReactivating={isReactivating}
          cancelAtPeriodEnd={cancelAtPeriodEnd}
        />
      </DialogContent>
    </Dialog>
  );
}
