"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { StatsBadge } from "./StatsBadge";

interface ChartLegendItem {
  key: string;
  label?: string;
  icon: React.ReactNode;
  value: string;
  change: number;
  color?: string;
  checked?: boolean;
  funnelPercentage?: string;
}

const BOX_PATHS = [
  "M 5 0 Q 0 0 0 5 L 0 23 Q 0 28 5 28 L 94 28 L 100 14 L 94 0 Z",
  "M 0 0 L 94 0 L 100 14 L 94 28 L 0 28 L 6 14 Z",
  "M 0 0 L 95 0 Q 100 0 100 5 L 100 23 Q 100 28 95 28 L 0 28 L 6 14 Z",
];

interface ChartLegendProps {
  items: ChartLegendItem[];
  onToggle?: (key: string, checked: boolean) => void;
  className?: string;
  variant?: "default" | "box";
}

export function ChartLegend({
  items,
  onToggle,
  className,
  variant = "default",
}: ChartLegendProps) {
  if (variant === "box") {
    return (
      <div className={cn("flex items-center gap-0", className)}>
        {items.map((item, index) => (
          <Fragment key={item.key}>
            <label className="relative shrink-0 h-8 w-fit cursor-pointer">
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 28"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d={BOX_PATHS[index % BOX_PATHS.length]}
                  className="fill-foreground-light"
                  strokeWidth="0.5"
                />
              </svg>
              <div className="relative h-full flex items-center justify-center gap-1.5 px-4 py-1.5">
                <Checkbox
                  checked={item.checked ?? true}
                  onCheckedChange={(checked) =>
                    onToggle?.(item.key, checked as boolean)
                  }
                  className="cursor-pointer shrink-0"
                />
                <span
                  style={item.color ? { color: item.color } : undefined}
                  className={cn(
                    "flex items-center gap-0.5 [&_svg]:w-3 [&_svg]:h-3",
                    item.color ? undefined : "text-muted-foreground"
                  )}
                >
                  {item.icon}
                </span>
                <span
                  className="text-xs font-medium"
                  style={item.color ? { color: item.color } : undefined}
                >
                  {item.value}
                </span>
                <StatsBadge
                  value={item.change}
                  variant="big"
                  className="flex items-baseline"
                />
              </div>
            </label>
            {item.funnelPercentage ? (
              <span className="text-xs text-muted-foreground px-2 shrink-0">
                {item.funnelPercentage}
              </span>
            ) : null}
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-4 ", className)}>
      {items.map((item) => (
        <label
          key={item.key}
          className="flex items-center justify-center px-2 py-2 bg-foreground-light rounded-md cursor-pointer"
        >
          <Checkbox
            checked={item.checked ?? true}
            onCheckedChange={(checked) =>
              onToggle?.(item.key, checked as boolean)
            }
            className="cursor-pointer"
          />
          <div className="flex items-center gap-1 pl-4  flex-1 justify-center">
            <span
              style={item.color ? { color: item.color } : undefined}
              className={cn(
                "flex items-baseline",
                item.color ? undefined : "text-muted-foreground"
              )}
            >
              {item.icon}
            </span>
            <div className="flex items-baseline gap-1 py-0.5 rounded">
              <span
                className="font-semibold leading-[120%] tracking-[-0.02em]"
                style={{
                  fontSize: "20px",
                  ...(item.color ? { color: item.color } : {}),
                }}
              >
                {item.value}
              </span>
              <StatsBadge
                value={item.change}
                variant="small"
                valueClassName="text-[11px]"
                className="flex items-end"
              />
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

interface PositionLegendItem {
  key: string;
  label: string;
  value: number;
  change: number;
  color: string;
  checked?: boolean;
}

interface PositionLegendProps {
  items: PositionLegendItem[];
  onToggle?: (key: string, checked: boolean) => void;
  className?: string;
}

export function PositionLegend({
  items,
  onToggle,
  className,
}: PositionLegendProps) {
  return (
    <div className={cn("flex items-center gap-4 p-2", className)}>
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <Checkbox
            checked={item.checked ?? true}
            onCheckedChange={(checked) =>
              onToggle?.(item.key, checked as boolean)
            }
            className="data-[state=checked]:bg-primary"
            style={
              {
                "--checkbox-color": item.color,
              } as React.CSSProperties
            }
          />
          <div className="flex items-baseline">
            <span className="text-sm">{item.label}</span>
            <span className="text-sm font-medium">{item.value}</span>
            <StatsBadge value={item.change} variant="plain" />
          </div>
        </div>
      ))}
    </div>
  );
}
