"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";

export type ProfileTag = {
  label: string;
  value: string;
};

type ProfileStripProps = {
  tags: ProfileTag[];
};

export function ProfileStrip({ tags }: ProfileStripProps) {
  const normalized = (Array.isArray(tags) ? tags : [])
    .map((t) => ({
      label: String(t?.label || "").trim(),
      value: String(t?.value || "").trim(),
    }))
    .filter((t) => t.label && t.value);

  if (normalized.length === 0) return null;

  return (
    <div className="rounded-lg border border-general-border bg-[#fafafa] p-4 flex flex-wrap gap-2">
      {normalized.map((t) => (
        <Badge key={`${t.label}-${t.value}`} variant="outline" className="bg-[#fafafa]">
          <Typography variant="extraSmall" className="text-general-muted-foreground">
            {t.label}
          </Typography>
          <span className="mx-1 text-general-border-three"> </span>
          <Typography variant="extraSmall" className="text-general-secondary-foreground">
            {t.value}
          </Typography>
        </Badge>
      ))}
    </div>
  );
}

