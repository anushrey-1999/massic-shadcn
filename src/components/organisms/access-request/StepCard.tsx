"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, Minus, AlertTriangle, XCircle } from "lucide-react";
import { PRODUCT_CONFIG, STATUS_CONFIG } from "@/config/access-request";
import { ProductIcon } from "./ProductIcon";
import type { AccessRequestStep, StepStatus } from "@/types/access-request";
import { cn } from "@/lib/utils";

function StepStatusIndicator({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return (
        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-4 w-4 text-green-600" />
        </div>
      );
    case "in_progress":
      return (
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
          </span>
        </div>
      );
    case "failed":
      return (
        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="h-4 w-4 text-red-600" />
        </div>
      );
    case "manual_required":
      return (
        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </div>
      );
    default:
      return (
        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
          <Minus className="h-4 w-4 text-gray-400" />
        </div>
      );
  }
}

interface StepCardProps {
  step: AccessRequestStep;
  isActive: boolean;
  onClick: () => void;
}

export function StepCard({ step, isActive, onClick }: StepCardProps) {
  const config = PRODUCT_CONFIG[step.product];
  const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-all",
        isActive
          ? "border-general-primary bg-general-primary/5 shadow-sm"
          : "border-gray-200 hover:border-gray-300 bg-white"
      )}
    >
      <div className="flex items-center gap-3">
        <StepStatusIndicator status={step.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ProductIcon product={step.product} size={16} />
            <span className="text-sm font-medium text-gray-900">
              {config?.shortLabel || step.product.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {config?.label || step.product}
          </p>
        </div>
        <Badge
          variant={statusConfig.variant}
          className={cn("text-[10px] shrink-0", statusConfig.className)}
        >
          {statusConfig.label}
        </Badge>
      </div>
    </button>
  );
}
