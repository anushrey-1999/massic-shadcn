"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function IntegrationStatusBadge({
  connected,
  loading,
  error,
}: {
  connected: boolean;
  loading?: boolean;
  error?: boolean;
}) {
  const label = loading
    ? "Checking…"
    : error
      ? "Check failed"
      : connected
        ? "Connected"
        : "Not connected";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : connected
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
            : "text-general-muted-foreground"
      )}
    >
      {label}
    </Badge>
  );
}
