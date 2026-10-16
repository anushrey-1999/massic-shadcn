"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Lock, Loader2 } from "lucide-react";

import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { CombinedProfileForm } from "@/components/organisms/profile/CombinedProfileForm";
import { ProfileEditingDisabledContext } from "@/components/organisms/profile/profile-editing-context";
import { OfferingsForm } from "@/components/organisms/profile/OfferingsForm";
import { ContentCuesForm } from "@/components/organisms/profile/ContentCuesForm";
import { LocationsForm } from "@/components/organisms/profile/LocationsForm";
import { CompetitorsForm } from "@/components/organisms/profile/CompetitorsForm";
import { ProfileCategoryFields } from "@/components/organisms/profile/ProfileCategoryFields";
import {
  ProfileReferenceDocument,
  type ProfileReferenceSource,
} from "@/components/organisms/profile/ProfileReferenceDocument";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useBusinessStore } from "@/store/business-store";
import { GenericInput } from "@/components/ui/generic-input";
import { TagsInput } from "@/components/ui/tags-input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type {
  OfferingExtractionStatus,
  ProfileReadOnlyDetails,
} from "@/types/profile-v2";
import {
  countIssuesBySection,
  getProfileSummaryIssues,
  type ProfileSectionId,
  type ProfileValidationIssue,
} from "@/utils/profile-form-fields";

type SectionId = ProfileSectionId | "document";

const FULL_SECTIONS: Array<{ id: ProfileSectionId; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "classification", label: "Classification" },
  { id: "locations", label: "Locations" },
  { id: "service-areas", label: "Service Areas" },
  { id: "offerings", label: "Offerings" },
  { id: "positioning", label: "Positioning" },
  { id: "trust-people", label: "Trust & People" },
  { id: "channels", label: "Channels" },
  { id: "competitors", label: "Competitors" },
];

export function ProfileEditorTemplate({
  form,
  mode = "full",
  leftTitle = "Profile",
  onSaveChanges,
  onAnalyzeBusiness,
  saveDisabled,
  savePending,
  saveDisabledReason,
  analyzeDisabled,
  analyzePending = false,
  analyzeDisabledReason,
  isWorkflowProcessing = false,
  busyReason,
  initialFieldsLocked = false,
  readOnlyDetails,
  referenceProfile,
  submissionIssues = [],
  validationFocusRequest = 0,
  customHeaderActions,
  trailingHeaderActions,
  notice,
  showDefaultActions = true,
  showAnalyzeBusiness = true,
  className,
  extractionStatus,
  showPrimaryCategoryRepair = false,
}: {
  form: any;
  mode?: "minimal" | "full";
  leftTitle?: string;
  onSaveChanges: () => void;
  onAnalyzeBusiness: () => void;
  saveDisabled?: boolean;
  savePending?: boolean;
  saveDisabledReason?: string;
  analyzeDisabled?: boolean;
  analyzePending?: boolean;
  analyzeDisabledReason?: string;
  isWorkflowProcessing?: boolean;
  busyReason?: string;
  initialFieldsLocked?: boolean;
  readOnlyDetails?: ProfileReadOnlyDetails;
  referenceProfile?: ProfileReferenceSource;
  submissionIssues?: ProfileValidationIssue[];
  validationFocusRequest?: number;
  customHeaderActions?: React.ReactNode;
  trailingHeaderActions?: React.ReactNode;
  notice?: React.ReactNode;
  showDefaultActions?: boolean;
  showAnalyzeBusiness?: boolean;
  className?: string;
  extractionStatus?: OfferingExtractionStatus;
  showPrimaryCategoryRepair?: boolean;
}) {
  const { locationOptions, locationsLoading } = useBusinessStore(
    (state) => state.profileForm,
  );
  const [offeringEditorOpen, setOfferingEditorOpen] = useState(false);
  const lastMode = useRef(mode);
  // Access can change while a dialog holds an uncommitted draft.
  if (!offeringEditorOpen) lastMode.current = mode;
  mode = lastMode.current;
  const [activeSection, setActiveSection] = useState<SectionId>("identity");
  const pendingFocusRef = useRef<ProfileValidationIssue | null>(null);
  const submissionIssuesRef = useRef(submissionIssues);
  submissionIssuesRef.current = submissionIssues;
  const hasReference = mode === "full" && Boolean(referenceProfile);
  const sections = useMemo<Array<{ id: SectionId; label: string }>>(
    () =>
      hasReference
        ? [...FULL_SECTIONS, { id: "document", label: "Document" }]
        : FULL_SECTIONS,
    [hasReference],
  );

  const sectionIssueCounts = useMemo(
    () => countIssuesBySection(submissionIssues),
    [submissionIssues],
  );
  const activeSectionIssues = useMemo(
    () => submissionIssues.filter((issue) => issue.section === activeSection),
    [activeSection, submissionIssues],
  );
  const sectionSummaryIssues = getProfileSummaryIssues(activeSectionIssues);

  useEffect(() => {
    const firstIssue = submissionIssuesRef.current[0];
    if (!firstIssue || validationFocusRequest === 0) return;
    if (mode === "minimal") {
      setActiveSection("identity");
      return;
    }
    pendingFocusRef.current = firstIssue;
    setActiveSection(firstIssue.section);
  }, [validationFocusRequest, mode]);

  useEffect(() => {
    if (!sections.some((section) => section.id === activeSection)) {
      setActiveSection("identity");
    }
  }, [activeSection, sections]);

  useEffect(() => {
    const issue = pendingFocusRef.current;
    if (!issue || issue.section !== activeSection) return;
    const frame = requestAnimationFrame(() => {
      const field = document.getElementById(String(issue.field));
      field?.focus();
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      pendingFocusRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [activeSection, validationFocusRequest]);

  return (
    <Card
      className={cn(
        "flex h-full min-h-0 min-w-0 w-full py-0 gap-0 flex-col overflow-hidden rounded-lg border border-general-border-three bg-white shadow-none",
        className,
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-general-border-three bg-general-primary-foreground px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-6">
          <div className="text-2xl font-medium leading-[1.2] tracking-[-0.02em] text-general-foreground">
            {leftTitle}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {customHeaderActions}
          {showDefaultActions && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      type="button"
                      className="bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                      onClick={onSaveChanges}
                      disabled={
                        Boolean(saveDisabled) ||
                        Boolean(savePending) ||
                        isWorkflowProcessing
                      }
                    >
                      {savePending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {saveDisabledReason ? (
                  <TooltipContent>
                    <p>{saveDisabledReason}</p>
                  </TooltipContent>
                ) : isWorkflowProcessing ? (
                  <TooltipContent>
                    <p>{busyReason ?? "Workflow In Process"}</p>
                  </TooltipContent>
                ) : null}
              </Tooltip>
              {showAnalyzeBusiness && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onAnalyzeBusiness}
                        disabled={analyzeDisabled || isWorkflowProcessing}
                      >
                        {analyzePending ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Preparing analysis…
                          </>
                        ) : (
                          "Analyze business"
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {analyzeDisabledReason ? (
                    <TooltipContent>
                      <p>{analyzeDisabledReason}</p>
                    </TooltipContent>
                  ) : isWorkflowProcessing ? (
                    <TooltipContent>
                      <p>{busyReason ?? "Workflow In Process"}</p>
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              )}
            </>
          )}
          {trailingHeaderActions}
        </div>
      </div>

      {/* Body */}
      {notice}
      <ProfileEditingDisabledContext.Provider value={isWorkflowProcessing}>
        {mode === "minimal" ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <CombinedProfileForm
              extractionStatus={extractionStatus}
              onOfferingEditorOpenChange={setOfferingEditorOpen}
              form={form}
              disabled={isWorkflowProcessing}
              initialFieldsLocked={initialFieldsLocked}
              issues={submissionIssues}
              focusRequest={validationFocusRequest}
              showPrimaryCategoryRepair={showPrimaryCategoryRepair}
            />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 min-w-0 flex-col items-stretch md:flex-row">
            {/* Sidebar */}
            <aside className="flex w-full min-w-0 shrink-0 flex-col justify-between border-b border-general-border/30 bg-white md:w-[200px] md:border-b-0 md:border-r">
              <nav className="flex min-w-0 overflow-x-auto md:flex-col">
                {sections.map((s) => {
                  const isActive = s.id === activeSection;
                  const issueCount =
                    s.id === "document" ? 0 : sectionIssueCounts[s.id] ?? 0;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-current={isActive ? "page" : undefined}
                      aria-label={
                        issueCount > 0
                          ? `${s.label}, ${issueCount} ${issueCount === 1 ? "error" : "errors"}`
                          : undefined
                      }
                      onClick={() => setActiveSection(s.id)}
                      className={cn(
                        "flex w-auto shrink-0 items-center justify-between gap-2 whitespace-nowrap px-3 py-2 text-left md:w-full text-sm font-medium leading-normal tracking-[0.07px] cursor-pointer",
                        isActive
                          ? "bg-general-primary-foreground text-general-foreground"
                          : "text-[#737373] hover:bg-general-primary-foreground/60",
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {issueCount > 0 ? (
                          <span
                            className="size-2 rounded-full bg-[#E24B4A] shrink-0"
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="truncate">{s.label}</span>
                      </span>
                      {issueCount > 0 ? (
                        <span className="text-xs text-destructive">
                          {issueCount}
                        </span>
                      ) : isActive ? (
                        <ArrowRight className="size-4 text-general-muted-foreground" />
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Main */}
            <fieldset
              disabled={isWorkflowProcessing && activeSection !== "document"}
              className={cn(
                "flex-1 min-h-0 min-w-0 px-4 py-4 sm:px-6",
                activeSection === "document" ? "overflow-hidden" : "overflow-y-auto",
                isWorkflowProcessing &&
                  activeSection !== "document" &&
                  "cursor-not-allowed",
              )}
            >
              {sectionSummaryIssues.length > 0 ? (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
                >
                  <p className="text-xs font-medium text-destructive">
                    {sectionSummaryIssues.length === 1
                      ? sectionSummaryIssues[0].message
                      : `Complete ${sectionSummaryIssues.length} required fields.`}
                  </p>
                </div>
              ) : null}
              {activeSection === "document" && referenceProfile ? (
                <ProfileReferenceDocument {...referenceProfile} />
              ) : activeSection === "identity" ? (
                <div className="max-w-[920px]">
                  <h2 className="mb-4 border-b border-general-border/30 pb-3 text-base font-medium text-general-foreground">
                    Identity
                  </h2>
                  <div className="flex flex-col gap-6">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="businessName"
                      type="input"
                      label="Business name"
                      required
                    />
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="foundingDate"
                      type="input"
                      label="Year founded"
                      placeholder="E.g. 2018"
                    />
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="logoUrl"
                      type="url"
                      label="Logo URL"
                      placeholder="https://example.com/logo.png"
                    />
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="website"
                      type="input"
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      label="Website"
                      required
                      disabled={initialFieldsLocked}
                    />
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="primaryLocation"
                      type="location-select"
                      label="Primary location"
                      required
                      options={locationOptions}
                      placeholder={
                        locationsLoading
                          ? "Loading locations…"
                          : "Select primary location"
                      }
                      loading={locationsLoading}
                      disabled={initialFieldsLocked || locationsLoading}
                    />
                  </div>
                </div>
              ) : activeSection === "classification" ? (
                <div className="max-w-[920px]">
                  <h2 className="mb-4 border-b border-general-border/30 pb-3 text-base font-medium text-general-foreground">
                    Classification
                  </h2>
                  <div className="flex flex-col gap-6">
                    <ProfileCategoryFields form={form} />
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="lifetimeValue"
                      type="radio-cards"
                      label="Lifetime Value"
                      required={false}
                      orientation="horizontal"
                      radioCardSize="sm"
                      options={[
                        { value: "high", label: "High" },
                        { value: "low", label: "Low" },
                      ]}
                    />
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="averageOrderValue"
                      type="number"
                      label="Average order value"
                      min={0}
                      placeholder="Enter an amount"
                    />
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="recurringFlag"
                      type="radio-cards"
                      label="Recurring revenue"
                      orientation="horizontal"
                      radioCardSize="sm"
                      options={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                        { value: "sometimes", label: "Sometimes" },
                      ]}
                    />
                    {readOnlyDetails ? (
                      <div className="max-w-md rounded-lg border border-general-border bg-general-primary-foreground p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <p className="text-sm font-medium text-general-foreground">
                            Generated classification
                          </p>
                          <Badge variant="outline">Read only</Badge>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-general-muted-foreground">
                              Market
                            </p>
                            <p className="mt-1 text-sm capitalize text-general-foreground">
                              {readOnlyDetails.market || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-general-muted-foreground">
                              Sell type
                            </p>
                            <p className="mt-1 text-sm capitalize text-general-foreground">
                              {readOnlyDetails.sellType || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : activeSection === "locations" ? (
                <div className="max-w-[920px]">
                  <LocationsForm form={form} embedded />
                </div>
              ) : activeSection === "service-areas" ? (
                <div className="max-w-[920px]">
                  <h2 className="mb-4 border-b border-general-border/30 pb-3 text-base font-medium text-general-foreground">
                    Service Areas
                  </h2>
                  <div className="flex flex-col gap-6">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="serviceAreaType"
                      type="select"
                      label="Service Area Type"
                      required
                      disabled={initialFieldsLocked}
                      placeholder="Select service area type"
                      options={[
                        { value: "international", label: "International" },
                        { value: "national", label: "National" },
                        { value: "state_regional", label: "State-Regional" },
                        { value: "city_local", label: "City/Local" },
                      ]}
                    />
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-general-foreground">
                        Service Areas
                      </label>
                      <form.Field name="serviceAreas">
                        {(field: any) => {
                          const serviceAreasValue = field.state.value || [];
                          return (
                            <div className="flex flex-col gap-2">
                              <div className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-white px-3 py-2 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
                                {serviceAreasValue.map(
                                  (area: string, idx: number) => (
                                    <span
                                      key={`${area}-${idx}`}
                                      className="inline-flex items-center gap-1 rounded-full border border-general-border bg-white px-2 py-1 text-xs"
                                    >
                                      <span className="max-w-60 truncate">
                                        {area}
                                      </span>
                                      <button
                                        type="button"
                                        className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-general-muted-foreground hover:text-foreground cursor-pointer"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          const next = serviceAreasValue.filter(
                                            (_: string, i: number) => i !== idx,
                                          );
                                          field.handleChange(next);
                                        }}
                                      >
                                        <svg
                                          className="h-3.5 w-3.5"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                          />
                                        </svg>
                                      </button>
                                    </span>
                                  ),
                                )}
                                <input
                                  type="text"
                                  placeholder={
                                    serviceAreasValue.length === 0
                                      ? "Type a service area and press Enter"
                                      : undefined
                                  }
                                  className="min-w-[120px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-general-muted-foreground placeholder:text-xs"
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === "Enter" ||
                                      e.key === "Tab" ||
                                      e.key === ","
                                    ) {
                                      const value =
                                        e.currentTarget.value.trim();
                                      if (value) {
                                        e.preventDefault();
                                        const tokens = value
                                          .split(/[,\n]/g)
                                          .map((t) => t.trim())
                                          .filter(Boolean);
                                        const next = [
                                          ...serviceAreasValue,
                                          ...tokens,
                                        ].filter(
                                          (v, i, arr) =>
                                            arr.findIndex(
                                              (x) =>
                                                x.toLowerCase() ===
                                                v.toLowerCase(),
                                            ) === i,
                                        );
                                        field.handleChange(next);
                                        e.currentTarget.value = "";
                                      }
                                    }
                                    if (
                                      e.key === "Backspace" &&
                                      !e.currentTarget.value &&
                                      serviceAreasValue.length > 0
                                    ) {
                                      e.preventDefault();
                                      const next = serviceAreasValue.slice(
                                        0,
                                        -1,
                                      );
                                      field.handleChange(next);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = e.currentTarget.value.trim();
                                    if (value) {
                                      const tokens = value
                                        .split(/[,\n]/g)
                                        .map((t) => t.trim())
                                        .filter(Boolean);
                                      const next = [
                                        ...serviceAreasValue,
                                        ...tokens,
                                      ].filter(
                                        (v, i, arr) =>
                                          arr.findIndex(
                                            (x) =>
                                              x.toLowerCase() ===
                                              v.toLowerCase(),
                                          ) === i,
                                      );
                                      field.handleChange(next);
                                      e.currentTarget.value = "";
                                    }
                                  }}
                                />
                              </div>
                              <p className="text-xs text-general-muted-foreground">
                                Type service areas and press Enter to add them
                              </p>
                            </div>
                          );
                        }}
                      </form.Field>
                    </div>
                  </div>
                </div>
              ) : activeSection === "offerings" ? (
                <div className="max-w-[920px]">
                  <OfferingsForm
                    extractionStatus={extractionStatus}
                    onEditorOpenChange={setOfferingEditorOpen}
                    form={form}
                    embedded
                    required={false}
                    validationMessage={
                      activeSectionIssues.find(
                        (issue) => issue.field === "offeringsList",
                      )?.message
                    }
                  />
                </div>
              ) : activeSection === "positioning" ? (
                <div className="max-w-[920px]">
                  <h2 className="mb-4 border-b border-general-border/30 pb-3 text-base font-medium text-general-foreground">
                    Positioning
                  </h2>
                  <div className="mb-6 flex flex-col gap-6">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="businessDescription"
                      type="textarea"
                      label="Your business description"
                      description="Optional wording supplied by your team. It is kept separate from generated profile text."
                      rows={4}
                    />
                    {readOnlyDetails?.generatedDescription ||
                    readOnlyDetails?.generatedDetailedDescription ||
                    readOnlyDetails?.naicsContext ? (
                      <div className="rounded-lg border border-general-border bg-white p-4">
                        <div className="mb-4 flex items-center gap-2">
                          <Lock className="size-4 text-general-muted-foreground" />
                          <p className="text-sm font-medium text-general-foreground">
                            Generated profile insights
                          </p>
                          <Badge variant="outline">Read only</Badge>
                        </div>
                        <div className="space-y-4">
                          {readOnlyDetails.generatedDescription ? (
                            <div>
                              <p className="text-xs font-medium text-general-muted-foreground">
                                Business summary
                              </p>
                              <p className="mt-1 text-sm leading-6 text-general-foreground">
                                {readOnlyDetails.generatedDescription}
                              </p>
                            </div>
                          ) : null}
                          {readOnlyDetails.generatedDetailedDescription ? (
                            <details>
                              <summary className="cursor-pointer text-xs font-medium text-general-muted-foreground">
                                Detailed profile
                              </summary>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-general-foreground">
                                {readOnlyDetails.generatedDetailedDescription}
                              </p>
                            </details>
                          ) : null}
                          {readOnlyDetails.naicsContext ? (
                            <details>
                              <summary className="cursor-pointer text-xs font-medium text-general-muted-foreground">
                                Industry context
                              </summary>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-general-foreground">
                                {readOnlyDetails.naicsContext}
                              </p>
                            </details>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <ContentCuesForm form={form} embedded />
                </div>
              ) : activeSection === "competitors" ? (
                <div className="max-w-[920px]">
                  <CompetitorsForm form={form} embedded />
                </div>
              ) : activeSection === "trust-people" ? (
                <div className="max-w-[920px]">
                  <h2 className="mb-4 border-b border-general-border/30 pb-3 text-base font-medium text-general-foreground">
                    Trust & People
                  </h2>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-general-foreground">
                        Licenses / Compliance
                      </label>
                      <form.Field name="licensesCompliance">
                        {(field: any) => {
                          const value = field.state.value || [];
                          return (
                            <div className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-white px-3 py-2 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
                              {value.map((item: string, idx: number) => (
                                <span
                                  key={`${item}-${idx}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-general-border bg-white px-2 py-1 text-xs"
                                >
                                  <span className="max-w-60 truncate">
                                    {item}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      field.handleChange(
                                        value.filter(
                                          (_: string, i: number) => i !== idx,
                                        ),
                                      )
                                    }
                                    className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-general-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    <svg
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                </span>
                              ))}
                              <input
                                type="text"
                                placeholder={
                                  value.length === 0
                                    ? "Type a license or compliance item and press Enter"
                                    : undefined
                                }
                                className="min-w-[120px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-general-muted-foreground placeholder:text-xs"
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" ||
                                    e.key === "Tab" ||
                                    e.key === ","
                                  ) {
                                    const val = e.currentTarget.value.trim();
                                    if (val) {
                                      e.preventDefault();
                                      field.handleChange([
                                        ...value,
                                        ...val
                                          .split(/[,\n]/g)
                                          .map((t) => t.trim())
                                          .filter(Boolean),
                                      ]);
                                      e.currentTarget.value = "";
                                    }
                                  }
                                  if (
                                    e.key === "Backspace" &&
                                    !e.currentTarget.value &&
                                    value.length > 0
                                  ) {
                                    e.preventDefault();
                                    field.handleChange(value.slice(0, -1));
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    field.handleChange([
                                      ...value,
                                      ...val
                                        .split(/[,\n]/g)
                                        .map((t) => t.trim())
                                        .filter(Boolean),
                                    ]);
                                    e.currentTarget.value = "";
                                  }
                                }}
                              />
                            </div>
                          );
                        }}
                      </form.Field>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-general-foreground">
                        Awards / Certifications / Affiliations
                      </label>
                      <form.Field name="awardsCertifications">
                        {(field: any) => {
                          const value = field.state.value || [];
                          return (
                            <div className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-white px-3 py-2 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
                              {value.map((item: string, idx: number) => (
                                <span
                                  key={`${item}-${idx}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-general-border bg-white px-2 py-1 text-xs"
                                >
                                  <span className="max-w-60 truncate">
                                    {item}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      field.handleChange(
                                        value.filter(
                                          (_: string, i: number) => i !== idx,
                                        ),
                                      )
                                    }
                                    className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-general-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    <svg
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                </span>
                              ))}
                              <input
                                type="text"
                                placeholder={
                                  value.length === 0
                                    ? "Type an award or certification and press Enter"
                                    : undefined
                                }
                                className="min-w-[120px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-general-muted-foreground placeholder:text-xs"
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" ||
                                    e.key === "Tab" ||
                                    e.key === ","
                                  ) {
                                    const val = e.currentTarget.value.trim();
                                    if (val) {
                                      e.preventDefault();
                                      field.handleChange([
                                        ...value,
                                        ...val
                                          .split(/[,\n]/g)
                                          .map((t) => t.trim())
                                          .filter(Boolean),
                                      ]);
                                      e.currentTarget.value = "";
                                    }
                                  }
                                  if (
                                    e.key === "Backspace" &&
                                    !e.currentTarget.value &&
                                    value.length > 0
                                  ) {
                                    e.preventDefault();
                                    field.handleChange(value.slice(0, -1));
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    field.handleChange([
                                      ...value,
                                      ...val
                                        .split(/[,\n]/g)
                                        .map((t) => t.trim())
                                        .filter(Boolean),
                                    ]);
                                    e.currentTarget.value = "";
                                  }
                                }}
                              />
                            </div>
                          );
                        }}
                      </form.Field>
                    </div>
                  </div>
                </div>
              ) : activeSection === "channels" ? (
                <div className="max-w-[920px]">
                  <h2 className="mb-4 border-b border-general-border/30 pb-3 text-base font-medium text-general-foreground">
                    Channels
                  </h2>
                  <div className="flex flex-col gap-6">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="primaryPhone"
                      type="input"
                      label="Primary phone"
                      placeholder="+1 555 123 4567"
                    />
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-general-foreground">
                        Additional phones
                      </label>
                      <form.Field name="additionalPhones">
                        {(field: any) => (
                          <TagsInput
                            value={
                              Array.isArray(field.state.value)
                                ? field.state.value
                                : []
                            }
                            onChange={(next) => field.handleChange(next)}
                            placeholder="Type a phone number and press Enter"
                          />
                        )}
                      </form.Field>
                    </div>
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="supportEmail"
                      type="email"
                      label="Support Email"
                      placeholder="support@example.com"
                    />
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="commsEmail"
                      type="email"
                      label="Comms Email"
                      placeholder="reports@example.com"
                    />
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-general-foreground">
                        Social profiles
                      </label>
                      <form.Field name="socialProfiles">
                        {(field: any) => (
                          <TagsInput
                            value={(field.state.value ?? []).map(
                              (item: { url?: string }) => item.url ?? "",
                            )}
                            onChange={(next) =>
                              field.handleChange(next.map((url) => ({ url })))
                            }
                            placeholder="Paste a profile URL and press Enter"
                          />
                        )}
                      </form.Field>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-general-foreground">
                        Directory profiles
                      </label>
                      <form.Field name="directoryProfiles">
                        {(field: any) => (
                          <TagsInput
                            value={(field.state.value ?? []).map(
                              (item: { url?: string }) => item.url ?? "",
                            )}
                            onChange={(next) =>
                              field.handleChange(next.map((url) => ({ url })))
                            }
                            placeholder="Paste a directory URL and press Enter"
                          />
                        )}
                      </form.Field>
                    </div>
                  </div>
                </div>
              ) : null}
            </fieldset>
          </div>
        )}
      </ProfileEditingDisabledContext.Provider>
    </Card>
  );
}
