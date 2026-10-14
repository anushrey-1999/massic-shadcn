"use client";

import { useEffect, useRef } from "react";
import { ProfileIdentityFields } from "./ProfileIdentityFields";
import { OfferingsForm } from "./OfferingsForm";
import { CompetitorsForm } from "./CompetitorsForm";
import { ProfileCategoryFields } from "./ProfileCategoryFields";
import { ProfileEditingDisabledContext } from "./profile-editing-context";
import {
  getProfileSummaryIssues,
  type ProfileValidationIssue,
} from "@/utils/profile-form-fields";
import type { OfferingExtractionStatus } from "@/types/profile-v2";

export function CombinedProfileForm({
  form,
  disabled = false,
  initialFieldsLocked = false,
  deriveName = false,
  issues = [],
  focusRequest = 0,
  extractionStatus,
  onOfferingEditorOpenChange,
  showPrimaryCategoryRepair = false,
}: {
  form: any;
  disabled?: boolean;
  initialFieldsLocked?: boolean;
  deriveName?: boolean;
  issues?: ProfileValidationIssue[];
  focusRequest?: number;
  extractionStatus?: OfferingExtractionStatus;
  onOfferingEditorOpenChange?: (open: boolean) => void;
  showPrimaryCategoryRepair?: boolean;
}) {
  const issuesRef = useRef(issues);
  const summaryIssues = getProfileSummaryIssues(issues);
  issuesRef.current = issues;
  useEffect(() => {
    if (!focusRequest) return;
    const field = document.getElementById(
      String(issuesRef.current[0]?.field ?? ""),
    );
    field?.focus();
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusRequest, showPrimaryCategoryRepair]);

  return (
    <ProfileEditingDisabledContext.Provider value={disabled}>
      <fieldset disabled={disabled} className="min-w-0 space-y-8">
        {summaryIssues.length > 0 && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {summaryIssues.map((issue) => (
              <p key={`${issue.field}-${issue.message}`}>
                {issue.label}: {issue.message}
              </p>
            ))}
          </div>
        )}
        <section className="space-y-4">
          <h2 className="border-b border-general-border pb-3 text-base font-medium">
            Identity
          </h2>
          <ProfileIdentityFields
            form={form}
            disabled={disabled}
            initialFieldsLocked={initialFieldsLocked}
            deriveName={deriveName}
            className="md:grid-cols-2"
          />
        </section>
        {showPrimaryCategoryRepair ? (
          <section className="space-y-4">
            <h2 className="border-b border-general-border pb-3 text-base font-medium">
              Classification
            </h2>
            <ProfileCategoryFields
              form={form}
              disabled={disabled}
              primaryOnly
            />
          </section>
        ) : null}
        <section>
          <OfferingsForm
            extractionStatus={extractionStatus}
            onEditorOpenChange={onOfferingEditorOpenChange}
            form={form}
            embedded
            disabled={disabled}
            required={false}
            validationMessage={
              issues.find((issue) => issue.field === "offeringsList")?.message
            }
          />
          <p className="mt-2 text-xs text-general-muted-foreground">
            Optional when saving. At least one offering is required to analyze
            the business.
          </p>
        </section>
        <section>
          <CompetitorsForm form={form} embedded />
          <p className="mt-2 text-xs text-general-muted-foreground">
            Optional.
          </p>
        </section>
      </fieldset>
    </ProfileEditingDisabledContext.Provider>
  );
}
