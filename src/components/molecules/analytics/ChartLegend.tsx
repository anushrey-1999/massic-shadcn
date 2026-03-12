"use client";

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
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  onToggle?: (key: string, checked: boolean) => void;
  className?: string;
  variant?: "default" | "box";
  showToggle?: boolean;
}

export function ChartLegend({
  items,
  onToggle,
  className,
  variant = "default",
  showToggle = true,
}: ChartLegendProps) {
  if (variant === "box") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {items.map((item) => {
          const checked = item.checked ?? true;
          return (
            <label
              key={item.key}
              className={cn(
                "flex items-center gap-2 rounded-sm bg-foreground-light px-3 py-2",
                showToggle ? "cursor-pointer" : "cursor-default",
                !checked && "opacity-50"
              )}
            >
              {showToggle && (
                <Checkbox
                  checked={checked}
                  onCheckedChange={(nextChecked) =>
                    onToggle?.(item.key, nextChecked as boolean)
                  }
                  className="cursor-pointer shrink-0"
                />
              )}
              <span
                style={item.color ? { color: item.color } : undefined}
                className={cn(
                  "flex items-center gap-1 [&_svg]:h-3.5 [&_svg]:w-3.5",
                  item.color ? undefined : "text-muted-foreground"
                )}
              >
                {item.icon}
              </span>
              <span className="text-xs font-medium text-foreground">
                {item.value}
              </span>
              <StatsBadge
                value={item.change}
                variant="big"
                className="flex items-baseline"
              />
            </label>
          );
        })}
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
              <span className="font-semibold leading-[120%] tracking-[-0.02em] text-foreground" style={{ fontSize: "20px" }}>
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
