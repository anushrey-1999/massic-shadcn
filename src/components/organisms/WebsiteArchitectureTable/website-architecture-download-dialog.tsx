"use client";

import * as React from "react";
import { Download, FileBraces, FileSpreadsheet, Loader2 } from "lucide-react";
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

type DownloadFormat = "csv" | "json";

interface WebsiteArchitectureDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFilename: string;
  onDownload: (format: DownloadFormat, filename: string) => Promise<void>;
}

const formats: Array<{
  value: DownloadFormat;
  label: string;
  icon: typeof FileSpreadsheet;
  iconClassName: string;
}> = [
  { value: "json", label: "JSON File", icon: FileBraces, iconClassName: "text-blue-500" },
  { value: "csv", label: "CSV File", icon: FileSpreadsheet, iconClassName: "text-emerald-600" },
];

export function WebsiteArchitectureDownloadDialog({
  isOpen,
  onClose,
  defaultFilename,
  onDownload,
}: WebsiteArchitectureDownloadDialogProps) {
  const [format, setFormat] = React.useState<DownloadFormat>("json");
  const [filename, setFilename] = React.useState(defaultFilename);
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setFilename(defaultFilename);
      setFormat("json");
      setIsGenerating(false);
    }
  }, [isOpen, defaultFilename]);

  const handleDownload = async () => {
    const baseName = filename.trim().replace(/\.(csv|json)$/i, "");
    if (!baseName) {
      toast.error("Please enter a filename");
      return;
    }

    setIsGenerating(true);
    try {
      await onDownload(format, `${baseName}.${format}`);
      toast.success("Download started");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate download");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isGenerating && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download website architecture</DialogTitle>
          <DialogDescription>
            Choose a format and filename. JSON includes the pages, URLs, and navigation returned for this run.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-3">
            <Label>Format</Label>
            <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Download format">
              {formats.map((option) => {
                const Icon = option.icon;
                const selected = format === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={isGenerating}
                    onClick={() => setFormat(option.value)}
                    className={cn(
                      "cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors",
                      selected ? "border-primary bg-primary/5" : "border-muted bg-transparent",
                    )}
                  >
                    <Icon className={cn("h-8 w-8", option.iconClassName)} />
                    <span className="font-medium text-sm">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="website-architecture-filename">Filename</Label>
            <div className="flex items-center gap-2">
              <Input
                id="website-architecture-filename"
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
                placeholder="website-architecture"
                className="flex-1"
                disabled={isGenerating}
              />
              <span className="w-12 text-right text-sm text-muted-foreground">.{format}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={() => void handleDownload()} disabled={isGenerating} className="gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isGenerating ? "Generating..." : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
