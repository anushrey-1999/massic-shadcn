"use client";

import { memo } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChartOverlayToggleProps {
  icon: LucideIcon;
  /** Noun phrase used for the tooltip and accessible name, e.g. "anomaly highlights". */
  label: string;
  active: boolean;
  onToggle: (enabled: boolean) => void;
  /**
   * First fetch for this overlay is in flight — the icon slot becomes a spinner
   * without resizing the chip. Background refetches stay silent.
   */
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  /** Icon color while the overlay is on, so the chip matches what it draws on the chart. */
  activeIconClassName?: string;
}

/**
 * Icon-only chart overlay switch. Shares the chart legend's chip styling so the
 * overlay controls read as part of the same row. Memoized because the chart
 * around it re-renders on every data or hover update.
 */
export const ChartOverlayToggle = memo(function ChartOverlayToggle({
  icon: Icon,
  label,
  active,
  onToggle,
  loading = false,
  disabled = false,
  disabledReason,
  activeIconClassName = "text-general-foreground",
}: ChartOverlayToggleProps) {
  const action = `${active ? "Hide" : "Show"} ${label}`;
  const tooltip = disabled ? (disabledReason ?? action) : loading ? `Loading ${label}…` : action;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex", disabled && "cursor-not-allowed")}>
          <button
            type="button"
            aria-label={action}
            aria-pressed={active}
            aria-busy={loading}
            disabled={disabled}
            onClick={() => onToggle(!active)}
            style={disabled ? { pointerEvents: "none" } : undefined}
            className={cn(
              "flex min-h-8 items-center justify-center rounded-sm border px-3 py-2 transition-colors",
              active
                ? "border-general-border-three bg-general-border"
                : "border-transparent bg-foreground-light",
              disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-general-border"
            )}
          >
            {loading ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin text-general-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <Icon
                className={cn(
                  "h-3.5 w-3.5",
                  active ? activeIconClassName : "text-general-muted-foreground"
                )}
                aria-hidden="true"
              />
            )}
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
});
