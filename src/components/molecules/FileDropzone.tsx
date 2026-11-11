"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  /** Allowed extensions without the dot, e.g. ["pdf", "docx"]. */
  accept: readonly string[];
  maxBytes: number;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  title?: string;
  hint?: string;
  className?: string;
}

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Returns why `file` can't be accepted, or null when it can. */
export function fileProblem(file: File, accept: readonly string[], maxBytes: number): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!accept.includes(extension)) {
    return `${file.name}: use ${accept.map((item) => item.toUpperCase()).join(", ")}.`;
  }
  if (file.size === 0) return `${file.name}: this file is empty.`;
  if (file.size > maxBytes) return `${file.name}: files must be ${formatMegabytes(maxBytes)} or smaller.`;
  return null;
}

/** Click-or-drop file picker that rejects wrong types, empty files and oversize files inline. */
export function FileDropzone({
  accept,
  maxBytes,
  onFiles,
  multiple = true,
  disabled = false,
  busy = false,
  title = "Upload files",
  hint,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const hintId = useId();
  const errorId = useId();
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const types = accept.map((extension) => extension.toUpperCase()).join(", ");
  const unavailable = disabled || busy;
  const limits = `${types} up to ${formatMegabytes(maxBytes)}.`;

  const take = (list: FileList | null) => {
    if (unavailable) return;
    const files = Array.from(list ?? []).slice(0, multiple ? undefined : 1);
    const problems: string[] = [];
    const valid = files.filter((file) => {
      const problem = fileProblem(file, accept, maxBytes);
      if (problem) problems.push(problem);
      return !problem;
    });
    setErrors(problems);
    if (valid.length) onFiles(valid);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    take(event.dataTransfer.files);
  };

  return (
    <div className={className}>
      <button
        type="button"
        disabled={unavailable}
        aria-busy={busy}
        aria-labelledby={labelId}
        aria-describedby={errors.length ? `${hintId} ${errorId}` : hintId}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!unavailable) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-md border border-dashed border-general-border bg-background p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dragging && !unavailable && "border-general-primary bg-general-primary/5",
          unavailable ? "cursor-not-allowed opacity-60" : "hover:border-general-primary/50 hover:bg-general-primary-foreground"
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-general-border bg-general-secondary text-muted-foreground">
          {busy
            ? <Loader2 className="size-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
            : <Upload className="size-4" strokeWidth={1.5} aria-hidden="true" />}
        </span>
        <span className="min-w-0">
          <span id={labelId} className="block text-sm font-medium text-general-foreground">{title}</span>
          <span id={hintId} className="block text-xs text-muted-foreground">
            {hint ?? (unavailable ? limits : `${limits} Click or drag and drop.`)}
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        hidden
        disabled={unavailable}
        multiple={multiple}
        accept={accept.map((extension) => `.${extension}`).join(",")}
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
      {errors.length > 0 && (
        <ul id={errorId} aria-live="polite" className="mt-2 space-y-0.5">
          {errors.map((error) => (
            <li key={error} className="text-xs text-destructive">
              {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
