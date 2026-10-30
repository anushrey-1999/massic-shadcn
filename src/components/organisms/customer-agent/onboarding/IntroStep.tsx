"use client";

import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  MessageSquareText,
  Palette,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVisitorAgentInstall } from "@/hooks/use-customer-agent";
import type { CustomerAgentConfig } from "@/types/customer-agent";
import { SECONDARY_BUTTON_CLASS } from "../controls";
import { requestError } from "../request-error";
import { SiteExample } from "./SiteExample";
import { StepLayout } from "./StepLayout";

const HIGHLIGHTS: { icon: LucideIcon; label: string; line: string }[] = [
  {
    icon: MessageSquareText,
    label: "Answers questions any time",
    line: "Replies in seconds, even after hours.",
  },
  {
    icon: UserPlus,
    label: "Sends you new leads",
    line: "Asks for a name and number when someone is ready.",
  },
  {
    icon: Palette,
    label: "Looks like your brand",
    line: "Your colors, your greeting, your business name.",
  },
];

interface IntroStepProps {
  businessId: string;
  config: CustomerAgentConfig;
  onContinue: () => void;
}

function errorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

/** Explains the agent. "Get started" turns it on, which creates the playbook and code the next steps need. */
export function IntroStep({ businessId, config, onContinue }: IntroStepProps) {
  const install = useVisitorAgentInstall(businessId);
  const credits = install.credits.data;
  const enabled = credits?.enabled === true;
  const pending = install.grant.isPending;
  const needsProfile = errorStatus(install.grant.error) === 409;

  const start = () => {
    if (enabled) return onContinue();
    install.grant.mutate(true, {
      onSuccess: (next) => next.enabled && onContinue(),
    });
  };

  const action = install.credits.isLoading ? (
    <Button disabled>
      <Loader2 className="size-4 animate-spin" />
      Loading…
    </Button>
  ) : !credits ? (
    <Button
      variant="outline"
      className={SECONDARY_BUTTON_CLASS}
      onClick={() => void install.credits.refetch()}
    >
      Try again
    </Button>
  ) : (
    <Button onClick={start} disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? "Setting things up…" : enabled ? "Continue" : "Get started"}
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  );

  return (
    <StepLayout>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid max-w-[1120px] overflow-hidden rounded-lg border border-general-border bg-white shadow-xs lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="flex min-w-0 flex-col justify-center gap-6 p-6 lg:p-8">
            <header>
              <h2 className="text-xl font-medium text-general-foreground">
                Meet your customer agent
              </h2>
              <p className="mt-1.5 text-sm text-general-muted-foreground">
                It chats with customers on your website and sends you their
                details.
              </p>
            </header>

            <ul className="flex flex-col gap-4">
              {HIGHLIGHTS.map(({ icon: Icon, label, line }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted">
                    <Icon
                      className="size-4 text-general-foreground"
                      aria-hidden
                    />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-general-foreground">
                      {label}
                    </p>
                    <p className="text-sm text-general-muted-foreground">
                      {line}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {action}
                {!enabled && credits && (
                  <p className="text-sm text-general-muted-foreground">
                    About 5 minutes. Nothing goes live until you install it.
                  </p>
                )}
              </div>

              {!credits && install.credits.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {requestError(install.credits.error)}
                </p>
              )}
              {needsProfile && (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                >
                  <p className="text-sm text-amber-900">
                    Complete your business profile first
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className={SECONDARY_BUTTON_CLASS}
                  >
                    <Link href={`/business/${businessId}/profile`}>
                      Open profile
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 border-t border-general-border bg-muted/60 p-6 lg:border-t-0 lg:border-l">
            <SiteExample config={config} />
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
