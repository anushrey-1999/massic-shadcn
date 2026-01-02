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

  const handleDownloadPdf = React.useCallback(() => {
    window.print();
  }, []);

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
            onClick={handleDownloadPdf}
            disabled={isGenerating}
          >
            <Download className="h-4 w-4" />
            Download as PDF
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
              ? "Workflow Error: Unable to prepare your detailed report. Please try again."
              : workflowStatus === "processing" || workflowStatus === "pending"
                ? "Your workflow is being prepared. Please come back shortly to view your detailed report."
                : "Preparing your detailed report..."}
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
    </div>
  );
}
