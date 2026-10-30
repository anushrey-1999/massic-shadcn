"use client";

import { useMemo } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVisitorAgentInstall } from "@/hooks/use-customer-agent";
import { businessPageUrl, pickAppearance, previewConfig } from "@/lib/customer-agent";
import type { CustomerAgentConfig } from "@/types/customer-agent";
import { requestError } from "../request-error";
import { TestAgentFrame } from "../TestAgentFrame";
import { StepFooter, StepLayout } from "./StepLayout";

const FALLBACK_QUESTIONS = [
  "What services do you offer?",
  "What are your opening hours?",
  "How can I get in touch?",
];

interface TestStepProps {
  businessId: string;
  config: CustomerAgentConfig;
  onBack: () => void;
  onContinue: () => void;
}

export function TestStep({ businessId, config, onBack, onContinue }: TestStepProps) {
  const install = useVisitorAgentInstall(businessId);
  const siteKey = install.siteKey.data;
  const widgetConfig = useMemo(() => previewConfig(config, pickAppearance(config)), [config]);
  const questions = [...config.appearance.content.suggested_questions, ...FALLBACK_QUESTIONS].slice(0, 3);

  const chat = () => {
    if (install.siteKey.isLoading) {
      return (
        <div role="status" className="flex h-full items-center justify-center gap-2 text-sm text-general-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Starting chat…
        </div>
      );
    }
    if (!siteKey) {
      return (
        <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-general-muted-foreground">
            {install.siteKey.isError ? requestError(install.siteKey.error) : "Turn on your customer agent to test it."}
          </p>
          {install.siteKey.isError && (
            <Button variant="outline" size="sm" onClick={() => void install.siteKey.refetch()}>
              Try again
            </Button>
          )}
        </div>
      );
    }
    return (
      <TestAgentFrame
        config={widgetConfig}
        siteId={config.site_id}
        siteKey={siteKey.key}
        pageUrl={businessPageUrl(config.business.website)}
        className="size-full"
      />
    );
  };

  return (
    <StepLayout
      title="Test your agent"
      line="Chat with it as a customer would."
      footer={
        <StepFooter onBack={onBack}>
          <Button onClick={onContinue}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </StepFooter>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto md:flex-row">
        <div className="h-[600px] max-h-full w-full max-w-[400px] shrink-0 overflow-hidden rounded-lg border border-general-border bg-white shadow-xs">
          {chat()}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-general-foreground">Try asking</p>
          <ul className="space-y-2">
            {questions.map((question) => (
              <li
                key={question}
                className="rounded-lg border border-general-border bg-general-primary-foreground px-3 py-2 text-sm text-general-foreground"
              >
                {question}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </StepLayout>
  );
}
