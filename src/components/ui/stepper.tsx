"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface StepperStep {
  id: string;
  label: string;
}

interface StepperProps {
  steps: ReadonlyArray<StepperStep>;
  currentStep: number;
  onStepClick?: (index: number) => void;
  isStepEnabled?: (index: number) => boolean;
  className?: string;
}

function StepNode({
  step,
  index,
  isActive,
  isCompleted,
  isClickable,
  onStepClick,
}: {
  step: StepperStep;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isClickable: boolean;
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => onStepClick?.(index)}
        disabled={!isClickable}
        className={cn(
          "flex items-center justify-center size-6 rounded-full text-xs font-medium text-white transition-colors shrink-0",
          isCompleted && "bg-general-primary",
          isActive && "bg-general-primary",
          !isActive && !isCompleted && "bg-general-muted-foreground",
          isClickable && "cursor-pointer hover:opacity-90",
          !isClickable && "cursor-default opacity-60"
        )}
        aria-current={isActive ? "step" : undefined}
        aria-label={`${step.label}${isCompleted ? ", completed" : ""}`}
      >
        {isCompleted ? (
          <Check className="size-3 shrink-0" aria-hidden />
        ) : (
          index + 1
        )}
      </button>
      <span
        className={cn(
          "text-sm font-medium leading-normal truncate",
          isActive ? "text-general-foreground" : "text-general-muted-foreground"
        )}
      >
        {step.label}
      </span>
    </div>
  );
}

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  isStepEnabled,
  className,
}: StepperProps) {
  const isClickable = typeof onStepClick === "function";
  return (
    <nav
      className={cn("flex items-center w-full min-w-0", className)}
      aria-label="Progress"
    >
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isLast = index === steps.length - 1;
        const stepEnabled = isStepEnabled ? isStepEnabled(index) : true;
        const stepClickable = isClickable && stepEnabled;

        return (
          <React.Fragment key={step.id}>
            <StepNode
              step={step}
              index={index}
              isActive={isActive}
              isCompleted={isCompleted}
              isClickable={stepClickable}
              onStepClick={onStepClick}
            />
            {!isLast && (
              <div
                className="flex-1 min-h-0 min-w-[24px] h-0.5 mx-3 bg-general-border-three"
                aria-hidden
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
