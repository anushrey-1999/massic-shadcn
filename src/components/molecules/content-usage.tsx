"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useContentUsage,
  type BusinessContentUsage,
  type ContentUsageFeature,
} from "@/hooks/use-content-usage";

const labels: Record<ContentUsageFeature, string> = {
  blogs_pages: "Blogs & pages",
  social_posts: "Social",
};

export function ContentUsageInfoTooltip({
  usage,
  feature,
  loading,
  error,
}: {
  usage?: BusinessContentUsage;
  feature: ContentUsageFeature;
  loading?: boolean;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const allowance = usage?.features[feature];
  const period = usage?.billing_period;
  const expired = period && Date.parse(period.end) <= Date.now();
  if (
    !loading &&
    (error ||
      !allowance ||
      expired ||
      allowance.state === "unavailable" ||
      allowance.state === "unsupported")
  )
    return null;

  const reset = period
    ? new Date(period.end).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 cursor-help text-muted-foreground hover:text-foreground"
          aria-label={`${labels[feature]} usage`}
          aria-busy={loading || undefined}
          onClick={(event) => {
            event.preventDefault();
            setOpen((current) => !current);
          }}
        >
          <Info className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="end"
        sideOffset={6}
        className="max-w-60 space-y-1"
      >
        {loading ? (
          <p>Loading usage…</p>
        ) : (
          <>
            <p>
              {labels[feature]}:{" "}
              {allowance!.state === "unlimited"
                ? "Unlimited"
                : `${allowance!.current_usage}/${allowance!.limit} used`}
            </p>
            {reset && (
              <p>
                Resets <time dateTime={period!.end}>{reset}</time>
              </p>
            )}
            {(allowance!.credit_funded_executions ?? 0) > 0 && (
              <p>
                +{allowance!.credit_funded_executions} with credits
              </p>
            )}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function ContentUsageInfo({
  businessId,
  feature,
}: {
  businessId: string;
  feature: ContentUsageFeature;
}) {
  const query = useContentUsage([businessId]);
  return (
    <ContentUsageInfoTooltip
      usage={query.data?.[businessId.toLowerCase()]}
      feature={feature}
      loading={query.isPending}
      error={query.isError}
    />
  );
}
