"use client";

import { cn } from "@/lib/utils";
import { ChevronRight, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";

interface AlertBadge {
  count: number;
  type: "critical" | "warning" | "positive";
  label?: string; // Optional custom label, if not provided uses default "count type" format
}

interface AlertBarProps {
  title: string;
  icon?: React.ReactNode;
  badges?: AlertBadge[];
  isLoading?: boolean;
  error?: string | null;
  noAlertsMessage?: string;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "secondary";
}

const badgeStyles = {
  critical: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
  warning: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  positive:
    "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
};

const badgeLabels = {
  critical: "Critical",
  warning: "Warning",
  positive: "Positive",
};

export function AlertBar({
  title,
  icon,
  badges = [],
  isLoading = false,
  error = null,
  noAlertsMessage = "No recent anomalies detected",
  onClick,
  className,
  variant = "default",
}: AlertBarProps) {
  const hasAlerts = badges.some((b) => b.count > 0);

  return (
    <button
      onClick={!isLoading ? onClick : undefined}
      disabled={isLoading}
      className={cn(
        "w-full flex items-center justify-between rounded-lg border border-general-border bg-card p-3 transition-all",
        !isLoading && "hover:bg-general-primary-foreground cursor-pointer",
        isLoading && "opacity-70 cursor-default",
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <Typography
          variant="p"
          className="font-medium mt-0"
        >
          {title}
        </Typography>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Analyzing...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-1.5 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs italic">Error loading data</span>
          </div>
        ) : hasAlerts ? (
          <div className="flex items-center gap-2">
            {badges.map(
              (badge, index) =>
                badge.count > 0 && (
                  <Badge
                    key={`${badge.type}-${index}`}
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold uppercase",
                      badgeStyles[badge.type]
                    )}
                  >
                    {badge.label || `${badge.count} ${badgeLabels[badge.type]}`}
                  </Badge>
                )
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            {noAlertsMessage}
          </span>
        )}
      </div>

      {!isLoading && (
        <div
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-lg",
            variant === "secondary"
              ? "bg-foreground-light"
              : "bg-general-primary text-primary-foreground"
          )}
        >
          <ArrowRight
            className={cn(
              "h-4 w-4",
              variant === "secondary" && "text-general-secondary-foreground"
            )}
          />
        </div>
      )}
    </button>
  );
}
