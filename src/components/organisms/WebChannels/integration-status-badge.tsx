"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function IntegrationStatusBadge({
  connected,
  loading,
}: {
  connected: boolean;
  loading?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        connected
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
          : "text-general-muted-foreground"
      )}
    >
      {connected ? "Connected" : loading ? "Checking…" : "Not connected"}
    </Badge>
  );
}
