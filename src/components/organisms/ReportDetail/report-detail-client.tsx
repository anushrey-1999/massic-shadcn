"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Copy,
  Mail,
  Loader2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  List,
  ListOrdered,
  Link2,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

import { DownloadReportDialog } from "./download-report-dialog";
import { ShareReportDialog } from "./share-report-dialog";

import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { useReportRunDetail, useUpdatePerformanceReport } from "@/hooks/use-report-runs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";
import { toast } from "sonner";
import { copyToClipboard } from "@/utils/clipboard";
import { formatPeriodRange } from "@/lib/format";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReportDetailClientProps {
  businessId: string;
  reportRunId: string;
}

export function ReportDetailClient({ businessId, reportRunId }: ReportDetailClientProps) {
  const router = useRouter();
  const [reportEditor, setReportEditor] = React.useState<Editor | null>(null);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);

  const [localContent, setLocalContent] = React.useState<string>("");
  const [isEditorFocused, setIsEditorFocused] = React.useState(false);
  const lastSavedRef = React.useRef<string>("");
  const isInitialLoadRef = React.useRef(true);
  const lastStatusRef = React.useRef<string>("");
  const pendingContentRef = React.useRef<string | null>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const periodicTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = React.useRef(false);

  const { profileData } = useBusinessProfileById(businessId);
  const businessName = profileData?.Name || profileData?.DisplayName || "Business";

  const updateMutation = useUpdatePerformanceReport();

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
  const periodStart = reportData?.period_start;
  const periodEnd = reportData?.period_end;
  const periodRange = formatPeriodRange(periodStart, periodEnd);
  const reportTitle = `${businessName} ${period}${periodRange ? ` (${periodRange})` : ""} Performance Report`;

  const canonicalize = React.useCallback((value: string) => {
    return (value || "").replace(/\r\n/g, "\n").replace(/\u00A0/g, " ").trimEnd();
  }, []);

  // Sync content from server
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingContentRef.current && !isSavingRef.current) {
        handleSaveReport(pendingContentRef.current);
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (periodicTimerRef.current) {
        clearInterval(periodicTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!reportData) return;

    const prevStatus = lastStatusRef.current;
    const wasPolling = prevStatus === "pending" || prevStatus === "processing";
    const isPolling = status === "pending" || status === "processing";
    const transitionedFromPollingToTerminal = wasPolling && !isPolling;

    lastStatusRef.current = status;

    const editorFocused = !!reportEditor?.isFocused;
    const shouldSyncFromServer =
      !editorFocused && (isInitialLoadRef.current || isPolling || transitionedFromPollingToTerminal);

    if (!shouldSyncFromServer) return;

    const rawReport = reportData?.narrative_text?.performance_report || "";
    setLocalContent(rawReport);
    lastSavedRef.current = rawReport;

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }
  }, [reportData, status, reportEditor]);

  const handleBack = () => {
    router.push(`/business/${businessId}/reports`);
  };

  const handleDownload = () => {
    setIsDownloadDialogOpen(true);
  };

  const handleShare = () => {
    setIsShareDialogOpen(true);
  };

  const handleSaveReport = React.useCallback(async (markdown: string) => {
    if (isInitialLoadRef.current) return;

    const next = canonicalize(markdown);
    if (next === canonicalize(lastSavedRef.current)) {
      pendingContentRef.current = null;
      return;
    }

    if (isSavingRef.current) {
      pendingContentRef.current = next;
      return;
    }

    try {
      isSavingRef.current = true;
      await updateMutation.mutateAsync({
        reportRunId,
        performance_report: next,
      });
      lastSavedRef.current = next;
      setLocalContent(next);
      toast.success("Changes Saved");
    } catch {
      toast.error("Failed to save changes to server");
    } finally {
      isSavingRef.current = false;

      if (pendingContentRef.current && pendingContentRef.current !== next) {
        const pending = pendingContentRef.current;
        pendingContentRef.current = null;
        await handleSaveReport(pending);
      }
    }
  }, [canonicalize, reportRunId, updateMutation]);

  const handleContentChange = React.useCallback((markdown: string) => {
    if (isInitialLoadRef.current) return;

    pendingContentRef.current = markdown;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (pendingContentRef.current) {
        handleSaveReport(pendingContentRef.current);
      }
    }, 5000);

    if (!periodicTimerRef.current) {
      periodicTimerRef.current = setInterval(() => {
        if (pendingContentRef.current && !isSavingRef.current) {
          handleSaveReport(pendingContentRef.current);
        }
      }, 45000);
    }
  }, [handleSaveReport]);

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
            <div className="flex flex-col gap-1 flex-1 min-w-0 mr-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h1 className="font-mono text-base font-normal text-muted-foreground leading-normal truncate cursor-pointer">
                    {reportTitle}
                  </h1>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-[600px]">
                  <p className="wrap-break-words">{reportTitle}</p>
                </TooltipContent>
              </Tooltip>
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
                className="gap-2 h-9 px-4 py-[7.5px] text-primary-foreground"
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
              <Card className="p-4 space-y-3 border-0">
                {isEditorFocused && (
                  <div className="sticky top-0 z-10 bg-white flex items-center gap-2 border rounded-md px-2 py-1 mb-3">
                    {[Bold, Italic, Underline, Strikethrough, Quote, List, ListOrdered, Link2].map((Icon, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="icon"
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (!reportEditor) return;

                          switch (idx) {
                            case 0:
                              reportEditor.chain().focus().toggleBold().run();
                              break;
                            case 1:
                              reportEditor.chain().focus().toggleItalic().run();
                              break;
                            case 2:
                              reportEditor.chain().focus().toggleUnderline().run();
                              break;
                            case 3:
                              reportEditor.chain().focus().toggleStrike().run();
                              break;
                            case 4:
                              reportEditor.chain().focus().toggleBlockquote().run();
                              break;
                            case 5:
                              reportEditor.chain().focus().toggleBulletList().run();
                              break;
                            case 6:
                              reportEditor.chain().focus().toggleOrderedList().run();
                              break;
                            case 7: {
                              const url = window.prompt("Enter URL:");
                              if (url) {
                                reportEditor.chain().focus().setLink({ href: url }).run();
                              }
                              break;
                            }
                          }
                        }}
                        disabled={!reportEditor}
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                )}

                <InlineTipTapEditor
                  content={localContent}
                  className="prose prose-sm max-w-none border-0"
                  editorClassName="border-0"
                  isEditable={true}
                  onEditorReady={setReportEditor}
                  onSave={handleSaveReport}
                  onChange={handleContentChange}
                  onFocus={() => setIsEditorFocused(true)}
                  onBlur={() => setIsEditorFocused(false)}
                />
              </Card>
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
        defaultFilename={reportTitle}
      />
      <ShareReportDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        reportName={reportTitle}
        reportRunId={reportRunId}
      />
    </div>
  );
}
