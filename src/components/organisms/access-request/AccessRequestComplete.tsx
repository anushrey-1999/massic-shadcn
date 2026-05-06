"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, XCircle, AlertTriangle } from "lucide-react";
import { PRODUCT_CONFIG, STATUS_CONFIG } from "@/config/access-request";
import { ProductIcon } from "./ProductIcon";
import type { AccessRequestStep } from "@/types/access-request";
import { cn } from "@/lib/utils";

interface AccessRequestCompleteProps {
  steps: AccessRequestStep[];
}

export function AccessRequestComplete({ steps }: AccessRequestCompleteProps) {
  const completed = steps.filter((s) => s.status === "completed");
  const failed = steps.filter((s) => s.status === "failed");
  const manual = steps.filter((s) => s.status === "manual_required");
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
            ? "All access has been granted successfully. You can now close this page."
            : "Some steps require attention. Please review the details below."}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-700">{completed.length}</p>
            <p className="text-xs text-green-600">Completed</p>
          </CardContent>
        </Card>
        {failed.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-red-700">{failed.length}</p>
              <p className="text-xs text-red-600">Failed</p>
            </CardContent>
          </Card>
        )}
        {manual.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-orange-700">{manual.length}</p>
              <p className="text-xs text-orange-600">Manual</p>
            </CardContent>
          </Card>
        )}
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

      <p className="text-center text-xs text-gray-400">
        You can safely close this page now.
      </p>
    </div>
  );
}
