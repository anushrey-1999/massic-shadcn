"use client";

import { useState } from "react";
import { MultiEmailInput } from "@/components/molecules/MultiEmailInput";
import type { useCustomerAgent } from "@/hooks/use-customer-agent";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { LEAD_EMAILS_MAX, leadEmailsSchema } from "@/types/customer-agent";
import { FieldRow } from "../controls";

type SaveLeadEmails = ReturnType<typeof useCustomerAgent>["saveLeadEmails"];

const sameEmails = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((email, index) => email === b[index]);

/**
 * Draft of the lead notification emails, kept apart from the saved list until the save succeeds.
 * Shared by the onboarding step and the Leads tab so both validate and save the same way.
 */
export function useLeadEmailsDraft(saved: string[], save: SaveLeadEmails) {
  const [draft, setDraft] = useState(saved);
  const [baseline, setBaseline] = useState(saved);
  if (!sameEmails(baseline, saved)) {
    setBaseline(saved);
    setDraft(saved);
  }

  const isDirty = !sameEmails(draft, saved);
  const parsed = leadEmailsSchema.safeParse(draft);
  useUnsavedChangesGuard({ isDirty });

  return {
    draft,
    setDraft,
    isDirty,
    isValid: parsed.success,
    /** Shown once the user has changed something, so a fresh empty form isn't red. */
    error: isDirty && !parsed.success ? parsed.error.issues[0]?.message : undefined,
    isSaving: save.isPending,
    reset: () => setDraft(saved),
    save: (onSaved?: () => void) => {
      if (!parsed.success || save.isPending) return;
      save.mutate(parsed.data, { onSuccess: () => onSaved?.() });
    },
  };
}

export type LeadEmailsDraft = ReturnType<typeof useLeadEmailsDraft>;

export function LeadEmailsField({ draft }: { draft: LeadEmailsDraft }) {
  return (
    <FieldRow
      label="Send new leads to"
      error={draft.error}
      hint={`Press Enter or comma after each email. Up to ${LEAD_EMAILS_MAX}.`}
    >
      <MultiEmailInput
        value={draft.draft}
        onChange={draft.setDraft}
        disabled={draft.isSaving}
        placeholder="you@business.com, team@business.com"
      />
    </FieldRow>
  );
}
