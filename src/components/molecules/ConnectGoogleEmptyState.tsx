"use client";

import React from "react";
import Link from "next/link";
import { PlugZap } from "lucide-react";

import { EmptyState } from "@/components/molecules/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GoogleIntegration } from "@/hooks/use-business-connections";

const INTEGRATION_LABELS: Record<GoogleIntegration, string> = {
  gsc: "Google Search Console",
  ga4: "Google Analytics",
  gbp: "Google Business Profile",
};

const SETTINGS_HREF = "/settings";

function formatList(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}

export function integrationLabels(requires: GoogleIntegration[]): string {
  return formatList(requires.map((requirement) => INTEGRATION_LABELS[requirement]));
}

export interface ConnectGoogleEmptyStateProps {
  /** Integrations that would unlock this view. Any one of them is enough. */
  requires: GoogleIntegration[];
  /** What the user is missing out on, e.g. "analytics for this business". */
  subject?: string;
  className?: string;
}

/**
 * Full-page prompt shown when a business has no Google integration linked,
 * so there is no data to render and no request worth sending.
 */
export function ConnectGoogleEmptyState({
  requires,
  subject = "this page",
  className,
}: ConnectGoogleEmptyStateProps) {
  const labels = integrationLabels(requires);

  return (
    <div className={cn("p-7", className)}>
      <EmptyState
        icon={<PlugZap className="size-10 text-general-muted-foreground" aria-hidden="true" />}
        iconClassName="h-auto w-auto"
        title={`Connect ${labels}`}
        description={`Massic needs ${labels} to show ${subject}. Link an account in settings and your data will appear here once it finishes importing.`}
        buttons={[{ label: "Go to settings", href: SETTINGS_HREF }]}
        cardClassName="min-h-[320px] rounded-lg border-none bg-white shadow-none"
        cardContentClassName="flex min-h-[320px] items-center justify-center p-6"
      />
    </div>
  );
}

export interface ConnectGoogleInlineNoticeProps {
  requires: GoogleIntegration[];
  className?: string;
  /** Hides the settings link where a card is too small to hold it. */
  hideAction?: boolean;
}

/**
 * Compact in-card variant for partially connected businesses, where the rest
 * of the page has data but one card's integration is missing.
 */
export function ConnectGoogleInlineNotice({
  requires,
  className,
  hideAction = false,
}: ConnectGoogleInlineNoticeProps) {
  const labels = integrationLabels(requires);

  return (
    <div
      className={cn(
        "flex min-h-[120px] flex-col items-center justify-center gap-2 px-6 py-5 text-center",
        className
      )}
    >
      <p className="text-sm text-general-muted-foreground">
        Connect {labels} to see this data.
      </p>
      {hideAction ? null : (
        <Button variant="outline" size="sm" asChild>
          <Link href={SETTINGS_HREF}>Go to settings</Link>
        </Button>
      )}
    </div>
  );
}
