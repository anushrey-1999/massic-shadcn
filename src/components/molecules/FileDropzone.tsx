"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  /** Allowed extensions without the dot, e.g. ["pdf", "docx"]. */
  accept: readonly string[];
  maxBytes: number;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
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
  title = "Drop files here or click to browse",
  hint,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const types = accept.map((extension) => extension.toUpperCase()).join(", ");

  const take = (list: FileList | null) => {
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
    if (!disabled) take(event.dataTransfer.files);
  };

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        aria-describedby={errors.length ? errorId : undefined}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-general-border-three px-4 py-6 text-center transition-colors outline-none",
          "hover:bg-general-primary-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
          dragging && "border-general-foreground bg-general-primary-foreground",
          disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
        )}
      >
        <Upload className="size-4 text-general-muted-foreground" aria-hidden />
        <span className="text-sm font-medium text-general-foreground">{title}</span>
        <span className="text-xs text-general-muted-foreground">
          {hint ?? `${types} up to ${formatMegabytes(maxBytes)}`}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        hidden
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
