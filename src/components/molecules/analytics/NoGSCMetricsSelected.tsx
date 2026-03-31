"use client";

import { Card } from "@/components/ui/card";

interface NoGSCMetricsSelectedProps {
  title: string;
  description?: string;
}

export function NoGSCMetricsSelected({
  title,
  description = "Select at least one GSC metric to activate this report.",
}: NoGSCMetricsSelectedProps) {
  return (
    <Card className="p-0 shadow-none border border-general-border rounded-lg bg-white overflow-hidden">
      <div className="px-2 py-2 border-b border-general-border-four">
        <span className="text-[14px] font-medium text-general-secondary-foreground">
          {title}
        </span>
      </div>

      <div className="p-4">
        <div className="w-full min-h-[200px] rounded-md border border-dashed border-[#cfd5e2] flex items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center px-4">
            <div className="h-9 w-9 rounded-full border border-[#9ca3af] text-[#6b7280] flex items-center justify-center text-lg font-semibold mb-3">
              G
            </div>
            <p className="text-lg font-semibold text-general-foreground mb-1">No GSC metrics selected.</p>
            <p className="text-sm text-general-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
