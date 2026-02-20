"use client";

import * as React from "react";

import { Typography } from "@/components/ui/typography";

type ReportFooterProps = {
  summary?: string;
};

export function ReportFooter({ summary }: ReportFooterProps) {
  const s = String(summary || "").trim();
  if (!s) return null;

  return (
    <div className="rounded-lg border border-general-border bg-[#fafafa] px-6 py-4 flex items-center justify-between gap-4">
      <Typography variant="extraSmall" className="text-general-muted-foreground">
        Powered by MASSIC
      </Typography>
      <Typography variant="extraSmall" className="text-general-muted-foreground font-mono text-right wrap-break-word">
        {s}
      </Typography>
    </div>
  );
}

