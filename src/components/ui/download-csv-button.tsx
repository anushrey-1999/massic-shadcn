"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadCsvButtonProps {
  onDownload: () => void | Promise<void>;
  disabled?: boolean;
}

export function DownloadCsvButton({
  onDownload,
  disabled = false,
}: DownloadCsvButtonProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleClick = async () => {
    setIsDownloading(true);
    try {
      await onDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  const Icon = isDownloading ? Loader2 : Download;

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={disabled || isDownloading}
      aria-label="Download CSV"
      title="Download CSV"
      className="h-9 min-w-9 shrink-0 p-0"
    >
      <Icon className={`size-4 text-muted-foreground ${isDownloading ? "animate-spin" : ""}`} />
    </Button>
  );
}
