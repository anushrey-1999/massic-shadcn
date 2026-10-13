"use client";

import type { ReactNode } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";

type Choice<T extends string> = { value: T; label: string };

interface ChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  options: readonly Choice<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** Segmented control styled like the app's tab bar; arrow keys move between options. */
export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: ChoiceGroupProps<T>) {
  return (
    <RadioGroupPrimitive.Root
      aria-label={label}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      disabled={disabled}
      orientation="horizontal"
      className="inline-flex h-9 items-center gap-1 rounded-lg bg-general-secondary p-1"
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            "h-7 rounded-md px-2.5 text-sm text-general-muted-foreground transition-colors outline-none",
            "hover:text-general-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
            "data-[state=checked]:bg-white data-[state=checked]:font-medium data-[state=checked]:text-general-foreground data-[state=checked]:shadow-xs",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

interface FieldRowProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

export function FieldRow({ label, htmlFor, hint, error, children }: FieldRowProps) {
  const LabelTag = htmlFor ? "label" : "p";
  return (
    <div className="space-y-1.5">
      <LabelTag htmlFor={htmlFor} className="block text-sm font-medium text-general-foreground">
        {label}
      </LabelTag>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-general-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/** First message from a TanStack Form field's error list (zod issues or strings). */
export function fieldError(errors: readonly unknown[]): string | undefined {
  const first = errors[0];
  if (!first) return undefined;
  if (typeof first === "string") return first;
  return (first as { message?: string }).message;
}
