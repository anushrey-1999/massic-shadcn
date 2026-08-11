"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@tanstack/react-form";
import { ArrowRight, Pencil, Unlink, Loader2 } from "lucide-react";

import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import {
  WebflowManualOfferingsForm,
  type WebflowOfferingsSource,
} from "./WebflowManualOfferingsForm";
import { ContentCuesForm } from "@/components/organisms/profile/ContentCuesForm";
import { LocationsForm } from "@/components/organisms/profile/LocationsForm";
import { CompetitorsForm } from "@/components/organisms/profile/CompetitorsForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GenericInput } from "@/components/ui/generic-input";
import { isValidWebsiteUrl } from "@/utils/utils";
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

type SectionId =
  | "identity"
  | "classification"
  | "locations"
  | "service-areas"
  | "offerings"
  | "positioning"
  | "trust-people"
  | "channels"
  | "competitors";

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

export function WebflowManualBusinessTemplate({
  form,
  leftTitle = "Profile",
  webflowSource,
  onSaveChanges,
  onSaveAndUpdateStrategy,
  saveDisabled,
  savePending,
  saveDisabledReason,
  proceedDisabled,
  onUnlinkBusiness,
  showUnlinkBusiness = true,
  unlinkBusinessDisabled,
  isWorkflowProcessing = false,
  customHeaderActions,
  showDefaultActions = true,
  className,
}: {
  form: any;
  leftTitle?: string;
  webflowSource?: WebflowOfferingsSource;
  onSaveChanges: () => void;
  onSaveAndUpdateStrategy: () => void;
  saveDisabled?: boolean;
  savePending?: boolean;
  saveDisabledReason?: string;
  proceedDisabled?: boolean;
  onUnlinkBusiness?: () => void;
  showUnlinkBusiness?: boolean;
  unlinkBusinessDisabled?: boolean;
  isWorkflowProcessing?: boolean;
  customHeaderActions?: React.ReactNode;
  showDefaultActions?: boolean;
  className?: string;
}) {
  const [activeSection, setActiveSection] = useState<SectionId>("identity");
  const [isEditGateOpen, setIsEditGateOpen] = useState(false);

  const values = useStore(
    form.store,
    (s: any) => s.values,
  ) as Partial<BusinessInfoFormData>;
  const offeringsMetaHasErrors = useStore(form.store, (s: any) => {
    return s.fieldMeta?.offeringsList?.hasValidationErrors === true;
  });
  const summary = useMemo(() => {
    return [
      { label: "Website", value: String(values.website ?? "").trim() },
      {
        label: "Primary Location",
        value: String(values.primaryLocation ?? "").trim(),
      },
      {
        label: "Service-area type",
        value: String(values.serviceAreaType ?? "").trim(),
      },
    ];
  }, [values.primaryLocation, values.serviceAreaType, values.website]);

  const sectionHasBlockingError = useMemo(() => {
    const website = String(values.website ?? "").trim();
    const businessName = String(values.businessName ?? "").trim();
    const primaryLocation = String(values.primaryLocation ?? "").trim();
    const serviceAreaType = String(values.serviceAreaType ?? "").trim();
    const serviceType = String(values.serviceType ?? "").trim();
    const offeringsType = String(values.offerings ?? "").trim();
    const offeringsList = Array.isArray(values.offeringsList)
      ? values.offeringsList
      : [];
    const hasAtLeastOneOffering = offeringsList.some((row) =>
      Boolean(String(row?.name ?? "").trim()),
    );

    const identityError =
      !website ||
      !isValidWebsiteUrl(website) ||
      !businessName ||
      !primaryLocation ||
      !serviceAreaType;

    const classificationError =
      !["physical", "online", "both"].includes(serviceType) ||
      !["products", "services", "both"].includes(offeringsType);

    const offeringsError = offeringsMetaHasErrors || !hasAtLeastOneOffering;

    const map: Record<SectionId, boolean> = {
      identity: identityError,
      classification: classificationError,
      locations: false,
      "service-areas": false,
      offerings: offeringsError,
      positioning: false,
      "trust-people": false,
      channels: false,
      competitors: false,
    };

    // Primary location + service area type are edited via the "Edit website & location" gate,
    // which lives under the Identity section. We keep the dot there to make the fix discoverable.
    return map;
  }, [
    offeringsMetaHasErrors,
    values.businessName,
    values.offerings,
    values.offeringsList,
    values.primaryLocation,
    values.serviceAreaType,
    values.serviceType,
    values.website,
  ]);

  return (
    <Card
      className={cn(
        "flex h-full min-h-0 w-full py-0 gap-0 flex-col overflow-hidden rounded-lg border border-general-border-three bg-white shadow-none",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-6 border-b border-general-border-three bg-general-primary-foreground px-6 py-6 max-md:flex-col max-md:items-stretch max-md:gap-4 max-md:px-4 max-md:py-4">
        <div className="flex items-center gap-6">
          <div className="text-2xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
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
                      disabled={Boolean(saveDisabled) || Boolean(savePending)}
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
                    <p>Workflow In Process</p>
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
                      disabled={proceedDisabled}
                    >
                      Save &amp; Update Strategy
                    </Button>
                  </span>
                </TooltipTrigger>
                {isWorkflowProcessing && (
                  <TooltipContent>
                    <p>Workflow In Process</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 items-stretch max-md:flex-col">
        {/* Sidebar */}
        <aside className="flex w-[200px] shrink-0 flex-col justify-between border-r border-general-border/30 bg-white max-md:w-full max-md:border-r-0 max-md:border-b">
          <nav className="flex flex-col max-md:flex-row max-md:overflow-x-auto">
            {SECTIONS.map((s) => {
              const isActive = s.id === activeSection;
              const hasError = sectionHasBlockingError[s.id] === true;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium leading-normal tracking-[0.07px] cursor-pointer max-md:w-auto max-md:shrink-0 max-md:gap-2",
                    isActive
                      ? "bg-general-primary-foreground text-general-foreground"
                      : "text-[#737373] hover:bg-general-primary-foreground/60",
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {hasError ? (
                      <span
                        className="size-2 rounded-full bg-[#E24B4A] shrink-0"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="truncate">{s.label}</span>
                  </span>
                  {isActive ? (
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
                disabled={unlinkBusinessDisabled}
                className={cn(
                  "inline-flex w-[162px] min-h-9 items-center justify-center gap-2 rounded-lg bg-[#fef2f2] px-4 py-2 text-sm font-medium leading-normal tracking-[0.07px] text-[#dc2626] cursor-pointer",
                  "disabled:opacity-50 disabled:pointer-events-none",
                )}
              >
                <Unlink className="size-4" />
                Unlink Business
              </button>
            </div>
          ) : null}
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 px-6 py-4 overflow-y-auto max-md:px-4">
          {activeSection === "identity" ? (
            <div className="flex min-w-0 gap-6 max-lg:flex-col">
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
                      fieldClassName="gap-0 items-center"
                      className="max-w-[382px]"
                      required
                    />
                  </div>
                  <div className="border-b border-general-border/30 py-3">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="businessCategory"
                      type="input"
                      label="Category"
                      fieldOrientation="horizontal"
                      fieldClassName="gap-0 items-center"
                      className="max-w-[382px]"
                    />
                  </div>
                  <div className="border-b border-general-border/30 py-3">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="foundingDate"
                      type="input"
                      label="Year founded"
                      fieldOrientation="horizontal"
                      fieldClassName="gap-0 items-center"
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
                      fieldClassName="gap-0 items-center"
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
                      fieldClassName="gap-0 items-center"
                      className="max-w-[382px]"
                      required
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="w-[352px] max-w-full shrink-0 self-start rounded-lg border border-general-border bg-[#fafafa] p-3 max-lg:w-full">
                <div className="flex flex-col gap-1.5">
                  {summary.map((row, index) => (
                    <div
                      key={row.label}
                      className={cn(
                        "flex items-center gap-0.5 py-3 min-w-0",
                        index < summary.length - 1 &&
                          "border-b border-general-border",
                      )}
                    >
                      <div className="flex w-[120px] shrink-0 items-center">
                        <p className="text-xs font-medium leading-normal tracking-[0.18px] text-general-muted-foreground whitespace-nowrap">
                          {row.label}
                        </p>
                      </div>
                      <div className="flex items-center flex-1 min-w-0">
                        <p className="text-xs font-medium leading-normal tracking-[0.18px] text-general-foreground truncate">
                          {row.value || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditGateOpen(true)}
                    className="inline-flex min-h-7 items-center justify-center gap-1.5 rounded-md border border-general-border bg-white px-3 py-1.5 shadow-sm transition-colors hover:bg-general-accent hover:border-general-primary cursor-pointer"
                  >
                    <Pencil className="size-3.5 shrink-0" />
                    <span className="text-xs font-medium leading-normal text-general-foreground">
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
                <GenericInput<BusinessInfoFormData>
                  form={form as any}
                  fieldName="b2bB2c"
                  type="select"
                  label="B2B / B2C"
                  placeholder="Select audience"
                  options={[
                    { value: "b2b", label: "B2B" },
                    { value: "b2c", label: "B2C" },
                    { value: "both", label: "Both" },
                  ]}
                />
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
                  fieldName="serviceType"
                  type="radio-cards"
                  label="Market"
                  required={true}
                  orientation="horizontal"
                  radioCardSize="sm"
                  options={[
                    { value: "physical", label: "Local" },
                    { value: "online", label: "Online" },
                    { value: "both", label: "Hybrid" },
                  ]}
                />
                <GenericInput<BusinessInfoFormData>
                  form={form as any}
                  fieldName="offerings"
                  type="radio-cards"
                  label="Sell"
                  required={true}
                  orientation="horizontal"
                  radioCardSize="sm"
                  options={[
                    { value: "products", label: "Products" },
                    { value: "services", label: "Services" },
                    { value: "both", label: "Both" },
                  ]}
                />
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
                                  const value = e.currentTarget.value.trim();
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
                                            x.toLowerCase() === v.toLowerCase(),
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
                                  const next = serviceAreasValue.slice(0, -1);
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
                                          x.toLowerCase() === v.toLowerCase(),
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
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                Offerings
              </h2>
              <WebflowManualOfferingsForm
                form={form}
                webflowSource={webflowSource}
              />
            </div>
          ) : activeSection === "positioning" ? (
            <div className="max-w-[920px]">
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                Positioning
              </h2>
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
                            <span
                              key={`${item}-${idx}`}
                              className="inline-flex items-center gap-1 rounded-full border border-general-border bg-white px-2 py-1 text-xs"
                            >
                              <span className="max-w-60 truncate">{item}</span>
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
                              <span className="max-w-60 truncate">{item}</span>
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
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                Channels
              </h2>
              <div className="flex flex-col gap-6">
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
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={isEditGateOpen} onOpenChange={setIsEditGateOpen}>
        <DialogContent className="sm:max-w-[520px] gap-0 p-0 overflow-hidden">
          <div className="w-full border-b border-general-border-three bg-general-primary-foreground px-6 py-6">
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-2xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                Edit location
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs font-normal leading-normal text-general-muted-foreground">
                Update the location details. The website comes from Webflow and
                cannot be changed here.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 py-6">
            <BusinessInfoForm
              form={form}
              embedded
              embeddedVariant="autofillGate"
              disableWebsiteLock={true}
              disabledFields={{ website: true }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
