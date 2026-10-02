"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type ShopifyPublishState = "not_published" | "draft" | "live";
export type ShopifyPendingAction = "draft" | "live" | null;

interface ShopifyPublishActionsProps {
  state: ShopifyPublishState;
  liveUrl: string | null;
  actionsDisabled: boolean;
  isBusy: boolean;
  pendingAction: ShopifyPendingAction;
  onSaveDraft: () => void;
  onPublishLive: () => void;
}

export function ShopifyPublishActions({
  state,
  liveUrl,
  actionsDisabled,
  isBusy,
  pendingAction,
  onSaveDraft,
  onPublishLive,
}: ShopifyPublishActionsProps) {
  const draftLabel = pendingAction === "draft" && isBusy
    ? state === "live"
      ? "Moving…"
      : "Saving…"
    : state === "live"
      ? "Move to draft"
      : state === "draft"
        ? "Update draft"
        : "Save draft";
  const liveLabel = pendingAction === "live" && isBusy
    ? state === "live"
      ? "Updating…"
      : "Publishing…"
    : state === "live"
      ? "Update live"
      : "Publish now";
  const controlsDisabled = actionsDisabled || isBusy;

  return (
    <>
      {state === "live" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => {
                if (liveUrl) window.open(liveUrl, "_blank", "noopener,noreferrer");
              }}
              disabled={!liveUrl || controlsDisabled}
              aria-label="View live Shopify article"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{liveUrl ? "View live" : "Live URL unavailable"}</TooltipContent>
        </Tooltip>
      ) : null}
      <Button type="button" variant="outline" onClick={onSaveDraft} disabled={controlsDisabled}>
        {draftLabel}
      </Button>
      <Button type="button" onClick={onPublishLive} disabled={controlsDisabled}>
        {liveLabel}
      </Button>
    </>
  );
}
