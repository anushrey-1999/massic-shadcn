"use client";

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { StatsBadge } from "./StatsBadge";

interface RatingCardProps {
  title: string;
  value?: string | number;
  rating?: number;
  maxRating?: number;
  change: number;
  sparklineData?: number[];
  className?: string;
}

export function RatingCard({
  title,
  value,
  rating,
  maxRating = 5,
  change,
  sparklineData,
  className,
}: RatingCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-general-border bg-card flex-1",
        className
      )}
    >
      <div className="flex flex-col gap-2.5 w-full ">
        <div className="text-base text-general-secondary-foreground font-medium p-2 border-b border-general-border-four w-full">
          {title}
        </div>
        <div className="px-6 py-2 flex gap-2 items-center">
          <div className="flex items-center gap-2">
            {value !== undefined && (
              <span className="text-2xl font-semibold">{value}</span>
            )}
            <div className="flex items-center gap-1">
              <span className="text-2xl font-semibold">{rating}</span>
              {rating !== undefined && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: maxRating }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-5 w-5",
                        i < rating
                          ? "fill-amber-500 text-amber-500"
                          : "fill-muted text-muted"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <StatsBadge className="w-fit" value={change} />
        </div>
      </div>
      {sparklineData && (
        <div className="h-[60px] flex-1 max-w-[300px]">
          <svg
            viewBox="0 0 200 60"
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            <path
              d={generateSparklinePath(sparklineData)}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

function generateSparklinePath(data: number[]): string {
  if (data.length === 0) return "";
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = 200 / (data.length - 1);

  return data
    .map((value, index) => {
      const x = index * stepX;
      const y = 56 - ((value - min) / range) * 50;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}
