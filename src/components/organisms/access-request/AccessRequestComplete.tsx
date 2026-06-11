"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, XCircle, AlertTriangle } from "lucide-react";
import { PRODUCT_CONFIG, STATUS_CONFIG } from "@/config/access-request";
import { ProductIcon } from "./ProductIcon";
import type { AccessRequestStep } from "@/types/access-request";
import { cn } from "@/lib/utils";

interface AccessRequestCompleteProps {
  steps: AccessRequestStep[];
  agencyEmail: string;
}

export function AccessRequestComplete({ steps, agencyEmail }: AccessRequestCompleteProps) {
  const completed = steps.filter((s) => s.status === "completed");
  const allDone = completed.length === steps.length;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div
          className={cn(
            "mx-auto w-16 h-16 rounded-full flex items-center justify-center",
            allDone ? "bg-green-100" : "bg-yellow-100"
          )}
        >
          {allDone ? (
            <Check className="h-8 w-8 text-green-600" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {allDone ? "All Done!" : "Almost Done"}
        </h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          {allDone
            ? `Access has been granted successfully to ${agencyEmail}. You can safely close this page.`
            : "Some steps require attention. Please review the details below."}
        </p>
      </div>

      {/* Step details */}
      <div className="space-y-2">
        {steps.map((step) => {
          const config = PRODUCT_CONFIG[step.product];
          const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;

          return (
            <div
              key={step.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
            >
              <div className="shrink-0">
                {step.status === "completed" ? (
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                ) : step.status === "failed" ? (
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ProductIcon product={step.product} size={16} />
                <span className="text-sm font-medium text-gray-900">
                  {config?.label || step.product}
                </span>
              </div>
              <Badge
                variant={statusConfig.variant}
                className={cn("text-[10px] shrink-0", statusConfig.className)}
              >
                {statusConfig.label}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
