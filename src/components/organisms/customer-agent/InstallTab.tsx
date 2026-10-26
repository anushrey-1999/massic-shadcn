"use client";

import { useEffect, useId } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { CodeSnippet } from "@/components/molecules/CodeSnippet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useVisitorAgentInstall } from "@/hooks/use-customer-agent";
import { installSnippet } from "@/lib/customer-agent";
import { cn } from "@/lib/utils";
import type { CustomerAgentConfig } from "@/types/customer-agent";
import { SECONDARY_BUTTON_CLASS } from "./controls";
import { PlatformGuides } from "./PlatformGuides";
import { Section } from "./Section";
import { SetupStep } from "./SetupStep";

interface InstallTabProps {
  businessId: string;
  config: CustomerAgentConfig;
  onRefreshInstallation: () => void;
}

function StatusPill({
  enabled,
  balance,
}: {
  enabled: boolean;
  balance?: number;
}) {
  const live = enabled && typeof balance === "number" && balance > 0;
  const label = live ? "Ready" : enabled ? "No credits" : "Off";
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-xs font-medium",
        live
          ? "bg-green-100 text-green-800"
          : enabled
            ? "bg-amber-100 text-amber-800"
            : "bg-gray-100 text-gray-500",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          live ? "bg-green-500" : enabled ? "bg-amber-500" : "bg-gray-400",
        )}
      />
      {label}
    </span>
  );
}

function InstallationStatus({
  lastSeenAt,
}: {
  lastSeenAt: string | null;
}) {
  const seenAt = lastSeenAt ? new Date(lastSeenAt) : null;
  const verified = seenAt !== null && Number.isFinite(seenAt.getTime());

  return (
    <div className="mt-3 flex min-h-12 items-center rounded-lg border border-general-border bg-general-secondary px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              verified ? "bg-green-500" : "bg-gray-400",
            )}
          />
          <p className="text-sm font-medium text-general-foreground">
            Installation status
          </p>
        </div>
        <p className="mt-0.5 pl-4 text-xs text-general-muted-foreground">
          {verified ? `Last seen ${seenAt.toLocaleString()}` : "Not detected"}
        </p>
      </div>
    </div>
  );
}

function requestError(error: unknown): string {
  const response = (
    error as {
      response?: { status?: number; data?: { detail?: unknown } };
    }
  )?.response;
  if (response?.status === 404)
    return "Agent credits are not available for this business yet.";
  if (response?.status === 409)
    return "Complete the business profile before enabling the customer agent.";
  return typeof response?.data?.detail === "string"
    ? response.data.detail
    : (error as Error)?.message || "Please try again.";
}

export function InstallTab({
  businessId,
  config,
  onRefreshInstallation,
}: InstallTabProps) {
  const switchId = useId();
  const install = useVisitorAgentInstall(businessId);
  const credits = install.credits.data;
  const siteKey = install.siteKey.data;
  const snippet = siteKey ? installSnippet(config.site_id, siteKey.key) : "";
  const pending = install.grant.isPending || install.regenerate.isPending;

  useEffect(() => {
    if (!credits?.enabled) return;
    window.addEventListener("focus", onRefreshInstallation);
    return () => window.removeEventListener("focus", onRefreshInstallation);
  }, [credits?.enabled, onRefreshInstallation]);

  return (
    <div className="max-w-[752px] pb-5">
      <Section
        title="Set up your customer agent"
        action={
          credits ? (
            <div className="flex items-center gap-2">
            <StatusPill
              enabled={credits.enabled}
              balance={credits.balance_usd}
            />
              <span className="inline-flex h-6 items-center gap-1.5 rounded-sm border border-general-border bg-general-input px-2 text-xs">
                <span className="text-general-muted-foreground">Credits</span>
                <span className="font-medium tabular-nums text-general-foreground">
                  ${credits.balance_usd.toFixed(2)}
                </span>
              </span>
            </div>
          ) : undefined
        }
      >
        {install.credits.isLoading ? (
          <div
            role="status"
            className="flex min-h-20 items-center justify-center gap-2 text-sm text-general-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin" />
            Loading status…
          </div>
        ) : install.credits.isError ? (
          <div
            role="alert"
            className="rounded-lg border border-general-border p-4"
          >
            <p className="text-sm text-general-foreground">
              {requestError(install.credits.error)}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void install.credits.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : credits ? (
          <>
            <ol>
              <SetupStep
                index={1}
                done={credits.enabled}
                title="Turn on your customer agent"
              >
                <div className="rounded-lg border border-general-border px-3">
                  <div className="flex min-h-12 items-center justify-between gap-4">
                    <p className="text-sm text-general-foreground">
                      Customer agent
                    </p>
                    <div className="flex items-center gap-2">
                      {install.grant.isPending && (
                        <Loader2 className="size-4 animate-spin text-general-muted-foreground" />
                      )}
                      <Switch
                        id={switchId}
                        checked={credits.enabled}
                        onCheckedChange={(enabled) =>
                          install.grant.mutate(enabled)
                        }
                        disabled={pending}
                        aria-label="Enable customer agent"
                      />
                    </div>
                  </div>
                </div>
              </SetupStep>

              <SetupStep
                index={2}
                done={Boolean(config.install?.last_seen_at)}
                title="Paste this code before </body>"
                last
              >
                {install.siteKey.isLoading ? (
                  <p
                    role="status"
                    className="flex items-center gap-2 text-sm text-general-muted-foreground"
                  >
                    <Loader2 className="size-4 animate-spin" /> Preparing
                    snippet…
                  </p>
                ) : install.siteKey.isError ? (
                  <div role="alert" className="space-y-2">
                    <p className="text-sm text-destructive">
                      {requestError(install.siteKey.error)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void install.siteKey.refetch()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : siteKey ? (
                  <div className="space-y-2.5">
                    <CodeSnippet code={snippet} />
                    <PlatformGuides snippet={snippet} />
                  </div>
                ) : (
                  <p className="text-sm text-general-muted-foreground">
                    Turn on the customer agent to create the snippet.
                  </p>
                )}
              </SetupStep>
            </ol>

            {siteKey && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-general-border pt-3">
                <p className="min-w-0 truncate text-sm text-general-muted-foreground">
                  Site key{" "}
                  <code className="font-mono text-xs text-general-foreground">
                    {siteKey.key}
                  </code>
                </p>
                <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={SECONDARY_BUTTON_CLASS}
                          disabled={pending}
                        >
                          {install.regenerate.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <KeyRound className="size-4" />
                          )}
                          Rotate key
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-medium">
                            Rotate the site key?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            The current snippet stops working immediately.
                            Replace it with the new snippet.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => install.regenerate.mutate()}
                          >
                            Rotate key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {credits.enabled && (
              <InstallationStatus
                lastSeenAt={config.install?.last_seen_at ?? null}
              />
            )}
          </>
        ) : null}
      </Section>

    </div>
  );
}
