"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";

interface CodeSnippetProps {
  code: string;
  className?: string;
  copyLabel?: string;
}

const COPIED_RESET_MS = 2000;

export function CodeSnippet({ code, className, copyLabel = "Copy code" }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const handleCopy = async () => {
    if (!(await copyToClipboard(code))) {
      toast.error("Couldn't copy", { description: "Select the code and copy it manually." });
      return;
    }
    setCopied(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-general-border bg-general-secondary p-3",
        className
      )}
    >
      <pre className="min-w-0 flex-1 overflow-x-auto py-1.5 font-mono text-xs leading-5 text-general-foreground">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 bg-white"
        onClick={handleCopy}
        aria-live="polite"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : copyLabel}
      </Button>
    </div>
  );
}
