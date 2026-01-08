"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Copy,
  Mail,
  Loader2,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

import { DownloadReportDialog } from "./download-report-dialog";

import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { useReportRunDetail } from "@/hooks/use-report-runs";
import { Button } from "@/components/ui/button";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";
import { toast } from "sonner";
import { copyToClipboard } from "@/utils/clipboard";

interface ReportDetailClientProps {
  businessId: string;
  reportRunId: string;
}

export function ReportDetailClient({ businessId, reportRunId }: ReportDetailClientProps) {
  const router = useRouter();
  const [reportEditor, setReportEditor] = React.useState<Editor | null>(null);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);

  const { profileData } = useBusinessProfileById(businessId);
  const businessName = profileData?.Name || profileData?.DisplayName || "Business";

  const { data: reportData, isLoading, error } = useReportRunDetail({
    reportRunId,
    enabled: !!reportRunId,
    pollingIntervalMs: 6000,
  });

  const status = (reportData?.status || "").toLowerCase();
  const isProcessing = status === "pending" || status === "processing";
  const isSuccess = status === "success";
  const isError = status === "error";

  const performanceReport = reportData?.narrative_text?.performance_report || "";
  const period = reportData?.period || "3-month";

  const handleBack = () => {
    router.push(`/business/${businessId}/reports`);
  };

  const handleDownload = () => {
    setIsDownloadDialogOpen(true);
  };

  const handleShare = () => {
    toast.info("Share functionality coming soon");
  };

  const handleCopyReport = async () => {
    if (reportEditor) {
      const htmlContent = reportEditor.getHTML();
      if (htmlContent && htmlContent.trim()) {
        try {
          if (typeof ClipboardItem !== "undefined") {
            const clipboardItem = new ClipboardItem({
              "text/html": new Blob([htmlContent], { type: "text/html" }),
              "text/plain": new Blob([reportEditor.getText()], { type: "text/plain" }),
            });
            await navigator.clipboard.write([clipboardItem]);
          } else {
            await navigator.clipboard.writeText(reportEditor.getText());
          }
          toast.success("Copied");
          return;
        } catch {
          try {
            await navigator.clipboard.writeText(reportEditor.getText());
            toast.success("Copied");
            return;
          } catch {
            toast.error("Copy failed");
            return;
          }
        }
      }
    }

    const ok = await copyToClipboard(performanceReport);
    if (ok) toast.success("Copied");
    else toast.error("Copy failed");
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 bg-white px-40 py-8">
      {/* Back Button Section */}
      <div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleBack}
          className="gap-2 h-9 px-4 py-[7.5px] text-sm font-medium text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Show loading state when fetching initial data */}
      {isLoading && !reportData && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading report...</span>
          </div>
        </div>
      )}

      {/* Only show content once we have data */}
      {reportData && (
        <>
          {/* Title and Actions Section */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="font-mono text-base font-normal text-muted-foreground leading-normal">
                {businessName} {period} Performance Report
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyReport}
                disabled={isProcessing || !performanceReport}
                title="Copy Report"
                className="h-9 w-9"
              >
                <Copy className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownload}
                disabled={isProcessing || !performanceReport}
                title="Download Report"
                className="h-9 w-9"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleShare}
                disabled
                className="gap-2 h-9 px-4 py-[7.5px] bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Mail className="h-[13.25px] w-[13.25px]" />
                <span className="text-sm font-medium">Share</span>
              </Button>
            </div>
          </div>

          {/* Line Separator */}
          <div className="w-full h-px bg-border" />

          {/* Content Section */}
          <div className="flex-1 min-h-0 overflow-auto">
            {isProcessing && (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-medium">Generating Report</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This may take a few minutes. The page will update automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isError && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="font-medium text-destructive">Report Generation Failed</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(() => {
                      const errors = reportData?.errors;
                      if (!errors) return "An error occurred while generating the report.";
                      if (typeof errors === "string") return errors;
                      if (typeof errors === "object") {
                        // Handle error object with message or error properties
                        const errorObj = errors as Record<string, any>;
                        return errorObj.message || errorObj.error || "An error occurred while generating the report.";
                      }
                      return "An error occurred while generating the report.";
                    })()}
                  </p>
                </div>
              </div>
            )}

            {isSuccess && performanceReport && (
              <div className="prose prose-sm max-w-none">
                <InlineTipTapEditor
                  content={performanceReport}
                  isEditable={false}
                  className="prose prose-sm max-w-none"
                  onEditorReady={setReportEditor}
                />
              </div>
            )}

            {isSuccess && !performanceReport && (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No report content available</p>
              </div>
            )}
          </div>
        </>
      )}
      <DownloadReportDialog
        isOpen={isDownloadDialogOpen}
        onClose={() => setIsDownloadDialogOpen(false)}
        markdownContent={performanceReport}
        defaultFilename={`${businessName} - ${period} Performance Report`}
      />
    </div>
  );
}
