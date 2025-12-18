"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Sparkles, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import type { WebPageRow } from "@/types/web-page-types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWebPageActions, type WebActionType } from "@/hooks/use-web-page-actions";

const VIEW_ACTION_STATUSES = new Set([
  "success",
  "update_required",
  "outline_only",
  "final_only",
  "pending",
  "processing",
]);

function getRowAction(row: WebPageRow): { icon: typeof Sparkles; label: string } | { icon: typeof Eye; label: string } {
  const status = (row.status || "").toString().toLowerCase();
  const shouldView = VIEW_ACTION_STATUSES.has(status);

  if (shouldView) {
    return { icon: Eye, label: "View" };
  }

  const intent = (row.search_intent || "").toString().toLowerCase();
  const label = intent === "informational" ? "Write" : "Build";
  return { icon: Sparkles, label };
}

function getType(row: WebPageRow): WebActionType {
  return (row.search_intent || "").toString().toLowerCase() === "informational" ? "blog" : "page";
}

export function WebPageActionCell({ businessId, row }: { businessId: string; row: WebPageRow }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { startOutline } = useWebPageActions();

  const [open, setOpen] = React.useState(false);
  const [workingAction, setWorkingAction] = React.useState<null | "outline" | "view">(null);
  const action = getRowAction(row);

  const pageId = row.page_id;

  const navigateToView = (mode?: "outline" | "final") => {
    if (!pageId) {
      toast.error("Missing page id");
      return;
    }

    const intent = row.search_intent || "";
    const keyword = row.keyword || "";

    const modeParam = mode ? `&mode=${encodeURIComponent(mode)}` : "";
    router.push(
      `/business/${businessId}/web/page/${pageId}/view?intent=${encodeURIComponent(intent)}&keyword=${encodeURIComponent(keyword)}${modeParam}`
    );
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!pageId) {
      toast.error("Missing page id");
      return;
    }

    if (isGenerating) {
      navigateToView("outline");
      return;
    }

    setOpen(true);
  };

  const type = getType(row);

  const status = (row.status || "").toString().toLowerCase();
  const isGenerating = status === "pending" || status === "processing";

  const handleViewAction = () => {
    setOpen(false);
    navigateToView();
  };

  const handleGenerateOutline = async () => {
    if (!pageId) return;

    if (workingAction) return;
    setWorkingAction("outline");
    try {
      if (!VIEW_ACTION_STATUSES.has(status)) {
        await startOutline(type, businessId, pageId);
        queryClient.invalidateQueries({ queryKey: ["web-page", businessId] });
        toast.success(type === "blog" ? "Blog outline generation started." : "Page outline generation started.");
      }
      setOpen(false);
      navigateToView("outline");
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toast.error(
          type === "blog"
            ? "You need more execution credits to generate blog content."
            : "You need more execution credits to generate page content."
        );
      } else {
        toast.error("Failed to start generation.");
      }
    } finally {
      setWorkingAction(null);
    }
  };

  const Icon = action.icon;
  const modalTitle =
    action.label === "View" ? (type === "blog" ? "View Blog" : "View Page") : type === "blog" ? "Write Blog" : "Build Page";
  const viewButtonLabel = type === "blog" ? "View Blog" : "View Page";
  const actionTooltipLabel = action.label === "View" ? viewButtonLabel : type === "blog" ? "Generate Blog" : "Generate Page";

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 text-primary"
            onClick={handleClick}
            aria-label={actionTooltipLabel}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {actionTooltipLabel}
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-[520px] p-0">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold leading-[1.2] tracking-[-0.4px] text-foreground">
                {modalTitle}
              </DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" type="button" className="h-4 w-4 p-0 text-muted-foreground">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="px-4 pt-4 pb-0 flex items-center justify-center">
            {row.keyword ? (
              <p className="text-base font-medium leading-normal text-foreground text-center">{row.keyword}</p>
            ) : null}
          </div>

          <DialogFooter className="px-4 py-4">
            {action.label === "View" ? (
              <div className="flex w-full justify-center">
                <Button type="button" onClick={handleViewAction} disabled={isGenerating}>
                  {viewButtonLabel}
                </Button>
              </div>
            ) : (
              <div className="flex w-full justify-center">
                <Button type="button" onClick={handleGenerateOutline} disabled={isGenerating || workingAction !== null}>
                  {type === "blog" ? "Generate Blog" : "Generate Page"}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
