"use client";

import { Calendar, CalendarClock, Minus, Sparkles, Sprout, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TopicSignalLabel } from "@/types/topic-signals-types";

const labelConfig: Record<TopicSignalLabel, { icon: typeof Sprout; className: string }> = {
  Emerging: {
    icon: Sprout,
    className: "border-lime-200 bg-lime-50 text-lime-700",
  },
  Rising: {
    icon: TrendingUp,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  Breakout: {
    icon: Zap,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  Seasonal: {
    icon: Calendar,
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  "Seasonal+Rising": {
    icon: CalendarClock,
    className: "border-teal-200 bg-teal-50 text-teal-700",
  },
  Steady: {
    icon: Minus,
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

export function TopicSignalLabelBadge({
  label,
  compact = false,
  className,
}: {
  label: TopicSignalLabel;
  compact?: boolean;
  className?: string;
}) {
  const config = labelConfig[label] || {
    icon: Sparkles,
    className: "border-slate-200 bg-slate-50 text-slate-600",
  };
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        config.className,
        compact && "px-1.5 py-0 text-[10px]",
        className
      )}
    >
      <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </Badge>
  );
}
