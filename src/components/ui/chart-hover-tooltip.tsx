"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";

interface ChartTooltipMetric {
  label: string;
  value: React.ReactNode;
}

interface ChartHoverTooltipProps {
  typeLabel?: string | null;
  title: React.ReactNode;
  metrics?: ChartTooltipMetric[];
  children?: React.ReactNode;
}

export function ChartHoverTooltip({
  typeLabel,
  title,
  metrics = [],
  children,
}: ChartHoverTooltipProps) {
  return (
    <Card
      variant="profileCard"
      className="w-[280px] rounded-xl border-none bg-foreground-light p-3"
    >
      {typeLabel ? (
        <div className="mb-1.5">
          <Badge variant="outline" className="border border-general-border">
            {typeLabel}
          </Badge>
        </div>
      ) : null}
      <CardTitle className="text-sm font-medium leading-snug text-general-primary">
        {title}
      </CardTitle>
      {metrics.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {metrics.map((metric) => (
            <Badge key={metric.label} variant="outline">
              {metric.label}&nbsp;
              <span className="text-general-foreground">{metric.value}</span>
            </Badge>
          ))}
        </div>
      ) : null}
      {children}
    </Card>
  );
}
