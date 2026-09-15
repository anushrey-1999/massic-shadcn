"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Typography } from "./typography";

type RelevanceVariant = "pill" | "meter";

interface RelevancePillProps {
  score: number;
  className?: string;
  color?: string;
  /** "pill" keeps the bordered chip; "meter" is the compact bars + value used in dense lists. */
  variant?: RelevanceVariant;
  /** Optional prefix shown before the value, e.g. "Rel". */
  label?: string;
}

const BAR_HEIGHTS = ["h-1", "h-1.5", "h-2", "h-2.5"] as const;

const BAR_GEOMETRY: Record<RelevanceVariant, { track: string; bar: string }> = {
  pill: { track: "gap-0.5", bar: "w-0.5" },
  meter: { track: "gap-[2px]", bar: "w-px" },
};

/**
 * Scores reach the UI either as 0-1 ratios or as 0-100 percentages depending on the
 * source table. Callers that cannot guarantee the scale should normalize first.
 */
export function normalizeRelevanceScore(score?: number | null): number {
  const value = Number(score ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
}

function barColors(barsToFill: number, color?: string) {
  if (color) return { filled: color, empty: `${color}33` };
  if (barsToFill === 1) return { filled: "#dc2626", empty: "#fecaca" }; // red-600 / red-200
  if (barsToFill === 2) return { filled: "#d97706", empty: "#fde68a" }; // amber-600 / amber-200
  return { filled: "#65a30d", empty: "#d9f99d" }; // lime-600 / lime-200
}

export function RelevancePill({ score, className, color, variant = "pill", label }: RelevancePillProps) {
  const normalizedScore = Math.max(0, Math.min(1, score || 0));

  // Calculate how many bars to fill (1-4)
  const filledBars = Math.ceil(normalizedScore * 4);
  const barsToFill = Math.min(4, Math.max(1, filledBars));

  // Determine color based on number of filled bars
  const { filled: barColor, empty: emptyBarColor } = barColors(barsToFill, color);

  // Calculate score percentage for display
  const scorePercentage = Math.round(normalizedScore * 100);
  const geometry = BAR_GEOMETRY[variant];
  const value = label ? `${label}: ${scorePercentage}` : String(scorePercentage);

  return (
    <div
      className={cn(
        "inline-flex items-center",
        variant === "pill"
          ? "gap-1 px-2 py-[3.5px] rounded-lg border border-general-border bg-white"
          : "gap-[5px]",
        className
      )}
    >
      <div className={cn("flex items-end", geometry.track)}>
        {[1, 2, 3, 4].map((barIndex) => {
          const isFilled = barIndex <= barsToFill;
          return (
            <div
              key={barIndex}
              className={cn(
                "rounded-full transition-colors",
                geometry.bar,
                BAR_HEIGHTS[barIndex - 1]
              )}
              style={{
                backgroundColor: isFilled ? barColor : emptyBarColor,
              }}
            />
          );
        })}
      </div>
      {variant === "pill" ? (
        <Typography
          variant="p"
          className="text-foreground leading-[150%]"
        >
          {value}
        </Typography>
      ) : (
        <span className="text-[10px] font-medium leading-[1.5] text-general-muted-foreground">
          {value}
        </span>
      )}
    </div>
  );
}
