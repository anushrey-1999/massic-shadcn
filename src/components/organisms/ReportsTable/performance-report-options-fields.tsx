"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  PerformanceReportPerspective,
  PerformanceReportScope,
} from "@/types/performance-report-options-types";

interface PerformanceReportOptionsFieldsProps {
  scope: PerformanceReportScope;
  onScopeChange: (value: PerformanceReportScope) => void;
  perspective: PerformanceReportPerspective;
  onPerspectiveChange: (value: PerformanceReportPerspective) => void;
  customInstructions: string;
  onCustomInstructionsChange: (value: string) => void;
  disabled?: boolean;
  idPrefix: string;
  className?: string;
}

const labelClassName =
  "text-[14px] font-medium leading-[1.5] tracking-[0.07px] text-general-foreground";
const triggerClassName =
  "h-10 min-h-9 w-full rounded-lg border-0 bg-white py-[7.5px] pl-3 pr-2 text-[12px] font-normal leading-[1.5] tracking-[0.18px] text-general-muted-foreground shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]";

export function PerformanceReportOptionsFields({
  scope,
  onScopeChange,
  perspective,
  onPerspectiveChange,
  customInstructions,
  onCustomInstructionsChange,
  disabled = false,
  idPrefix,
  className,
}: PerformanceReportOptionsFieldsProps) {
  const scopeId = `${idPrefix}-scope`;
  const perspectiveId = `${idPrefix}-perspective`;
  const instructionsId = `${idPrefix}-custom-instructions`;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={scopeId} className={labelClassName}>
            Scope
          </label>
          <Select
            value={scope}
            onValueChange={(value) => onScopeChange(value as PerformanceReportScope)}
            disabled={disabled}
          >
            <SelectTrigger id={scopeId} className={triggerClassName} variant="noBorder">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="organic">Organic</SelectItem>
              <SelectItem value="all_channels">All channels</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={perspectiveId} className={labelClassName}>
            Perspective
          </label>
          <Select
            value={perspective}
            onValueChange={(value) =>
              onPerspectiveChange(value as PerformanceReportPerspective)
            }
            disabled={disabled}
          >
            <SelectTrigger
              id={perspectiveId}
              className={triggerClassName}
              variant="noBorder"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wins">Wins</SelectItem>
              <SelectItem value="full_picture">Full picture</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={instructionsId} className={labelClassName}>
          Custom Instructions
        </label>
        <Textarea
          id={instructionsId}
          value={customInstructions}
          onChange={(event) => onCustomInstructionsChange(event.target.value)}
          disabled={disabled}
          placeholder="Optional: Add specific instructions for this report."
          className="min-h-[96px] resize-y border-general-border bg-white text-[12px] leading-[1.5] tracking-[0.18px] text-general-foreground"
        />
      </div>
    </div>
  );
}
