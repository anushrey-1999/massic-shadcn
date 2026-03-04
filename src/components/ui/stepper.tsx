"use client";

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
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  className,
}: StepperProps) {
  return (
    <nav
      className={cn("flex items-center w-full min-w-0", className)}
      aria-label="Progress"
    >
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isClickable = typeof onStepClick === "function";

        return (
          <div key={step.id} className="flex flex-1 items-center min-w-0 basis-0">
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <button
                type="button"
                onClick={() => onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center justify-center size-9 rounded-full text-sm font-medium text-white transition-colors shrink-0",
                  isCompleted && "bg-general-primary",
                  isActive && "bg-general-primary",
                  !isActive &&
                    !isCompleted &&
                    "bg-general-muted-foreground",
                  isClickable && "cursor-pointer hover:opacity-90",
                  !isClickable && "cursor-default"
                )}
                aria-current={isActive ? "step" : undefined}
                aria-label={`${step.label}${isCompleted ? ", completed" : ""}`}
              >
                {isCompleted ? (
                  <Check className="size-4 shrink-0" aria-hidden />
                ) : (
                  index + 1
                )}
              </button>
              <span
                className={cn(
                  "text-sm font-medium leading-normal truncate",
                  isActive
                    ? "text-general-foreground"
                    : "text-general-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 min-w-[24px] bg-general-border-three"
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
