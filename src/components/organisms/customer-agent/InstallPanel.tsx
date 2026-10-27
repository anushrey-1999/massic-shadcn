"use client";

import { useEffect } from "react";
import { formatDistanceToNowStrict } from "date-fns";
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
import { useVisitorAgentInstall } from "@/hooks/use-customer-agent";
import { originHost } from "@/lib/customer-agent";
import { cn } from "@/lib/utils";
import type {
  CustomerAgentConfig,
  VisitorSiteKey,
} from "@/types/customer-agent";
import { SECONDARY_BUTTON_CLASS } from "./controls";
import { PlatformGuides } from "./PlatformGuides";
import { SetupStep } from "./SetupStep";

const DETECT_INTERVAL_MS = 10_000;

interface InstallPanelProps {
  businessId: string;
  install: CustomerAgentConfig["install"];
  siteKey: VisitorSiteKey;
  snippet: string;
  onRefreshInstallation: () => void;
}

function lastSeen(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** Re-checks the install on window focus, and every few seconds until the website has reported in. */
export function useInstallDetection(
  install: CustomerAgentConfig["install"],
  onRefreshInstallation: () => void,
  active = true,
): Date | null {
  const seenAt = lastSeen(install.last_seen_at);
  const seen = seenAt !== null;

  useEffect(() => {
    if (!active) return;
    window.addEventListener("focus", onRefreshInstallation);
    const timer = seen
      ? undefined
      : setInterval(onRefreshInstallation, DETECT_INTERVAL_MS);
    return () => {
      window.removeEventListener("focus", onRefreshInstallation);
      clearInterval(timer);
    };
  }, [active, seen, onRefreshInstallation]);

  return seenAt;
}

export function RotateKeyButton({ businessId }: { businessId: string }) {
  const { regenerate } = useVisitorAgentInstall(businessId);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={SECONDARY_BUTTON_CLASS}
          disabled={regenerate.isPending}
        >
          {regenerate.isPending ? (
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
            Rotate key?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The current code stops working right away. Replace it on your
            website with the new code.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => regenerate.mutate()}>
            Rotate key
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** The install code, its key, and whether the website has reported in. Re-checks quietly until it has. */
export function InstallPanel({
  businessId,
  install,
  siteKey,
  snippet,
  onRefreshInstallation,
}: InstallPanelProps) {
  const seenAt = useInstallDetection(install, onRefreshInstallation);
  const host = originHost(install.last_seen_origin);

  return (
    <section className="rounded-lg border border-general-border bg-white p-5 shadow-xs sm:p-6">
      <ol>
        <SetupStep index={1} title="Copy the code" done={false}>
          <CodeSnippet code={snippet} />
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
        </SetupStep>

        <SetupStep
          index={2}
          title="Paste it before </body> on every page"
          done={false}
        >
          <PlatformGuides />
        </SetupStep>

        <SetupStep
          index={3}
          title="Publish your site"
          done={seenAt !== null}
          last
        >
          <div
            className="flex items-start gap-2.5 rounded-lg bg-muted px-4 py-3"
            aria-live="polite"
          >
            <span
              aria-hidden
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                seenAt ? "bg-green-500" : "bg-amber-500",
              )}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-general-foreground">
                {seenAt
                  ? `Connected to ${host ?? "your website"}`
                  : "Not detected yet"}
              </p>
              <p className="mt-0.5 text-sm text-general-muted-foreground">
                {seenAt
                  ? `Last seen ${formatDistanceToNowStrict(seenAt, { addSuffix: true })}`
                  : "This updates on its own once the code is live."}
              </p>
            </div>
          </div>
        </SetupStep>
      </ol>
    </section>
  );
}
