"use client";

import React from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Check,
  Minus,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import { useAccessRequestDetail } from "@/hooks/use-access-requests";
import { PRODUCT_CONFIG, STATUS_CONFIG } from "@/config/access-request";
import type { AccessRequest, AccessRequestStep, StepStatus } from "@/types/access-request";
import { cn } from "@/lib/utils";

interface AccessRequestDetailProps {
  request: AccessRequest | null;
  onClose: () => void;
}

function StepStatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return <Check className="h-4 w-4 text-green-600" />;
    case "in_progress":
      return (
        <span className="relative flex h-3.5 w-3.5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
        </span>
      );
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "manual_required":
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    default:
      return <Minus className="h-4 w-4 text-gray-400" />;
  }
}

function StepCard({ step }: { step: AccessRequestStep }) {
  const config = PRODUCT_CONFIG[step.product];
  const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;

  return (
    <div className="rounded-lg border border-general-border p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <StepStatusIcon status={step.status} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{config?.label || step.product}</span>
              <Badge
                variant="outline"
                className="text-[10px]"
              >
                {config?.shortLabel || step.product.toUpperCase()}
              </Badge>
            </div>
            <Badge
              variant={statusConfig.variant}
              className={cn("text-[10px]", statusConfig.className)}
            >
              {statusConfig.label}
            </Badge>
          </div>

          {step.selectedAssets && step.selectedAssets.length > 0 && (
            <div className="text-xs text-general-muted-foreground">
              <span className="font-medium">Selected assets: </span>
              {step.selectedAssets.length} item{step.selectedAssets.length !== 1 ? "s" : ""}
            </div>
          )}

          {step.error && (
            <div className="text-xs text-red-600 bg-red-50 rounded p-2 break-words overflow-hidden">
              {step.error}
            </div>
          )}

          {step.completedAt && (
            <div className="text-xs text-general-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Completed{" "}
              {new Date(step.completedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AccessRequestDetail({
  request,
  onClose,
}: AccessRequestDetailProps) {
  const { data: detail } = useAccessRequestDetail(request?.id ?? null);
  const displayData = detail || request;

  function copyLink() {
    if (!displayData) return;
    const url =
      displayData.requestUrl ||
      `${window.location.origin}/google-access/r/${displayData.token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  const statusConfig = displayData
    ? STATUS_CONFIG[displayData.status] || STATUS_CONFIG.pending
    : STATUS_CONFIG.pending;

  return (
    <Sheet open={!!request} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Request Details</SheetTitle>
          <SheetDescription>
            View the status and details of this access request.
          </SheetDescription>
        </SheetHeader>

        {displayData && (
          <div className="space-y-5 px-4 pb-4">
            {/* Copy Link */}
            <Button
              variant="outline"
              className="w-full justify-start text-xs font-mono"
              onClick={copyLink}
            >
              <Copy className="h-3.5 w-3.5 mr-2 shrink-0" />
              <span className="truncate">
                {displayData.requestUrl ||
                  `${typeof window !== "undefined" ? window.location.origin : ""}/google-access/r/${displayData.token}`}
              </span>
            </Button>

            {/* Metadata */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-general-muted-foreground">
                  Agency Email
                </span>
                <span className="text-sm font-mono">
                  {displayData.agencyEmail}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-general-muted-foreground">
                  Status
                </span>
                <Badge
                  variant={statusConfig.variant}
                  className={cn("text-xs", statusConfig.className)}
                >
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-general-muted-foreground">
                  Created
                </span>
                <span className="text-sm">
                  {new Date(displayData.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-general-muted-foreground">
                  Expires
                </span>
                <span className="text-sm">
                  {new Date(displayData.expiresAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <Separator />

            {/* Steps */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Steps</h4>
              {displayData.steps && displayData.steps.length > 0 ? (
                <div className="space-y-2">
                  {displayData.steps.map((step) => (
                    <StepCard key={step.id} step={step} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-general-muted-foreground">
                  No steps recorded yet. The client has not started the flow.
                </p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
