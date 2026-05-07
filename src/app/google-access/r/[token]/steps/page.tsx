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

export default function AccessRequestStepsPage() {
  const params = useParams();
  const token = params.token as string;
  const { data, isLoading, isError, error, refetch } = useAccessRequestSteps(token);

  const steps = data?.steps || [];
  const request = data?.request;
  const agencyEmail = request?.agencyEmail || "";
  const agencyName = request?.agencyName || agencyEmail || "The agency";
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const activeStep = useMemo(
    () => steps.find((s) => s.id === activeStepId),
    [steps, activeStepId]
  );

  const allTerminal = useMemo(
    () =>
      steps.length > 0 &&
      steps.every(
        (s) =>
          s.status === "completed" ||
          s.status === "failed"
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

  useEffect(() => {
    if (steps.length === 0 || !activeStepId) return;
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

  if (allCompleted || allTerminal) {
    const showComplete =
      allCompleted ||
      steps.every((s) => s.status === "completed" || s.status === "failed");

    if (showComplete) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <Card className="w-full max-w-lg shadow-lg border-0">
            <CardContent className="pt-8 pb-8">
              <AccessRequestComplete steps={steps} agencyEmail={agencyEmail} />
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {agencyName} is requesting access to your Google Assets
          </h1>
          {request && (
            <p className="text-sm text-gray-500 mt-1">
              To grant access to{" "}
              <span className="font-mono font-medium">{agencyEmail}</span>{" "}
              please follow these steps
            </p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-72 shrink-0">
            <div className="sticky top-8 space-y-2">
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

          <div className="flex-1 min-w-0">
            <Card className="shadow-sm border-0">
              <CardContent className="p-6">
                {activeStep?.product === "gsc" ? (
                  <GscManualStep
                    token={token}
                    step={activeStep}
                    agencyEmail={agencyEmail}
                    agencyName={agencyName}
                    onStepCompleted={handleStepCompleted}
                  />
                ) : activeStep ? (
                  <ProductStep
                    token={token}
                    step={activeStep}
                    onStepCompleted={handleStepCompleted}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500">
                      No access request steps are available.
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
