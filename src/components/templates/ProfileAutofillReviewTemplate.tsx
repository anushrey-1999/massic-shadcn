"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "@tanstack/react-form";
import { ArrowRight, Lock, Pencil, Unlink, Loader2 } from "lucide-react";

import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import { OfferingsForm } from "@/components/organisms/profile/OfferingsForm";
import { ContentCuesForm } from "@/components/organisms/profile/ContentCuesForm";
import { LocationsForm } from "@/components/organisms/profile/LocationsForm";
import { CompetitorsForm } from "@/components/organisms/profile/CompetitorsForm";
import { ProfileCategoryFields } from "@/components/organisms/profile/ProfileCategoryFields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GenericInput } from "@/components/ui/generic-input";
import { TagsInput } from "@/components/ui/tags-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type {
  ProfileReadOnlyDetails,
  ProfileStatus,
} from "@/types/profile-v2";
import {
  countIssuesBySection,
  type ProfileSectionId as SectionId,
  type ProfileValidationIssue,
} from "@/utils/profile-form-fields";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
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

function IdentitySummary({ form }: { form: any }) {
  const website = useStore(form.store, (state: any) =>
    String(state.values?.website ?? "").trim()
  );
  const primaryLocation = useStore(form.store, (state: any) =>
    String(state.values?.primaryLocation ?? "").trim()
  );
  const serviceAreaType = useStore(form.store, (state: any) =>
    String(state.values?.serviceAreaType ?? "").trim()
  );
  const rows = [
    { label: "Website", value: website },
    { label: "Primary Location", value: primaryLocation },
    { label: "Service-area type", value: serviceAreaType },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={cn(
            "flex min-w-0 items-center gap-0.5 py-3",
            index < rows.length - 1 && "border-b border-general-border"
          )}
        >
          <div className="flex w-[120px] shrink-0 items-center">
            <p className="whitespace-nowrap text-xs font-medium leading-normal tracking-[0.18px] text-general-muted-foreground">
              {row.label}
            </p>
          </div>
          <p className="min-w-0 flex-1 truncate text-xs font-medium leading-normal tracking-[0.18px] text-general-foreground">
            {row.value || "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ProfileAutofillReviewTemplate({
  form,
  leftTitle = "Profile",
  onSaveChanges,
  onSaveAndUpdateStrategy,
  saveDisabled,
  savePending,
  saveDisabledReason,
  proceedDisabled,
  onAutofillProfile,
  autofillDisabled,
  autofillLoading,
  onUnlinkBusiness,
  showUnlinkBusiness = true,
  unlinkBusinessDisabled,
  isWorkflowProcessing = false,
  busyReason,
  initialFieldsLocked = false,
  profileStatus,
  readOnlyDetails,
  submissionIssues = [],
  customHeaderActions,
  notice,
  showDefaultActions = true,
  className,
}: {
  form: any;
  leftTitle?: string;
  onSaveChanges: () => void;
  onSaveAndUpdateStrategy: () => void;
  saveDisabled?: boolean;
  savePending?: boolean;
  saveDisabledReason?: string;
  proceedDisabled?: boolean;
  onAutofillProfile?: () => void;
  autofillDisabled?: boolean;
  autofillLoading?: boolean;
  onUnlinkBusiness?: () => void;
  showUnlinkBusiness?: boolean;
  unlinkBusinessDisabled?: boolean;
  isWorkflowProcessing?: boolean;
  busyReason?: string;
  initialFieldsLocked?: boolean;
  profileStatus?: ProfileStatus | null;
  readOnlyDetails?: ProfileReadOnlyDetails;
  submissionIssues?: ProfileValidationIssue[];
  customHeaderActions?: React.ReactNode;
  notice?: React.ReactNode;
  showDefaultActions?: boolean;
  className?: string;
}) {
  const [activeSection, setActiveSection] = useState<SectionId>("identity");
  const [isEditGateOpen, setIsEditGateOpen] = useState(false);

  const sectionIssueCounts = useMemo(
    () => countIssuesBySection(submissionIssues),
    [submissionIssues]
  );
  const activeSectionIssues = useMemo(
    () =>
      submissionIssues.filter((issue) => issue.section === activeSection),
    [activeSection, submissionIssues]
  );

  useEffect(() => {
    const firstIssue = submissionIssues[0];
    if (firstIssue) setActiveSection(firstIssue.section);
  }, [submissionIssues]);

  useEffect(() => {
    const firstIssue = submissionIssues[0];
    if (!firstIssue || firstIssue.section !== activeSection) return;
    const frame = requestAnimationFrame(() => {
      const field = document.getElementById(String(firstIssue.field));
      field?.focus();
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeSection, submissionIssues]);

  return (
    <Card
      className={cn(
        "flex h-full min-h-0 min-w-0 w-full py-0 gap-0 flex-col overflow-hidden rounded-lg border border-general-border-three bg-white shadow-none",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-general-border-three bg-general-primary-foreground px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-6">
          <div className="text-2xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
            {leftTitle}
          </div>
          {profileStatus === "needs_verification" ? (
            <Badge variant="outline">Needs verification</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
                        "Save Changes"
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onSaveAndUpdateStrategy}
                      disabled={proceedDisabled || isWorkflowProcessing}
                    >
                      Save &amp; Update Strategy
                    </Button>
                  </span>
                </TooltipTrigger>
                {isWorkflowProcessing && (
                  <TooltipContent>
                    <p>{busyReason ?? "Workflow In Process"}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      {notice}
      <div className="flex flex-1 min-h-0 min-w-0 flex-col items-stretch md:flex-row">
        {/* Sidebar */}
        <aside className="flex w-full min-w-0 shrink-0 flex-col justify-between border-b border-general-border/30 bg-white md:w-[200px] md:border-b-0 md:border-r">
          <nav className="flex min-w-0 overflow-x-auto md:flex-col">
            {SECTIONS.map((s) => {
              const isActive = s.id === activeSection;
              const issueCount = sectionIssueCounts[s.id] ?? 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    "flex w-auto shrink-0 items-center justify-between gap-2 whitespace-nowrap px-3 py-2 text-left md:w-full text-sm font-medium leading-normal tracking-[0.07px] cursor-pointer",
                    isActive
                      ? "bg-general-primary-foreground text-general-foreground"
                      : "text-[#737373] hover:bg-general-primary-foreground/60"
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

          {showUnlinkBusiness ? (
            <div className="flex w-full items-center justify-center py-3">
              <button
                type="button"
                onClick={onUnlinkBusiness}
                disabled={unlinkBusinessDisabled || isWorkflowProcessing}
                className={cn(
                  "inline-flex w-[162px] min-h-9 items-center justify-center gap-2 rounded-lg bg-[#fef2f2] px-4 py-2 text-sm font-medium leading-normal tracking-[0.07px] text-[#dc2626] cursor-pointer",
                  "disabled:opacity-50 disabled:pointer-events-none"
                )}
              >
                <Unlink className="size-4" />
                Unlink Business
              </button>
            </div>
          ) : null}
        </aside>

        {/* Main */}
        <fieldset
          disabled={isWorkflowProcessing}
          className={cn(
            "flex-1 min-h-0 min-w-0 px-4 py-4 overflow-y-auto sm:px-6",
            isWorkflowProcessing && "cursor-not-allowed opacity-60"
          )}
        >
          {activeSectionIssues.length > 0 ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
            >
              <p className="text-sm font-medium text-destructive">
                Complete the highlighted {activeSectionIssues.length === 1 ? "field" : "fields"}
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs text-destructive">
                {activeSectionIssues.map((issue) => (
                  <li key={`${issue.field}-${issue.message}`}>
                    {issue.label}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {activeSection === "identity" ? (
            <div className="flex min-w-0 flex-col gap-6 xl:flex-row">
              <div className="flex-1 min-w-0">
                <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                  Identity
                </h2>

                <div className="flex flex-col">
                  <div className="border-b border-general-border/30 py-3">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="businessName"
                      type="input"
                      label="Business name"
                      fieldOrientation="horizontal"
                      fieldClassName="flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-0"
                      className="max-w-[382px]"
                      required
                    />
                  </div>
                  <div className="border-b border-general-border/30 py-3">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="foundingDate"
                      type="input"
                      label="Year founded"
                      fieldOrientation="horizontal"
                      fieldClassName="flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-0"
                      className="max-w-[382px]"
                      placeholder="E.g. 2018"
                    />
                  </div>
                  <div className="border-b border-general-border/30 py-3">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="logoUrl"
                      type="url"
                      label="Logo URL"
                      fieldOrientation="horizontal"
                      fieldClassName="flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-0"
                      className="max-w-[382px]"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div className="py-3">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="website"
                      type="url"
                      label="Website"
                      fieldOrientation="horizontal"
                      fieldClassName="flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-0"
                      className="max-w-[382px]"
                      required
                      disabled={initialFieldsLocked}
                    />
                  </div>
                  <div className="border-t border-general-border/30 py-3">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="colorsFontsCss"
                      type="textarea"
                      label="Brand stylesheets"
                      rows={3}
                      placeholder="Add one stylesheet URL per line"
                    />
                  </div>
                  <div className="border-t border-general-border/30 py-3">
                    <label className="mb-2 block text-sm font-medium text-general-foreground">
                      Image library
                    </label>
                    <form.Field name="imagePhotoLibrary">
                      {(field: any) => {
                        const current = Array.isArray(field.state.value)
                          ? field.state.value
                          : [];
                        return (
                          <TagsInput
                            value={current.map(
                              (item: string | { url?: string }) =>
                                typeof item === "string"
                                  ? item
                                  : item.url ?? ""
                            )}
                            onChange={(next) =>
                              field.handleChange(
                                next.map(
                                  (url) =>
                                    current.find(
                                      (item: string | { url?: string }) =>
                                        (typeof item === "string"
                                          ? item
                                          : item.url) === url
                                    ) ?? { url }
                                )
                              )
                            }
                            placeholder="Paste an image URL and press Enter"
                          />
                        );
                      }}
                    </form.Field>
                  </div>
                </div>
              </div>

              <div className="w-full shrink-0 self-start rounded-lg border border-general-border bg-general-primary-foreground p-3 xl:w-[352px]">
                <IdentitySummary form={form} />
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditGateOpen(true)}
                    disabled={initialFieldsLocked || isWorkflowProcessing}
                    aria-label={
                      initialFieldsLocked
                        ? "Website and location are locked"
                        : isWorkflowProcessing
                          ? "Profile processing"
                          : "Edit website and location"
                    }
                    title={
                      initialFieldsLocked
                        ? "Website, primary location, and service-area type are locked after the business profile is created."
                        : isWorkflowProcessing
                          ? "Profile processing is in progress."
                          : undefined
                    }
                    className="inline-flex min-h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-general-border bg-white px-3 py-1.5 text-general-foreground shadow-sm transition-colors enabled:hover:border-general-primary enabled:hover:bg-general-accent disabled:cursor-not-allowed disabled:bg-general-secondary disabled:text-general-muted-foreground disabled:shadow-none"
                  >
                    <Pencil className="size-3.5 shrink-0" />
                    <span className="text-xs font-medium leading-normal">
                      Edit
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeSection === "classification" ? (
            <div className="max-w-[920px]">
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
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
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                Locations
              </h2>
              <LocationsForm form={form} embedded />
            </div>
          ) : activeSection === "service-areas" ? (
            <div className="max-w-[920px]">
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
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
                            {serviceAreasValue.map((area: string, idx: number) => (
                              <span
                                key={`${area}-${idx}`}
                                className="inline-flex items-center gap-1 rounded-full border border-general-border bg-white px-2 py-1 text-xs"
                              >
                                <span className="max-w-60 truncate">{area}</span>
                                <button
                                  type="button"
                                  className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-general-muted-foreground hover:text-foreground cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const next = serviceAreasValue.filter((_: string, i: number) => i !== idx);
                                    field.handleChange(next);
                                  }}
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                            <input
                              type="text"
                              placeholder={serviceAreasValue.length === 0 ? "Type a service area and press Enter" : undefined}
                              className="min-w-[120px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-general-muted-foreground placeholder:text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
                                  const value = e.currentTarget.value.trim();
                                  if (value) {
                                    e.preventDefault();
                                    const tokens = value.split(/[,\n]/g).map((t) => t.trim()).filter(Boolean);
                                    const next = [...serviceAreasValue, ...tokens].filter((v, i, arr) => 
                                      arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i
                                    );
                                    field.handleChange(next);
                                    e.currentTarget.value = "";
                                  } else if (e.key === "Enter") {
                                    // Prevent an empty Enter from bubbling up and submitting the parent form.
                                    e.preventDefault();
                                  }
                                }
                                if (e.key === "Backspace" && !e.currentTarget.value && serviceAreasValue.length > 0) {
                                  e.preventDefault();
                                  const next = serviceAreasValue.slice(0, -1);
                                  field.handleChange(next);
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.currentTarget.value.trim();
                                if (value) {
                                  const tokens = value.split(/[,\n]/g).map((t) => t.trim()).filter(Boolean);
                                  const next = [...serviceAreasValue, ...tokens].filter((v, i, arr) => 
                                    arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i
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
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                Offerings
              </h2>
              <OfferingsForm
                form={form}
                embedded
                validationMessage={
                  activeSectionIssues.find(
                    (issue) => issue.field === "offeringsList"
                  )?.message
                }
              />
            </div>
          ) : activeSection === "positioning" ? (
            <div className="max-w-[920px]">
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
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
                  <div className="rounded-lg border border-general-border bg-general-primary-foreground p-4">
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
                        <div>
                          <p className="text-xs font-medium text-general-muted-foreground">
                            Detailed profile
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-general-foreground">
                            {readOnlyDetails.generatedDetailedDescription}
                          </p>
                        </div>
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
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                Competitors
              </h2>
              <CompetitorsForm form={form} embedded />
            </div>
          ) : activeSection === "trust-people" ? (
            <div className="max-w-[920px]">
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
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
                            <span key={`${item}-${idx}`} className="inline-flex items-center gap-1 rounded-full border border-general-border bg-white px-2 py-1 text-xs">
                              <span className="max-w-60 truncate">{item}</span>
                              <button
                                type="button"
                                onClick={() => field.handleChange(value.filter((_: string, i: number) => i !== idx))}
                                className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-general-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            placeholder={value.length === 0 ? "Type a license or compliance item and press Enter" : undefined}
                            className="min-w-[120px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-general-muted-foreground placeholder:text-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
                                const val = e.currentTarget.value.trim();
                                if (val) {
                                  e.preventDefault();
                                  field.handleChange([...value, ...val.split(/[,\n]/g).map((t) => t.trim()).filter(Boolean)]);
                                  e.currentTarget.value = "";
                                } else if (e.key === "Enter") {
                                  // Prevent an empty Enter from submitting the parent form.
                                  e.preventDefault();
                                }
                              }
                              if (e.key === "Backspace" && !e.currentTarget.value && value.length > 0) {
                                e.preventDefault();
                                field.handleChange(value.slice(0, -1));
                              }
                            }}
                            onBlur={(e) => {
                              const val = e.currentTarget.value.trim();
                              if (val) {
                                field.handleChange([...value, ...val.split(/[,\n]/g).map((t) => t.trim()).filter(Boolean)]);
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
                            <span key={`${item}-${idx}`} className="inline-flex items-center gap-1 rounded-full border border-general-border bg-white px-2 py-1 text-xs">
                              <span className="max-w-60 truncate">{item}</span>
                              <button
                                type="button"
                                onClick={() => field.handleChange(value.filter((_: string, i: number) => i !== idx))}
                                className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-general-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            placeholder={value.length === 0 ? "Type an award or certification and press Enter" : undefined}
                            className="min-w-[120px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-general-muted-foreground placeholder:text-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
                                const val = e.currentTarget.value.trim();
                                if (val) {
                                  e.preventDefault();
                                  field.handleChange([...value, ...val.split(/[,\n]/g).map((t) => t.trim()).filter(Boolean)]);
                                  e.currentTarget.value = "";
                                } else if (e.key === "Enter") {
                                  // Prevent an empty Enter from submitting the parent form.
                                  e.preventDefault();
                                }
                              }
                              if (e.key === "Backspace" && !e.currentTarget.value && value.length > 0) {
                                e.preventDefault();
                                field.handleChange(value.slice(0, -1));
                              }
                            }}
                            onBlur={(e) => {
                              const val = e.currentTarget.value.trim();
                              if (val) {
                                field.handleChange([...value, ...val.split(/[,\n]/g).map((t) => t.trim()).filter(Boolean)]);
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
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
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
                          (item: { url?: string }) => item.url ?? ""
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
                          (item: { url?: string }) => item.url ?? ""
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

      <Dialog open={isEditGateOpen} onOpenChange={setIsEditGateOpen}>
        <DialogContent className="sm:max-w-[520px] gap-0 p-0 overflow-hidden">
          <div className="w-full border-b border-general-border-three bg-general-primary-foreground px-4 py-4 sm:px-6 sm:py-6">
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-2xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                Edit website & location
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs font-normal leading-normal text-general-muted-foreground">
                Update these inputs and rebuild the profile if needed.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 py-6">
            <BusinessInfoForm
              form={form}
              embedded
              embeddedVariant="autofillGate"
              disableWebsiteLock={true}
              disabledFields={{
                website: initialFieldsLocked || isWorkflowProcessing,
                primaryLocation: initialFieldsLocked || isWorkflowProcessing,
                serviceAreaType: initialFieldsLocked || isWorkflowProcessing,
              }}
              primaryLocationAction={
                onAutofillProfile ? (
                  <Button
                    type="button"
                    onClick={() => {
                      onAutofillProfile();
                    }}
                    disabled={autofillDisabled}
                    className="w-full gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                  >
                    {autofillLoading ? "Building profile..." : "Build Profile"}
                  </Button>
                ) : null
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
