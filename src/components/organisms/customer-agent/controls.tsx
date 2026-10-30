"use client";

import type { ReactElement, ReactNode } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HintProps {
  label?: ReactNode;
  /** Disabled controls ignore pointer events, so the tooltip hangs off a focusable wrapper instead. */
  disabled?: boolean;
  className?: string;
  children: ReactElement;
}

/** Hover and focus tooltip for a single control. Without a label it renders the control unchanged. */
export function Hint({ label, disabled = false, className, children }: HintProps) {
  if (!label) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {disabled ? (
          <span
            tabIndex={0}
            className={cn("inline-flex cursor-not-allowed rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50", className)}
          >
            {children}
          </span>
        ) : (
          children
        )}
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}

type Choice<T extends string> = {
  value: T;
  label: ReactNode;
  ariaLabel?: string;
};

/** Secondary button look from the style guide: white fill, #D4D4D4 border and shadow-xs, so it reads on white cards. */
export const SECONDARY_BUTTON_CLASS = "border-general-border-three bg-white shadow-xs";

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
      className="inline-flex h-9 items-center gap-0.5 rounded-lg bg-general-border p-1"
    >
      {options.map((option) => (
        <Hint key={option.value} label={typeof option.label === "string" ? undefined : option.ariaLabel}>
          <RadioGroupPrimitive.Item
            value={option.value}
            aria-label={option.ariaLabel}
            className={cn(
              "h-7 cursor-pointer rounded-md px-3 text-sm text-general-muted-foreground transition-colors outline-none",
              "hover:text-general-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
              // aria-checked, not data-state: a tooltip trigger on the item overwrites data-state.
              "aria-checked:bg-white aria-checked:font-medium aria-checked:text-general-foreground aria-checked:shadow-xs",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {option.label}
          </RadioGroupPrimitive.Item>
        </Hint>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

interface RadioOptionsProps<T extends string> {
  label: string;
  value: T;
  options: readonly Choice<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function RadioOptions<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: RadioOptionsProps<T>) {
  return (
    <RadioGroupPrimitive.Root
      aria-label={label}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      disabled={disabled}
      className="flex flex-wrap items-center gap-x-5 gap-y-2"
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          aria-label={option.ariaLabel}
          className="group inline-flex cursor-pointer items-center gap-2 text-sm text-general-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="grid size-4 place-items-center rounded-full border border-general-border-three bg-white group-focus-visible:ring-2 group-focus-visible:ring-ring/50">
            <RadioGroupPrimitive.Indicator>
              <span className="block size-2 rounded-full bg-general-foreground" />
            </RadioGroupPrimitive.Indicator>
          </span>
          <span>{option.label}</span>
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
