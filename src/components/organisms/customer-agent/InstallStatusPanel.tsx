"use client";

import { formatDistanceToNow } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import type { useCustomerAgentInstallStatus } from "@/hooks/use-customer-agent";

interface InstallStatusPanelProps {
  status: ReturnType<typeof useCustomerAgentInstallStatus>;
  hasDomains: boolean;
}

function hostOf(origin: string) {
  return origin.replace(/^https?:\/\//, "");
}

/** One-line snippet detection status with a manual re-check. */
export function InstallStatusPanel({ status, hasDomains }: InstallStatusPanelProps) {
  const installs = status.data?.installs ?? [];
  const latest = installs[0];

  const message = !hasDomains ? (
    <span className="text-general-muted-foreground">Add your website and the code first.</span>
  ) : status.isLoading ? (
    <span className="flex items-center gap-2 text-general-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Checking your site…
    </span>
  ) : status.isError ? (
    <span className="text-destructive">Couldn&apos;t check your site. Try again in a moment.</span>
  ) : latest ? (
    <span className="flex min-w-0 items-center gap-2 text-general-foreground">
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-green-500" />
      <span className="truncate">
        Code found on {hostOf(latest.origin)}
        {installs.length > 1 && ` and ${installs.length - 1} more`}
        <span className="text-general-muted-foreground">
          {" · "}
          {formatDistanceToNow(new Date(latest.last_seen_at), { addSuffix: true })}
        </span>
      </span>
    </span>
  ) : (
    <span className="flex items-center gap-2 text-general-muted-foreground">
      <MassicAmoebaLoader size={16} label="Waiting for the code" />
      Waiting for the code. Open your site after adding it.
    </span>
  );

  return (
    <div className="flex min-h-9 items-center justify-between gap-3 text-sm" aria-live="polite">
      <div className="min-w-0">{message}</div>
      {hasDomains && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => status.refetch()}
          disabled={status.isFetching}
        >
          {status.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Check now
        </Button>
      )}
    </div>
  );
}
