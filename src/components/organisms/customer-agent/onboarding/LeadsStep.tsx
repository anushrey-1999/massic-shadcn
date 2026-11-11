"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useCustomerAgent } from "@/hooks/use-customer-agent";
import { leadEmails } from "@/lib/customer-agent";
import type { CustomerAgentConfig } from "@/types/customer-agent";
import { Hint } from "../controls";
import { LeadEmailsField, useLeadEmailsDraft } from "../leads/LeadEmailsField";
import { StepFooter, StepLayout } from "./StepLayout";

interface LeadsStepProps {
  config: CustomerAgentConfig;
  saveLeadEmails: ReturnType<typeof useCustomerAgent>["saveLeadEmails"];
  onBack: () => void;
  onContinue: () => void;
}

export function LeadsStep({ config, saveLeadEmails, onBack, onContinue }: LeadsStepProps) {
  const draft = useLeadEmailsDraft(leadEmails(config), saveLeadEmails);
  const hasSaved = leadEmails(config).length > 0;
  const canContinue = draft.isValid && !draft.isSaving;
  const hint = draft.isValid ? undefined : "Add at least one email to continue";

  const handleContinue = () => {
    if (draft.isDirty) draft.save(onContinue);
    else if (hasSaved) onContinue();
  };

  return (
    <StepLayout
      title="Lead emails"
      line="Where your agent sends the leads it captures."
      footer={
        <StepFooter onBack={onBack}>
          <Hint label={hint} disabled>
            <Button onClick={handleContinue} disabled={!canContinue}>
              {draft.isSaving && <Loader2 className="size-4 animate-spin" />}
              {draft.isSaving ? "Saving…" : draft.isDirty ? "Save and continue" : "Continue"}
              {!draft.isSaving && <ArrowRight className="size-4" />}
            </Button>
          </Hint>
        </StepFooter>
      }
    >
      <form
        className="min-h-0 flex-1 overflow-auto"
        onSubmit={(event) => {
          event.preventDefault();
          if (canContinue) handleContinue();
        }}
      >
        <div className="max-w-[560px] rounded-lg border border-general-border bg-white p-4 shadow-xs">
          <LeadEmailsField draft={draft} />
        </div>
      </form>
    </StepLayout>
  );
}
