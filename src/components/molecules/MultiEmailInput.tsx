"use client";

import * as React from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";
import { cn } from "@/lib/utils";

const emailSchema = z.string().email();

interface MultiEmailInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MultiEmailInput({
  value,
  onChange,
  disabled = false,
  placeholder = "name@email.com, name2@email.com",
  className,
}: MultiEmailInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  function addEmails(rawValue: string) {
    const candidates = rawValue
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (candidates.length === 0) return;

    const next = [...value];
    for (const email of candidates) {
      const isValid = emailSchema.safeParse(email).success;
      if (!isValid) {
        toast.error(`Invalid email: ${email}`);
        continue;
      }

      if (next.includes(email)) {
        toast.error(`${email} is already added`);
        continue;
      }

      next.push(email);
    }

    onChange(next);
    setInputValue("");
  }

  function removeEmail(emailToRemove: string) {
    onChange(value.filter((email) => email !== emailToRemove));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === " ") {
      event.preventDefault();
      addEmails(inputValue);
      return;
    }

    if (event.key === "Backspace" && !inputValue && value.length > 0) {
      removeEmail(value[value.length - 1]);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pastedText = event.clipboardData.getData("text");
    if (!/[\s,;]/.test(pastedText)) return;

    event.preventDefault();
    addEmails(pastedText);
  }

  return (
    <div
      className={cn(
        "flex min-h-10 w-full cursor-text flex-wrap items-center gap-2 rounded-md border border-general-border bg-white px-3 py-2",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((email) => (
        <span
          key={email}
          className="inline-flex max-w-full items-center gap-1 rounded-md border border-general-border bg-gray-50 px-2 py-1 text-xs text-general-foreground"
        >
          <span className="truncate">{email}</span>
          <button
            type="button"
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-gray-200"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              removeEmail(email);
            }}
            aria-label={`Remove ${email}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : ""}
        className="h-6 min-w-[150px] flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-general-muted-foreground disabled:cursor-not-allowed"
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => addEmails(inputValue)}
      />
    </div>
  );
}
