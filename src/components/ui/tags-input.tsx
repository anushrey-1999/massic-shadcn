"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type TagsInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function splitToTokens(raw: string): string[] {
  return raw
    .split(/[,\n]/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

function dedupeCaseInsensitive(tokens: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function TagsInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
  disabled = false,
  className,
}: TagsInputProps) {
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const normalizedValue = React.useMemo(() => {
    return dedupeCaseInsensitive(
      (Array.isArray(value) ? value : [])
        .map((t) => String(t).trim())
        .filter(Boolean)
    );
  }, [value]);

  const commit = React.useCallback(
    (raw: string) => {
      const tokens = splitToTokens(raw);
      if (tokens.length === 0) return;
      const next = dedupeCaseInsensitive([...normalizedValue, ...tokens]);
      onChange(next);
    },
    [normalizedValue, onChange]
  );

  const removeAt = React.useCallback(
    (idx: number) => {
      const next = normalizedValue.filter((_, i) => i !== idx);
      onChange(next);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [normalizedValue, onChange]
  );

  return (
    <div
      className={cn(
        "flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-white px-3 py-2 shadow-xs",
        "transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={() => {
        if (disabled) return;
        inputRef.current?.focus();
      }}
    >
      {normalizedValue.map((t, idx) => (
        <Badge
          key={`${t.toLowerCase()}-${idx}`}
          variant="outline"
          className="gap-1 rounded-full px-2 py-1 text-xs"
        >
          <span className="max-w-[240px] truncate">{t}</span>
          <button
            type="button"
            className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-general-muted-foreground hover:text-foreground disabled:pointer-events-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (disabled) return;
              removeAt(idx);
            }}
            disabled={disabled}
            aria-label={`Remove ${t}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </Badge>
      ))}

      <input
        ref={inputRef}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === "Tab") {
            if (!draft.trim()) return;
            e.preventDefault();
            commit(draft);
            setDraft("");
            return;
          }
          if (e.key === "," && draft.trim()) {
            e.preventDefault();
            commit(draft);
            setDraft("");
            return;
          }
          if (e.key === "Backspace" && !draft) {
            if (normalizedValue.length === 0) return;
            e.preventDefault();
            removeAt(normalizedValue.length - 1);
          }
        }}
        onBlur={() => {
          if (disabled) return;
          if (!draft.trim()) return;
          commit(draft);
          setDraft("");
        }}
        onPaste={(e) => {
          if (disabled) return;
          const text = e.clipboardData?.getData("text");
          if (!text) return;
          e.preventDefault();
          commit(text);
          setDraft("");
        }}
        placeholder={normalizedValue.length === 0 ? placeholder : undefined}
        className={cn(
          "min-w-[120px] flex-1 bg-transparent text-sm text-foreground outline-none",
          "placeholder:text-general-muted-foreground placeholder:text-xs",
          disabled && "cursor-not-allowed"
        )}
      />
    </div>
  );
}

