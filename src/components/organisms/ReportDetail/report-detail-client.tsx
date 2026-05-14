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
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

import { DownloadReportDialog } from "./download-report-dialog";
import { ShareReportDialog } from "./share-report-dialog";
import { PerformanceReportV2View } from "./performance-report-v2-view";

import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { useReportRunDetail, useUpdatePerformanceReport } from "@/hooks/use-report-runs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";
import { toast } from "sonner";
import { copyToClipboard } from "@/utils/clipboard";
import { formatPeriodRange } from "@/lib/format";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  parsePerformanceReport,
  performanceReportToPlainText,
  getPerformanceReportV2EditedFields,
  type PerformanceReportV2EditedFields,
} from "@/utils/performance-report-v2";
import type { PerformanceReportV2TemplateContext } from "@/utils/performance-report-v2-template";
import {
  generatePdfFromMarkdown,
  generatePdfFromPerformanceReportV2,
} from "@/utils/pdf-generator";

interface ReportDetailClientProps {
  businessId: string;
  reportRunId: string;
}

const EMAIL_SUMMARY_SOFT_LIMIT = 600;

function normalizeEmailSummaryValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";

  const record = value as Record<string, unknown>;
  const direct = record.email_summary ?? record.summary;
  return typeof direct === "string" ? direct : "";
}

export function ReportDetailClient({ businessId, reportRunId }: ReportDetailClientProps) {
  const router = useRouter();
  const [reportEditor, setReportEditor] = React.useState<Editor | null>(null);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);

  const [localContent, setLocalContent] = React.useState<string>("");
  const [isEditorFocused, setIsEditorFocused] = React.useState(false);
  const [isV2EditMode, setIsV2EditMode] = React.useState(false);
  const [v2ResetVersion, setV2ResetVersion] = React.useState(0);
  const [emailSummaryDraft, setEmailSummaryDraft] = React.useState("");
  const [isEmailSummaryFocused, setIsEmailSummaryFocused] = React.useState(false);
  const [isEmailSummarySaving, setIsEmailSummarySaving] = React.useState(false);
  const lastSavedRef = React.useRef<string>("");
  const isInitialLoadRef = React.useRef(true);
  const lastStatusRef = React.useRef<string>("");
  const pendingContentRef = React.useRef<string | null>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const periodicTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = React.useRef(false);
  const emailSummaryDraftRef = React.useRef("");
  const emailSummarySavedRef = React.useRef("");
  const emailSummaryDirtyRef = React.useRef(false);
  const emailSummaryDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const emailSummarySaveInFlightRef = React.useRef(false);
  const pendingEmailSummarySaveRef = React.useRef<string | null>(null);

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

  const parsedReport = React.useMemo(
    () => parsePerformanceReport(reportData?.narrative_text?.performance_report),
    [reportData?.narrative_text?.performance_report]
  );
  const isV2Report = parsedReport.kind === "v2";
  const performanceReport = parsedReport.kind === "markdown" ? parsedReport.markdown : "";
  const performanceReportV2 = parsedReport.kind === "v2" ? parsedReport.document : null;
  const performanceReportV2Raw = parsedReport.kind === "v2" ? parsedReport.raw : null;
  const v2EditedFieldsCount = React.useMemo(() => {
    if (!performanceReportV2Raw) return 0;
    return Object.keys(getPerformanceReportV2EditedFields(performanceReportV2Raw)).length;
  }, [performanceReportV2Raw]);
  const emailSummary = React.useMemo(() => {
    const direct = normalizeEmailSummaryValue(reportData?.email_summary);
    if (direct.trim()) return direct;

    const narrativeText = reportData?.narrative_text;
    const nested = narrativeText && typeof narrativeText === "object"
      ? normalizeEmailSummaryValue((narrativeText as Record<string, unknown>).email_summary)
      : "";
    if (nested.trim()) return nested;

    const llmOutputs = narrativeText && typeof narrativeText === "object"
      ? (narrativeText as Record<string, unknown>).llm_outputs
      : null;
    const llmEmailSummary = llmOutputs && typeof llmOutputs === "object"
      ? normalizeEmailSummaryValue((llmOutputs as Record<string, unknown>).email_summary)
      : "";
    return llmEmailSummary;
  }, [reportData?.email_summary, reportData?.narrative_text]);
  const hasReportContent =
    parsedReport.kind === "v2" || (parsedReport.kind === "markdown" && !!parsedReport.markdown.trim());
  const period = reportData?.period || "3-month";
  const periodStart = reportData?.period_start;
  const periodEnd = reportData?.period_end;
  const periodRange = formatPeriodRange(periodStart, periodEnd);
  const reportTitle = `${businessName} ${period}${periodRange ? ` (${periodRange})` : ""} Performance Report`;
  const reportTemplateContext = React.useMemo<PerformanceReportV2TemplateContext | undefined>(() => {
    if (!reportData) return undefined;
    return {
      businessName,
      period: reportData.period,
      periodStart: reportData.period_start,
      periodEnd: reportData.period_end,
      createdAt: reportData.created_at,
      processedMeta:
        reportData.processed_data && typeof reportData.processed_data === "object"
          ? (reportData.processed_data as Record<string, unknown>).meta as Record<string, unknown> | null
          : null,
      llmOutputs:
        reportData.narrative_text && typeof reportData.narrative_text === "object"
          ? (reportData.narrative_text as Record<string, unknown>).llm_outputs as Record<string, unknown> | null
          : null,
    };
  }, [businessName, reportData]);

  const canonicalize = React.useCallback((value: string) => {
    return (value || "").replace(/\r\n/g, "\n").replace(/\u00A0/g, " ").trimEnd();
  }, []);

  // Sync content from server
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isV2Report && pendingContentRef.current && !isSavingRef.current) {
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
      if (emailSummaryDebounceTimerRef.current) {
        clearTimeout(emailSummaryDebounceTimerRef.current);
      }
    };
  }, [isV2Report]);

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

    if (isV2Report) {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
      return;
    }

    const rawPerformanceReport = reportData?.narrative_text?.performance_report;
    const rawReport = typeof rawPerformanceReport === "string" ? rawPerformanceReport : "";
    setLocalContent(rawReport);
    lastSavedRef.current = rawReport;

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }
  }, [reportData, status, reportEditor, isV2Report]);

  React.useEffect(() => {
    emailSummaryDirtyRef.current = false;
    emailSummarySavedRef.current = emailSummary;
    emailSummaryDraftRef.current = emailSummary;
    setEmailSummaryDraft(emailSummary);
    setIsEmailSummaryFocused(false);
    if (emailSummaryDebounceTimerRef.current) {
      clearTimeout(emailSummaryDebounceTimerRef.current);
      emailSummaryDebounceTimerRef.current = null;
    }
  }, [reportRunId]);

  React.useEffect(() => {
    if (emailSummaryDirtyRef.current || isEmailSummaryFocused) return;
    emailSummarySavedRef.current = emailSummary;
    emailSummaryDraftRef.current = emailSummary;
    setEmailSummaryDraft(emailSummary);
  }, [emailSummary, isEmailSummaryFocused]);

  React.useEffect(() => {
    if (!isV2Report && !isV2EditMode) {
      setIsV2EditMode(false);
    }
  }, [isV2Report, reportRunId, isV2EditMode]);

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

  const handleSaveV2EditedFields = React.useCallback(
    async (editedFields: PerformanceReportV2EditedFields) => {
      await updateMutation.mutateAsync({
        reportRunId,
        edited_field_updates: editedFields,
      });
    },
    [reportRunId, updateMutation]
  );

  const saveEmailSummary = React.useCallback(async (nextValue: string, options?: { showToast?: boolean }) => {
    if (!isV2Report) return;
    const next = nextValue;
    if (next === emailSummarySavedRef.current) {
      emailSummaryDirtyRef.current = false;
      return;
    }

    if (emailSummarySaveInFlightRef.current) {
      pendingEmailSummarySaveRef.current = next;
      return;
    }

    try {
      emailSummarySaveInFlightRef.current = true;
      setIsEmailSummarySaving(true);
      await updateMutation.mutateAsync({
        reportRunId,
        email_summary: next,
      });
      emailSummarySavedRef.current = next;
      emailSummaryDirtyRef.current = emailSummaryDraftRef.current !== next;
      if (options?.showToast) toast.success("Email summary saved");
    } catch {
      toast.error("Failed to save email summary");
    } finally {
      emailSummarySaveInFlightRef.current = false;
      setIsEmailSummarySaving(false);

      const pending = pendingEmailSummarySaveRef.current;
      pendingEmailSummarySaveRef.current = null;
      if (pending !== null && pending !== emailSummarySavedRef.current) {
        await saveEmailSummary(pending);
      }
    }
  }, [isV2Report, reportRunId, updateMutation]);

  const scheduleEmailSummarySave = React.useCallback(() => {
    if (emailSummaryDebounceTimerRef.current) {
      clearTimeout(emailSummaryDebounceTimerRef.current);
    }

    emailSummaryDebounceTimerRef.current = setTimeout(() => {
      emailSummaryDebounceTimerRef.current = null;
      saveEmailSummary(emailSummaryDraftRef.current);
    }, 1500);
  }, [saveEmailSummary]);

  const handleEmailSummaryChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    emailSummaryDraftRef.current = next;
    emailSummaryDirtyRef.current = next !== emailSummarySavedRef.current;
    setEmailSummaryDraft(next);
    scheduleEmailSummarySave();
  }, [scheduleEmailSummarySave]);

  const handleCopyEmailSummary = React.useCallback(async () => {
    const ok = await copyToClipboard(emailSummaryDraft);
    if (ok) toast.success("Email summary copied");
    else toast.error("Copy failed");
  }, [emailSummaryDraft]);

  const handleDiscardAllV2Edits = React.useCallback(async () => {
    try {
      await updateMutation.mutateAsync({
        reportRunId,
        discard_all_edits: true,
      });
      setV2ResetVersion((current) => current + 1);
      setIsV2EditMode(false);
      toast.success("Reverted to original report text");
    } catch {
      toast.error("Failed to discard edited prose");
    }
  }, [reportRunId, updateMutation]);

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
    if (isV2Report && performanceReportV2) {
      const plainText = performanceReportToPlainText(performanceReportV2);
      const ok = await copyToClipboard(plainText);
      if (ok) toast.success("Copied");
      else toast.error("Copy failed");
      return;
    }

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

  const handleDownloadPdf = React.useCallback(
    async (filename: string) => {
      if (parsedReport.kind === "v2") {
        await generatePdfFromPerformanceReportV2(parsedReport.raw, filename, reportTemplateContext);
        return;
      }

      await generatePdfFromMarkdown(performanceReport, filename);
    },
    [parsedReport, performanceReport, reportTemplateContext]
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 bg-white p-8">
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
              {isSuccess && isV2Report && (
                <>
                  <Button
                    variant={isV2EditMode ? "default" : "outline"}
                    size="icon"
                    onClick={() => setIsV2EditMode((current) => !current)}
                    disabled={updateMutation.isPending}
                    title={isV2EditMode ? "Done editing" : "Edit report"}
                    className="h-9 w-9"
                  >
                    {isV2EditMode ? <Check className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
                  </Button>
                  {isV2EditMode && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDiscardAllV2Edits}
                      disabled={updateMutation.isPending || v2EditedFieldsCount === 0}
                      title="Discard changes"
                      className="h-9 w-9"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
                </>
              )}
              {!isV2EditMode && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyReport}
                    disabled={isProcessing || !hasReportContent}
                    title="Copy Report"
                    className="h-9 w-9"
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDownload}
                    disabled={isProcessing || !hasReportContent}
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
                </>
              )}
            </div>
          </div>

          {/* Line Separator */}
          <div className="w-full h-px bg-border" />

          {isSuccess && isV2Report && (
            <Card className="rounded-xl border border-general-border bg-background p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-general-foreground">Email summary</p>
                  <p className="text-xs text-muted-foreground">
                    Separate from the report preview and PDF export.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmailSummary}
                  disabled={!emailSummaryDraft.trim()}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <Textarea
                value={emailSummaryDraft}
                onChange={handleEmailSummaryChange}
                onFocus={() => setIsEmailSummaryFocused(true)}
                onBlur={() => setIsEmailSummaryFocused(false)}
                className="min-h-[120px] resize-y bg-white text-sm"
                placeholder="Email summary will appear here after generation."
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{isEmailSummarySaving ? "Saving changes..." : "Autosaves after you stop typing."}</span>
                <span className={emailSummaryDraft.length > EMAIL_SUMMARY_SOFT_LIMIT ? "text-amber-600" : undefined}>
                  {emailSummaryDraft.length}/{EMAIL_SUMMARY_SOFT_LIMIT}
                </span>
              </div>
            </Card>
          )}

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

            {(isSuccess && isV2Report && performanceReportV2) || isV2EditMode ? (
              <Card className="p-4 space-y-3 border-0 bg-transparent shadow-none">
                <PerformanceReportV2View
                  performanceReport={performanceReportV2Raw}
                  context={reportTemplateContext}
                  isEditing={isV2EditMode}
                  resetVersion={v2ResetVersion}
                  onSaveEditedFields={handleSaveV2EditedFields}
                />
              </Card>
            ) : null}

            {isSuccess && !isV2Report && performanceReport && (
              <Card className="p-4 space-y-3 border-0">
                {isEditorFocused && (
                  <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-2 py-1">
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
                  className="prose prose-sm max-w-none rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-3"
                  editorClassName="min-h-80 border-0 bg-transparent px-2 py-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                  isEditable={true}
                  onEditorReady={setReportEditor}
                  onSave={handleSaveReport}
                  onChange={handleContentChange}
                  onFocus={() => setIsEditorFocused(true)}
                  onBlur={() => setIsEditorFocused(false)}
                />
              </Card>
            )}

            {isSuccess && !hasReportContent && (
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
        onDownloadPdf={handleDownloadPdf}
        allowMarkdownDownload={!isV2Report}
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
