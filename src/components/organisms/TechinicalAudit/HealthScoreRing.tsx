"use client";

import * as React from "react";

import { Card } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

function getHealthTone(score: number) {
  if (score >= 80) {
    return {
      ring: "rgb(34 197 94)",
      track: "rgba(34, 197, 94, 0.12)",
      deltaText: "text-green-600",
      headerBg: "from-green-500/10 to-green-500/[0.01]",
    };
  }

  if (score >= 50) {
    return {
      ring: "#F59E0B",
      track: "rgba(245, 158, 11, 0.12)",
      deltaText: "text-green-600",
      headerBg: "from-amber-500/10 to-amber-500/[0.01]",
    };
  }

  return {
    ring: "rgb(239 68 68)",
    track: "rgba(239, 68, 68, 0.12)",
    deltaText: "text-red-600",
    headerBg: "from-red-500/10 to-red-500/[0.01]",
  };
}

function HealthDonut({
  score,
  deltaLabel,
  deltaTextClassName,
  ringColor,
  trackColor,
  thicknessPx = 32,
}: {
  score: number;
  deltaLabel: string;
  deltaTextClassName: string;
  ringColor: string;
  trackColor: string;
  thicknessPx?: number;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${thicknessPx}px), #000 calc(100% - ${thicknessPx}px))`;
  const ringStyle: React.CSSProperties = {
    background: `conic-gradient(${ringColor} ${pct}%, ${trackColor} 0)`,
    WebkitMask: mask,
    mask,
  };

  return (
    <div className="relative h-[177px] w-[177px] shrink-0">
      <div className="absolute inset-0 rounded-full shadow-xs" style={ringStyle} />
      <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 flex flex-col items-center justify-center">
        <div className="tabular-nums flex w-[49px] justify-center text-[48px] font-semibold leading-none tracking-[-0.48px] text-general-foreground">
          {score}
        </div>
        <div
          className={cn(
            "flex w-[49px] items-center justify-center py-0.5 text-[10px] font-medium tracking-[0.15px]",
            deltaTextClassName
          )}
        >
          {deltaLabel}
        </div>
      </div>
    </div>
  );
}

export function HealthScoreRing({
  score,
  pagesCrawled,
  deltaLabel = "+42%",
}: {
  score: number;
  pagesCrawled: number;
  deltaLabel?: string;
}) {
  const { ring, track, deltaText, headerBg } = getHealthTone(score);

  return (
    <Card
      className={cn(
        "w-full lg:w-[201px] gap-2 rounded-xl border-none px-3 py-3 shadow-none",
        "bg-linear-to-b",
        headerBg
      )}
    >
      <Typography
        variant="p"
        className="w-full text-center text-base font-mono text-general-foreground leading-[200%]"
      >
        Health Score
      </Typography>

      <div className="flex justify-center">
        <HealthDonut
          score={score}
          deltaLabel={deltaLabel}
          deltaTextClassName={deltaText}
          ringColor={ring}
          trackColor={track}
          thicknessPx={32}
        />
      </div>

      <div className="w-full rounded-sm bg-secondary px-2 py-[3px] text-center text-[10px] font-medium tracking-[0.15px] text-general-muted-foreground">
        {pagesCrawled} pages crawled
      </div>
    </Card>
  );
}

