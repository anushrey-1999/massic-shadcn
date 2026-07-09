"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MultiEmailInput } from "@/components/molecules/MultiEmailInput";

interface ShareReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportName: string;
  reportRunId: string;
}

export function ShareReportDialog({
  isOpen,
  onClose,
  reportName,
  reportRunId,
}: ShareReportDialogProps) {
  const [emails, setEmails] = React.useState<string[]>([]);

  const shareReportMutation = useMutation({
    mutationFn: async ({ emails: recipientEmails }: { emails: string[] }) => {
      return await api.post(
        `/analytics/report-runs/${encodeURIComponent(reportRunId)}/share`,
        "node",
        {
          emails: recipientEmails,
          includeWatermark: false,
        },
        {
          timeout: 300000,
        }
      );
    },
    retry: false,
    onSuccess: () => {
      toast.success("Report shared successfully");
      onClose();
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || "Failed to share report";
      toast.error(errorMessage);
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      setEmails([]);
    }
  }, [isOpen]);

  function handleShare() {
    if (emails.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    shareReportMutation.mutate({ emails });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] rounded-[12px] p-0">
        <div className="flex flex-col items-start p-4 w-full">
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="font-semibold text-[20px] leading-[1.2] text-[#0A0A0A]">
              Share via email
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              disabled={shareReportMutation.isPending}
              className="h-4 w-4 shrink-0 opacity-70 hover:opacity-100 transition-opacity disabled:pointer-events-none"
            >
              <X className="h-4 w-4 text-[#525252]" strokeWidth={1.5} />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        <div className="h-px bg-[#E5E5E5] w-full" />

        <div className="flex flex-col gap-6 items-center justify-center pt-4 px-8 pb-0 w-full">
          <div className="flex flex-col gap-[6px] items-start w-full">
            <p className="font-mono text-[12px] leading-[1.5] text-[#737373] w-full">
              {reportName}
            </p>
            <div className="h-px bg-[#E5E5E5] w-full" />
          </div>

          <div className="flex flex-col gap-2 items-start p-2 bg-[#FAFAFA] rounded-[8px] w-full">
            <p className="font-medium text-[14px] leading-[1.5] text-[#0A0A0A]">
              Recipient Emails
            </p>
            <MultiEmailInput
              value={emails}
              onChange={setEmails}
              disabled={shareReportMutation.isPending}
            />
          </div>
        </div>

        <div className="flex flex-col gap-0 items-center justify-center p-4 w-full">
          <div className="flex gap-2 items-center justify-end w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={shareReportMutation.isPending}
              className="flex gap-2 items-center justify-center min-h-9 px-4 py-[7.5px] bg-[rgba(255,255,255,0.1)] border border-[#D4D4D4] rounded-[8px] font-medium text-[14px] leading-[1.5] text-[#0A0A0A] hover:bg-[rgba(0,0,0,0.05)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={shareReportMutation.isPending || emails.length === 0}
              className="flex gap-2 items-center justify-center min-h-9 px-4 py-[7.5px] bg-[#2E6A56] rounded-[8px] font-medium text-[14px] leading-[1.5] text-[#FAFAFA] hover:bg-[#2E6A56]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {shareReportMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {shareReportMutation.isPending ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
