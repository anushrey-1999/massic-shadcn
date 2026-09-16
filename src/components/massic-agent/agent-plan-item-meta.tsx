"use client";

import * as React from "react";
import { ChartNoAxesColumn } from "lucide-react";
import { RelevancePill, normalizeRelevanceScore } from "@/components/ui/relevance-pill";
import { formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Right-hand type slot on a plan card. Capped at two children by construction: an
 * optional identity icon (social channel) plus the item type as plain text.
 */
export function PlanTypeSlot({ icon, type, className }: { icon?: React.ReactNode; type?: string | null; className?: string }) {
  const label = type?.trim();
  if (!icon && !label) return null;
  return <span className={cn("flex shrink-0 items-center gap-1.5", className)}>
    {icon}
    {label && <span className="shrink-0 text-[10px] font-medium capitalize leading-[1.5] tracking-[0.15px] text-general-muted-foreground" title={label}>{label}</span>}
  </span>;
}

export function PlanVolumeMetric({ volume, label, className }: { volume?: number | null; label?: string; className?: string }) {
  if (volume === null || volume === undefined) return null;
  return <span className={cn("flex shrink-0 items-center gap-0.5 text-[10px] font-medium leading-[1.5] text-general-muted-foreground", className)} title={`Search volume: ${volume.toLocaleString()}`}>
    <ChartNoAxesColumn className="size-3 shrink-0" aria-hidden="true" />
    {label ? `${label}: ${formatVolume(volume)}` : formatVolume(volume)}
  </span>;
}

export function PlanRelevanceMetric({ score, label, className }: { score?: number | null; label?: string; className?: string }) {
  if (score === null || score === undefined) return null;
  return <RelevancePill variant="meter" score={normalizeRelevanceScore(score)} label={label} className={cn("shrink-0", className)} />;
}

/** Labelled value used by the expanded card body. */
export function PlanMetaField({ label, children }: { label: string; children?: React.ReactNode }) {
  return <div className="min-w-0">
    <p className="text-[10px] font-medium uppercase tracking-[0.15px] text-general-muted-foreground">{label}</p>
    <div className="mt-0.5 break-words text-sm leading-5 text-general-secondary-foreground">{children ?? <span className="text-general-muted-foreground">—</span>}</div>
  </div>;
}
