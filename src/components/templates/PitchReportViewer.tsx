"use client";

import React from "react";
import {
  ArrowLeft,
  Copy,
  Download,
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
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";
import { DownloadReportDialog } from "@/components/organisms/ReportDetail/download-report-dialog";
import { ContentConverter } from "@/utils/content-converter";

interface PitchReportViewerProps {
  content: string;
  reportTitle: string;
  isEditable?: boolean;
  isGenerating?: boolean;
  showStatus?: boolean;
  statusText?: string;
  showWorkflowMessage?: boolean;
  workflowStatus?: string;
  onBack: () => void;
}

export function PitchReportViewer({
  content,
  reportTitle,
  isEditable = true,
  isGenerating = false,
  showStatus = false,
  statusText,
  showWorkflowMessage = false,
  workflowStatus,
  onBack,
}: PitchReportViewerProps) {
  const [reportEditor, setReportEditor] = React.useState<Editor | null>(null);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);

  const handleCopyReport = React.useCallback(async () => {
    if (!reportEditor) {
      toast.error("Nothing to copy yet");
      return;
    }

    const htmlContent = reportEditor.getHTML();
    if (!htmlContent || !htmlContent.trim()) {
      toast.error("Nothing to copy yet");
      return;
    }

    try {
      if (typeof ClipboardItem !== "undefined") {
        const clipboardItem = new ClipboardItem({
          "text/html": new Blob([htmlContent], { type: "text/html" }),
          "text/plain": new Blob([reportEditor.getText()], {
            type: "text/plain",
          }),
        });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        await navigator.clipboard.writeText(reportEditor.getText());
      }
      toast.success("Copied");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy");
    }
  }, [reportEditor]);

  const markdownForDownload = React.useMemo(() => {
    if (isGenerating) return "";

    const editorText = reportEditor?.getText?.() ? String(reportEditor.getText()).trim() : "";
    if (editorText && editorText.toLowerCase() !== "generating...") {
      const html = reportEditor?.getHTML() || "";
      return ContentConverter.prepareForApi(html);
    }

    const fallback = String(content || "").trim();
    if (!fallback || fallback.toLowerCase() === "generating...") return "";
    return ContentConverter.prepareForApi(fallback);
  }, [isGenerating, reportEditor, content]);

  const handleDownload = React.useCallback(() => {
    if (!markdownForDownload || !String(markdownForDownload).trim()) {
      toast.error("Nothing to download yet");
      return;
    }
    setIsDownloadDialogOpen(true);
  }, [markdownForDownload]);

  return (
    <div className="h-full bg-white rounded-lg p-6 flex flex-col gap-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={onBack}
          disabled={isGenerating}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleCopyReport}
            disabled={isGenerating}
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button
            className="gap-2"
            onClick={handleDownload}
            disabled={isGenerating || !markdownForDownload.trim()}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border pb-3">
        <Typography variant="muted">Report Summary</Typography>
        {showStatus && statusText ? (
          <Typography variant="muted" className="text-xs">
            {statusText}
          </Typography>
        ) : null}
      </div>

      {showWorkflowMessage && (
        <div className={`border rounded-lg p-4 mb-4 ${
          workflowStatus === "error"
            ? "bg-red-50 border-red-200"
            : "bg-blue-50 border-blue-200"
        }`}>
          <Typography variant="p" className={`text-sm ${
            workflowStatus === "error"
              ? "text-red-900"
              : "text-blue-900"
          }`}>
            {workflowStatus === "error"
              ? "Error: Unable to prepare your report. Please try again."
              : workflowStatus === "processing" || workflowStatus === "pending"
                ? "Your report is being prepared. Please come back shortly to view it."
                : "Preparing your report..."}
          </Typography>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full">
          <Typography variant="h3" className="mb-4">
            {reportTitle}
          </Typography>

          <div className="flex w-full items-center gap-2 border rounded-md px-2 py-1 mb-3">
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
                disabled={!reportEditor || isGenerating}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>

          <InlineTipTapEditor
            content={content || (isGenerating ? "Generating..." : "")}
            isEditable={isEditable && !isGenerating}
            onEditorReady={setReportEditor}
            placeholder="Write your report here..."
          />
        </div>
      </div>

      <DownloadReportDialog
        isOpen={isDownloadDialogOpen}
        onClose={() => setIsDownloadDialogOpen(false)}
        markdownContent={markdownForDownload}
        defaultFilename={reportTitle}
      />
    </div>
  );
}
