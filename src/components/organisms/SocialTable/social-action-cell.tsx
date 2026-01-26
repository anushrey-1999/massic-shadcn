"use client";

import * as React from "react";
import { toast } from "sonner";
import { Eye, Sparkles, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import type { TacticRow } from "@/types/social-types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Typography } from "@/components/ui/typography";
import { SocialChannelPreview } from "@/components/organisms/social-actions/social-channel-preview";

import {
  useSocialActionContentQuery,
  useSocialActions,
  type SocialActionResponse,
} from "@/hooks/use-social-actions";

function getCampaignClusterId(row: TacticRow): string | null {
  const candidates = [
    (row as any).campaignClusterId,
    (row as any).campaign_cluster_id,
    (row as any).campaign_clusterId,
    (row as any).campaignclusterid,
    (row as any).cluster_id,
  ];

  for (const candidate of candidates) {
    if (candidate === 0) return "0";
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
  }

  return null;
}

function getStatusLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Queued";
  if (s === "processing") return "Generating";
  if (s === "success") return "Ready";
  if (s === "error") return "Error";
  return status || "Unknown";
}

function extractContent(data: SocialActionResponse | undefined): any {
  return data?.output_data?.social_content || null;
}

function normalizeChannel(channelName: string | undefined | null): string {
  const normalized = (channelName || "").toString().trim().toLowerCase();
  if (normalized === "x") return "twitter";
  return normalized;
}

export function SocialActionCell({
  businessId,
  row,
  channelName,
}: {
  businessId: string;
  row: TacticRow;
  channelName?: string;
}) {
  const queryClient = useQueryClient();
  const { startGeneration } = useSocialActions();

  const campaignClusterId = React.useMemo(() => getCampaignClusterId(row), [row]);

  const [open, setOpen] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [justGenerated, setJustGenerated] = React.useState(false);

  const contentQuery = useSocialActionContentQuery({
    businessId,
    campaignClusterId: campaignClusterId || "",
    enabled: open && !!campaignClusterId,
    pollingIntervalMs: 3000,
  });

  const status = (contentQuery.data?.status || "").toString().toLowerCase();
  const isGenerating = status === "pending" || status === "processing";

  // Clear justGenerated flag when generation completes
  React.useEffect(() => {
    if (justGenerated && !isGenerating && status === "success") {
      setJustGenerated(false);
    }
  }, [justGenerated, isGenerating, status]);

  // Only show generating message if user actively clicked generate
  const showGeneratingCard = isGenerating && justGenerated;

  const isNotGeneratedYet =
    (contentQuery.error as any)?.response?.status === 404 ||
    (contentQuery.error as any)?.response?.status === 400;

  const content = extractContent(contentQuery.data);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (nextOpen) return;

      const latestStatus = (contentQuery.data?.status || "").toString();
      if (campaignClusterId && latestStatus) {
        // Silently update the tactics data with the latest status without showing loading
        queryClient.setQueriesData(
          { queryKey: ["tactics-all", businessId] },
          (oldData: any) => {
            if (!Array.isArray(oldData)) return oldData;

            const nextRows = (oldData as TacticRow[]).map((r) => {
              const id = getCampaignClusterId(r);
              if (id !== campaignClusterId) return r;
              return { ...r, status: latestStatus };
            });

            return nextRows;
          }
        );

        // Refetch content in background without showing loading state
        queryClient.refetchQueries({
          queryKey: ["social-action-content", businessId, campaignClusterId],
          type: "inactive",
        });
      }
    },
    [businessId, campaignClusterId, contentQuery.data?.status, queryClient]
  );

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!campaignClusterId) {
      toast.error("Missing campaign cluster id");
      return;
    }
    setOpen(true);
  };

  const handleGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!campaignClusterId) {
      toast.error("Missing campaign cluster id");
      return;
    }

    setOpen(true);
    setStarting(true);
    setJustGenerated(true);

    try {
      const response = await startGeneration(businessId, campaignClusterId);
      const startedStatus = (response?.status || "pending").toString();

      queryClient.setQueriesData(
        { queryKey: ["tactics", businessId] },
        (oldData: any) => {
          if (!oldData || !Array.isArray(oldData.data)) return oldData;

          const nextRows = (oldData.data as TacticRow[]).map((r) => {
            const id = getCampaignClusterId(r);
            if (id !== campaignClusterId) return r;
            return { ...r, status: startedStatus };
          });

          return { ...oldData, data: nextRows };
        }
      );

      toast.success("Social content generation started.");
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toast.error("You need more execution credits to generate social content.");
      } else {
        toast.error("Failed to start generation.");
      }
    } finally {
      setStarting(false);
      contentQuery.refetch();
    }
  };

  const title = row.title || row.cluster_name || "Social Content";
  const resolvedChannel = normalizeChannel(
    channelName ||
    (row as any).channel_name ||
    (row as any).channelName ||
    (row as any).contentType ||
    ""
  );

  const rowStatus = (row.status || "").toString().toLowerCase();
  const VIEW_ACTION_STATUSES = React.useMemo(() => new Set(["success", "pending", "processing"]), []);
  const showView = VIEW_ACTION_STATUSES.has(rowStatus);
  const primaryAction: "view" | "generate" = showView ? "view" : "generate";
  const PrimaryIcon = primaryAction === "view" ? Eye : Sparkles;
  const primaryLabel = primaryAction === "view" ? "View" : "Generate";
  const handlePrimaryClick = primaryAction === "view" ? handleOpen : handleGenerate;
  const buttonVariant = primaryAction === "generate" ? "default" : "outline";

  const isReddit = resolvedChannel === "reddit";

  return (
    <>
      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
        {!isReddit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={buttonVariant}
                className="size-6 rounded-sm"
                onClick={handlePrimaryClick}
                aria-label={primaryLabel}
                disabled={primaryAction === "generate" ? starting : false}
              >
                <PrimaryIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {primaryLabel}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="w-fit max-w-[90vw] border-0 bg-transparent p-2 shadow-none max-h-[95vh] overflow-auto"
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div className="relative flex w-full justify-center p-2">
            <DialogClose asChild>
              <Button
                variant="secondary"
                size="icon"
                type="button"
                className="absolute right-2 top-2 h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>

            {showGeneratingCard || isGenerating ? (
              <div className="w-[420px] max-w-[90vw] min-h-[300px] rounded-lg bg-background px-6 py-10 text-center flex flex-col items-center justify-center gap-2">
                <Typography variant="p" className="text-muted-foreground">
                  Generating social content... This may take a few minutes.
                </Typography>
                <Typography variant="p" className="text-muted-foreground">
                  Keep this window open.
                </Typography>
              </div>
            ) : isNotGeneratedYet ? (
              <div className="w-[420px] max-w-[90vw] min-h-[300px] rounded-lg bg-background px-6 py-8 text-center flex flex-col items-center justify-center">
                <Typography variant="p" className="text-muted-foreground">
                  No social content yet.
                </Typography>
                <Button className="mt-4" type="button" onClick={handleGenerate} disabled={starting}>
                  Generate
                </Button>
              </div>
            ) : contentQuery.error ? (
              <div className="w-[420px] max-w-[90vw] min-h-[300px] rounded-lg bg-background px-6 py-8 text-center space-y-2 flex flex-col items-center justify-center">
                <Typography variant="p" className="text-destructive">
                  Failed to load social content
                </Typography>
                <Typography variant="p" className="text-muted-foreground">
                  {(contentQuery.error as any)?.response?.data?.detail ||
                    (contentQuery.error as any)?.message ||
                    "An error occurred"}
                </Typography>
                <Button type="button" variant="outline" onClick={() => contentQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : (contentQuery.isLoading || status === "success") ? (
              <SocialChannelPreview
                channel={resolvedChannel}
                content={content || {}}
                isLoading={contentQuery.isLoading}
              />
            ) : (
              <div className="w-[420px] max-w-[90vw] min-h-[300px] rounded-lg bg-background px-6 py-10 text-center flex flex-col items-center justify-center">
                <Typography variant="p" className="text-muted-foreground">
                  No content available.
                </Typography>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
