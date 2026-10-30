"use client";

import { useState } from "react";
import { Code2, Loader2, MessageSquareText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useVisitorAgentInstall } from "@/hooks/use-customer-agent";
import { agentStatus } from "@/lib/customer-agent";
import { cn } from "@/lib/utils";
import type { CustomerAgentConfig } from "@/types/customer-agent";
import { Hint, SECONDARY_BUTTON_CLASS } from "./controls";
import { CreditsMeter } from "./CreditsMeter";
import { InstallCodeDialog } from "./InstallCodeDialog";
import { requestError } from "./request-error";
import { StatusDot } from "./StatusBadge";

interface AgentStatusCardProps {
  businessId: string;
  config: CustomerAgentConfig;
  onTest: () => void;
  onRefreshInstallation: () => void;
}

/** Answers "is my agent on my website right now?" and holds credits, the install code, Test and the on/off switch. */
export function AgentStatusCard({ businessId, config, onTest, onRefreshInstallation }: AgentStatusCardProps) {
  const install = useVisitorAgentInstall(businessId);
  const credits = install.credits.data;
  const [confirmOff, setConfirmOff] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  if (install.credits.isLoading) {
    return (
      <div
        role="status"
        className="flex h-[76px] items-center justify-center gap-2 rounded-lg border border-general-border bg-white text-sm text-general-muted-foreground shadow-xs"
      >
        <Loader2 className="size-4 animate-spin" />
        Loading status…
      </div>
    );
  }

  if (!credits) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-general-border bg-white p-4 shadow-xs">
        <p className="text-sm text-general-foreground">{requestError(install.credits.error)}</p>
        <Button variant="outline" size="sm" className={SECONDARY_BUTTON_CLASS} onClick={() => void install.credits.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const status = agentStatus(credits, config.install);
  const outOfCredits = status.kind === "no_credits";
  const canTest = credits.enabled && !outOfCredits && Boolean(install.siteKey.data);
  const needsInstall = credits.enabled && status.kind === "not_installed";
  const switchId = `customer-agent-switch-${businessId}`;
  const switchHint = credits.enabled ? "Hide from your website" : "Show on your website";
  const testHint = canTest
    ? "Chat with your agent as a customer"
    : outOfCredits
      ? "Out of credits"
      : !credits.enabled
        ? "Turn on your customer agent to test it"
        : "Preparing your agent…";
  const toggle = (
    <label
      htmlFor={switchId}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-general-border-three bg-white pr-2 pl-3 text-sm font-medium text-general-foreground shadow-xs transition-colors hover:bg-muted",
        (install.grant.isPending || outOfCredits) && "cursor-not-allowed opacity-60 hover:bg-white"
      )}
    >
      {install.grant.isPending ? (
        <Loader2 className="size-4 animate-spin text-general-muted-foreground" aria-label="Saving" />
      ) : (
        <span className="w-6">{credits.enabled ? "On" : "Off"}</span>
      )}
      <Switch
        id={switchId}
        checked={credits.enabled}
        disabled={install.grant.isPending || outOfCredits}
        onCheckedChange={(enabled) => (enabled ? install.grant.mutate(true) : setConfirmOff(true))}
        aria-label="Customer agent"
      />
    </label>
  );

  return (
    <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-general-border bg-white px-5 py-4 shadow-xs">
      <div className="flex min-w-0 items-center gap-3">
        <StatusDot kind={status.kind} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-general-foreground">{status.badge}</p>
          <p className="truncate text-sm text-general-muted-foreground">{status.text}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Hint label={outOfCredits ? "Out of credits. They renew with your plan." : "Credits left from your plan"}>
          <div tabIndex={0} className="mr-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <CreditsMeter balanceUsd={credits.balance_usd} allowanceUsd={config.credits.allowance_usd} />
          </div>
        </Hint>
        <Hint label="Your website code, site key and install guides">
          <Button
            variant={needsInstall ? "default" : "outline"}
            size="sm"
            className={cn(!needsInstall && SECONDARY_BUTTON_CLASS)}
            onClick={() => setInstallOpen(true)}
          >
            <Code2 className="size-4" />
            Install code
          </Button>
        </Hint>
        <Hint label={testHint} disabled={!canTest}>
          <Button variant="outline" size="sm" className={SECONDARY_BUTTON_CLASS} disabled={!canTest} onClick={onTest}>
            <MessageSquareText className="size-4" />
            Test
          </Button>
        </Hint>
        <Hint label={outOfCredits ? "Turns back on when credits renew" : switchHint}>{toggle}</Hint>
      </div>

      <InstallCodeDialog
        businessId={businessId}
        config={config}
        open={installOpen}
        onOpenChange={setInstallOpen}
        onRefreshInstallation={onRefreshInstallation}
      />

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-medium">Turn off customer agent?</AlertDialogTitle>
            <AlertDialogDescription>Customers won&apos;t see it on your website.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => install.grant.mutate(false)}>Turn off</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
