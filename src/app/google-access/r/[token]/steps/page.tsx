"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import { useAccessRequestSteps } from "@/hooks/use-access-request-flow";
import { StepCard } from "@/components/organisms/access-request/StepCard";
import { ProductStep } from "@/components/organisms/access-request/ProductStep";
import { GscManualStep } from "@/components/organisms/access-request/GscManualStep";
import { AccessRequestComplete } from "@/components/organisms/access-request/AccessRequestComplete";
import type { AccessRequestStep } from "@/types/access-request";

export default function AccessRequestStepsPage() {
  const params = useParams();
  const token = params.token as string;
  const { data, isLoading, isError, error, refetch } = useAccessRequestSteps(token);

  // Track the active step by its stable `id` rather than by numeric index,
  // so that a refetch that returns steps in a slightly different order (or
  // any future reordering) doesn't yank the user off the step they're on.
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const steps = data?.steps || [];
  const request = data?.request;

  const activeStepIndex = useMemo(() => {
    if (!activeStepId) return -1;
    return steps.findIndex((s) => s.id === activeStepId);
  }, [steps, activeStepId]);

  const allTerminal = useMemo(
    () =>
      steps.length > 0 &&
      steps.every(
        (s) =>
          s.status === "completed" ||
          s.status === "failed" ||
          s.status === "manual_required"
      ),
    [steps]
  );

  const allCompleted = useMemo(
    () => steps.length > 0 && steps.every((s) => s.status === "completed"),
    [steps]
  );

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || steps.length === 0) return;
    hasInitialized.current = true;
    const firstIncomplete = steps.find(
      (s) => s.status !== "completed" && s.status !== "failed"
    );
    setActiveStepId(firstIncomplete?.id ?? steps[0].id);
  }, [steps]);

  // If the pinned active step id disappears (shouldn't happen, but be safe),
  // fall back to the first step so the UI never lands on "no active step".
  useEffect(() => {
    if (steps.length === 0) return;
    if (!activeStepId) return;
    const stillExists = steps.some((s) => s.id === activeStepId);
    if (!stillExists) {
      setActiveStepId(steps[0].id);
    }
  }, [steps, activeStepId]);

  // Refetch after an execute/verify action, but KEEP the user on the
  // currently-active step. Previously we auto-jumped to the next incomplete
  // step on both success and failure, which felt jarring (especially on
  // failure, where it hid the error UI from the user).
  function handleStepCompleted() {
    refetch();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-general-primary" />
      </div>
    );
  }

  if (isError) {
    const is410 = (error as any)?.response?.status === 410;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              {is410 ? (
                <Clock className="h-6 w-6 text-red-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {is410 ? "Link Expired" : "Something Went Wrong"}
            </h2>
            <p className="text-sm text-gray-500">
              {is410
                ? "This access request has expired."
                : "Unable to load access request steps. Please try again."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (allCompleted || (allTerminal && !steps.some((s) => s.status === "manual_required" && activeStepIndex === steps.indexOf(s)))) {
    const showComplete =
      allCompleted ||
      steps.every((s) => s.status === "completed" || s.status === "failed");

    if (showComplete) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <Card className="w-full max-w-lg shadow-lg border-0">
            <CardContent className="pt-8 pb-8">
              <AccessRequestComplete steps={steps} />
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  const activeStep = steps[activeStepIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Grant Access</h1>
          {request && (
            <p className="text-sm text-gray-500 mt-1">
              Complete each step below to grant access to{" "}
              <span className="font-mono font-medium">{request.agencyEmail}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Steps overview */}
          <div className="lg:w-72 shrink-0">
            <div className="sticky top-8 space-y-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-1">
                Steps ({steps.filter((s) => s.status === "completed").length}/{steps.length})
              </h3>
              {steps.map((step) => (
                <StepCard
                  key={step.id}
                  step={step}
                  isActive={step.id === activeStepId}
                  onClick={() => setActiveStepId(step.id)}
                />
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <Card className="shadow-sm border-0">
              <CardContent className="p-6">
                {activeStep ? (
                  activeStep.product === "gsc" ? (
                    <GscManualStep
                      token={token}
                      step={activeStep}
                      agencyEmail={request?.agencyEmail || ""}
                      onStepCompleted={handleStepCompleted}
                    />
                  ) : (
                    <ProductStep
                      token={token}
                      step={activeStep}
                      onStepCompleted={handleStepCompleted}
                    />
                  )
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500">
                      Select a step from the sidebar to continue.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
