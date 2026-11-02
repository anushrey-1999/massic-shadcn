"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useUnsavedChangesContext } from "@/components/providers/unsaved-changes-provider";
import { Button } from "@/components/ui/button";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { Stepper } from "@/components/ui/stepper";
import { type useCustomerAgent, usePlaybook, useVisitorAgentInstall } from "@/hooks/use-customer-agent";
import { ONBOARDING_STEPS, type CustomerAgentConfig, type OnboardingStep } from "@/types/customer-agent";
import { AppearanceTab } from "../AppearanceTab";
import { Hint } from "../controls";
import { KnowledgeTab } from "../KnowledgeTab";
import { InstallStep } from "./InstallStep";
import { IntroStep } from "./IntroStep";
import { StepFooter, StepLayout } from "./StepLayout";
import { TestStep } from "./TestStep";

const STEP_LABELS: Record<OnboardingStep, string> = {
  intro: "Overview",
  knowledge: "Knowledge",
  appearance: "Appearance",
  test: "Test",
  install: "Install",
};

const STEPS = ONBOARDING_STEPS.map((id) => ({ id, label: STEP_LABELS[id] }));

interface CustomerAgentOnboardingProps {
  businessId: string;
  config: CustomerAgentConfig;
  agent: Pick<ReturnType<typeof useCustomerAgent>, "update" | "saveOnboarding">;
  onRefreshInstallation: () => void;
}

/** First-run guided setup. Every later step needs the agent turned on, since that creates the playbook and code. */
export function CustomerAgentOnboarding({
  businessId,
  config,
  agent,
  onRefreshInstallation,
}: CustomerAgentOnboardingProps) {
  const { requestNavigation } = useUnsavedChangesContext();
  const credits = useVisitorAgentInstall(businessId).credits;
  const enabled = credits.data?.enabled === true;
  const playbook = usePlaybook(businessId);
  const hasPlaybook = Boolean(playbook.data?.content.trim());

  const savedIndex = config.onboarding.step ? ONBOARDING_STEPS.indexOf(config.onboarding.step) : 0;
  const [furthest, setFurthest] = useState(Math.max(0, savedIndex));
  const [requested, setRequested] = useState(Math.max(0, savedIndex));
  const current = enabled ? requested : 0;

  const goTo = (index: number) => {
    setRequested(index);
    if (index > furthest) {
      setFurthest(index);
      agent.saveOnboarding.mutate({ step: ONBOARDING_STEPS[index] });
    }
  };
  const next = () => goTo(current + 1);
  const back = () => requestNavigation(() => goTo(current - 1));

  const finish = () =>
    agent.saveOnboarding.mutate(
      { step: "install", completed: true },
      { onSuccess: () => toast.success("Customer agent is set up") },
    );

  const step = ONBOARDING_STEPS[current];

  if (credits.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <MassicAmoebaLoader size={32} label="Loading setup" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Stepper
        steps={STEPS}
        currentStep={current}
        onStepClick={(index) => requestNavigation(() => goTo(index))}
        isStepEnabled={(index) => index !== current && index <= furthest && (index === 0 || enabled)}
        className="mb-6 max-w-[752px] shrink-0"
      />

      {step === "intro" && <IntroStep businessId={businessId} config={config} onContinue={next} />}

      {step === "knowledge" && (
        <StepLayout
          title="Knowledge"
          line="How your agent talks to customers. Review it and ask for changes in the chat."
          footer={
            <StepFooter onBack={back}>
              <Hint label={hasPlaybook ? undefined : "Your playbook is still being set up"} disabled>
                <Button onClick={next} disabled={!hasPlaybook}>
                  Continue
                  <ArrowRight className="size-4" />
                </Button>
              </Hint>
            </StepFooter>
          }
        >
          <div className="min-h-0 flex-1 overflow-auto">
            <KnowledgeTab businessId={businessId} className="pb-0" />
          </div>
        </StepLayout>
      )}

      {step === "appearance" && (
        <StepLayout title="Appearance" line="How your agent looks on your website.">
          <AppearanceTab
            businessId={businessId}
            config={config}
            update={agent.update}
            setup={{ onBack: back, onContinue: next }}
          />
        </StepLayout>
      )}

      {step === "test" && <TestStep businessId={businessId} config={config} onBack={back} onContinue={next} />}

      {step === "install" && (
        <InstallStep
          businessId={businessId}
          config={config}
          finishing={agent.saveOnboarding.isPending}
          onRefreshInstallation={onRefreshInstallation}
          onBack={back}
          onFinish={finish}
        />
      )}
    </div>
  );
}
