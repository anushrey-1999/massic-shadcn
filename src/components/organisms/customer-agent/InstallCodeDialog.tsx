"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Loader2 } from "lucide-react";
import { CodeSnippet } from "@/components/molecules/CodeSnippet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVisitorAgentInstall } from "@/hooks/use-customer-agent";
import { installSnippet, originHost } from "@/lib/customer-agent";
import { cn } from "@/lib/utils";
import type { CustomerAgentConfig } from "@/types/customer-agent";
import { SECONDARY_BUTTON_CLASS } from "./controls";
import { RotateKeyButton, useInstallDetection } from "./InstallPanel";
import { PlatformGuides } from "./PlatformGuides";
import { requestError } from "./request-error";

interface InstallCodeDialogProps {
  businessId: string;
  config: CustomerAgentConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefreshInstallation: () => void;
}

/** The install code, its key and the platform guides, for after setup. Re-checks the install while open. */
export function InstallCodeDialog({
  businessId,
  config,
  open,
  onOpenChange,
  onRefreshInstallation,
}: InstallCodeDialogProps) {
  const install = useVisitorAgentInstall(businessId);
  const siteKey = install.siteKey.data;
  const seenAt = useInstallDetection(
    config.install,
    onRefreshInstallation,
    open,
  );
  const host = originHost(config.install.last_seen_origin);

  const body = () => {
    if (install.siteKey.isLoading) {
      return (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-general-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" /> Preparing your code…
        </p>
      );
    }
    if (!siteKey) {
      return (
        <div role="alert" className="flex items-center justify-between gap-3">
          <p className="text-sm text-general-foreground">
            {install.siteKey.isError
              ? requestError(install.siteKey.error)
              : "Turn on your customer agent to get the code."}
          </p>
          {install.siteKey.isError && (
            <Button
              variant="outline"
              size="sm"
              className={SECONDARY_BUTTON_CLASS}
              onClick={() => void install.siteKey.refetch()}
            >
              Try again
            </Button>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <CodeSnippet code={installSnippet(config.site_id, siteKey.key)} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 text-general-muted-foreground">
              Site key
            </span>
            <code className="truncate font-mono text-xs text-general-foreground">
              {siteKey.key}
            </code>
          </p>
          <RotateKeyButton businessId={businessId} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-general-foreground">
            Installation guides
          </p>
          <PlatformGuides />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-1 sm:max-w-xl">
        <DialogHeader className="pr-6">
          <DialogTitle className="font-medium">Install code</DialogTitle>
          <DialogDescription
            className="flex items-center gap-2"
            aria-live="polite"
          >
            <span
              aria-hidden
              className={cn(
                "size-2 shrink-0 rounded-full",
                seenAt ? "bg-green-500" : "bg-amber-500",
              )}
            />
            {seenAt
              ? `Connected to ${host ?? "your website"} · seen ${formatDistanceToNowStrict(seenAt, { addSuffix: true })}`
              : "Not detected yet. Paste the code before </body> on every page."}
          </DialogDescription>
        </DialogHeader>
        {body()}
      </DialogContent>
    </Dialog>
  );
}
