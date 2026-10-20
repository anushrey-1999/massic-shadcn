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
        "flex min-w-0 items-start gap-2 rounded-lg border border-general-border bg-general-primary-foreground p-3",
        className
      )}
    >
      <pre className="m-0 min-w-0 flex-1 whitespace-pre-wrap py-1 font-mono text-xs leading-5 text-general-foreground [overflow-wrap:anywhere]">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : copyLabel}
        title={copied ? "Copied" : copyLabel}
      >
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      </Button>
      <span className="sr-only" role="status">{copied ? "Code copied to clipboard" : ""}</span>
    </div>
  );
}
