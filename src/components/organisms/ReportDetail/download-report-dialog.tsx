"use client";

import * as React from "react";
import { Download, FileText, Loader2, FileType } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { generatePdfFromMarkdown } from "@/utils/pdf-generator";
import { downloadMarkdown } from "@/utils/markdown-generator";

interface DownloadReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
  defaultFilename: string;
}

type DownloadFormat = "pdf" | "md";

export function DownloadReportDialog({
  isOpen,
  onClose,
  markdownContent,
  defaultFilename,
}: DownloadReportDialogProps) {
  const [format, setFormat] = React.useState<DownloadFormat>("pdf");
  const [filename, setFilename] = React.useState(defaultFilename);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setFilename(defaultFilename);
      setFormat("pdf");
      setIsGenerating(false);
    }
  }, [isOpen, defaultFilename]);

  const handleDownload = async () => {
    if (!filename.trim()) {
      toast.error("Please enter a filename");
      return;
    }

    const finalFilename = filename.trim();
    setIsGenerating(true);

    try {
      if (format === "pdf") {
        const pdfFilename = finalFilename.endsWith(".pdf")
          ? finalFilename
          : `${finalFilename}.pdf`;
        await generatePdfFromMarkdown(markdownContent, pdfFilename);
      } else {
        const mdFilename = finalFilename.endsWith(".md")
          ? finalFilename
          : `${finalFilename}.md`;
        downloadMarkdown(markdownContent, mdFilename);
      }

      toast.success("Download started");
      onClose();
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate download");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isGenerating && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Report</DialogTitle>
          <DialogDescription>
            Choose a format and customize the filename for your report.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-3">
            <Label>Format</Label>
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setFormat("pdf")}
                className={cn(
                  "cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors",
                  format === "pdf"
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-transparent"
                )}
              >
                <FileType className="h-8 w-8 text-red-500" />
                <span className="font-medium text-sm">PDF Document</span>
              </div>
              <div
                onClick={() => setFormat("md")}
                className={cn(
                  "cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors",
                  format === "md"
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-transparent"
                )}
              >
                <FileText className="h-8 w-8 text-blue-500" />
                <span className="font-medium text-sm">Markdown File</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="filename">Filename</Label>
            <div className="flex items-center gap-2">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="report-name"
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12 text-right">
                .{format}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
