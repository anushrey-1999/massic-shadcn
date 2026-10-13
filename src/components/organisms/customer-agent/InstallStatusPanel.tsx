"use client";

import { formatDistanceToNow } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { useCustomerAgentInstallStatus } from "@/hooks/use-customer-agent";
import { Section } from "./Section";

interface InstallStatusPanelProps {
  businessId: string;
  hasDomains: boolean;
}

function hostOf(origin: string) {
  return origin.replace(/^https?:\/\//, "");
}

export function InstallStatusPanel({ businessId, hasDomains }: InstallStatusPanelProps) {
  const status = useCustomerAgentInstallStatus(businessId, hasDomains);
  const installs = status.data?.installs ?? [];
  const waiting = hasDomains && status.isSuccess && installs.length === 0;

  const refresh = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => status.refetch()}
      disabled={!hasDomains || status.isFetching}
    >
      {status.isFetching ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Check now
    </Button>
  );

  return (
    <Section
      title="Installation status"
      description="We detect the snippet the first time your site loads it."
      action={refresh}
    >
      {!hasDomains ? (
        <p className="text-sm text-general-muted-foreground">
          Add a domain above, then add the snippet to that site.
        </p>
      ) : status.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-general-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking your site…
        </p>
      ) : status.isError ? (
        <p className="text-sm text-destructive">
          Couldn&apos;t check installation. Try again in a moment.
        </p>
      ) : waiting ? (
        <div className="relative flex items-center gap-3 rounded-lg border border-general-border bg-general-primary-foreground px-3 py-3">
          <BorderBeam durationSeconds={4} />
          <MassicAmoebaLoader size={20} label="Waiting for the snippet" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-general-foreground">Waiting for the snippet</p>
            <p className="text-xs text-general-muted-foreground">
              Open your site after adding it. We check every 15 seconds.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-general-border rounded-lg border border-general-border">
          {installs.map((install) => (
            <li key={install.origin} className="flex h-11 items-center justify-between gap-3 px-3">
              <span className="flex min-w-0 items-center gap-2 text-sm text-general-foreground">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-green-500" />
                <span className="truncate">Detected on {hostOf(install.origin)}</span>
              </span>
              <span className="shrink-0 text-xs text-general-muted-foreground">
                {formatDistanceToNow(new Date(install.last_seen_at), { addSuffix: true })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
