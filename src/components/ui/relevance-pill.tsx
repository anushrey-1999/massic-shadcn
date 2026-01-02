"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Typography } from "./typography";

interface RelevancePillProps {
  score: number;
  className?: string;
}

export function RelevancePill({ score, className }: RelevancePillProps) {
  const normalizedScore = Math.max(0, Math.min(1, score || 0));
  
  // Calculate how many bars to fill (1-4)
  const filledBars = Math.ceil(normalizedScore * 4);
  const barsToFill = Math.min(4, Math.max(1, filledBars));
  
  // Determine color based on number of filled bars
  let barColor: string;
  if (barsToFill === 1) {
    barColor = "hsl(0, 84%, 60%)"; // Red
  } else if (barsToFill === 2) {
    barColor = "hsl(45, 93%, 47%)"; // Yellow
  } else {
    barColor = "#84cc16"; // lime-600 (3 or 4 bars)
  }
  
  // Calculate score percentage for display
  const scorePercentage = Math.round(normalizedScore * 100);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-[3.5px] rounded-lg border border-general-border bg-white",
        className
      )}
    >
      <div className="flex items-end gap-0.5">
        {[1, 2, 3, 4].map((barIndex) => {
          const isFilled = barIndex <= barsToFill;
          const heights = ["h-1", "h-1.5", "h-2", "h-2.5"];
          return (
            <div
              key={barIndex}
              className={cn(
                "w-0.5 rounded-full transition-colors",
                heights[barIndex - 1]
              )}
              style={{
                backgroundColor: isFilled ? barColor : "#e5e7eb",
              }}
            />
          );
        })}
      </div>
      <Typography
        variant="p"
        className="text-foreground leading-[150%]"
      >
        {scorePercentage}
      </Typography>
    </div>
  );
}
