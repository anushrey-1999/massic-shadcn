import type { ReactNode } from "react";

export function AnalyticsChartTooltip({
  label,
  context,
  badges,
  children,
}: {
  label: ReactNode;
  context?: ReactNode;
  badges?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-[196px] rounded-lg border border-border bg-background px-3 py-2.5 shadow-md">
      {context ? (
        <p className="text-[11px] font-medium tracking-[0.12px] text-muted-foreground">
          {context}
        </p>
      ) : null}
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-base font-medium leading-5 text-general-foreground">
          {label}
        </p>
        {badges}
      </div>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );
}
