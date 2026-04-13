"use client";

import * as React from "react";

import { Typography } from "@/components/ui/typography";

type ReportFooterProps = {
  summary?: string;
  poweredByName?: string;
};

export function ReportFooter({ summary, poweredByName }: ReportFooterProps) {
  const s = String(summary || "").trim();
  if (!s) return null;

  const poweredBy = String(poweredByName || "").trim() || "Massic";

  return (
    <div className="rounded-lg border border-general-border bg-[#fafafa] px-6 py-4 flex items-center justify-between gap-4">
      <Typography variant="extraSmall" className="text-general-muted-foreground">
        Powered by {poweredBy}
      </Typography>
      <Typography variant="extraSmall" className="text-general-muted-foreground font-mono text-right wrap-break-word">
        {s}
      </Typography>
    </div>
  );
}

