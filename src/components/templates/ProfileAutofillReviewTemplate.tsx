"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@tanstack/react-form";
import { ArrowRight, Pencil, Unlink } from "lucide-react";

import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import { OfferingsForm } from "@/components/organisms/profile/OfferingsForm";
import { ContentCuesForm } from "@/components/organisms/profile/ContentCuesForm";
import { LocationsForm } from "@/components/organisms/profile/LocationsForm";
import { CompetitorsForm } from "@/components/organisms/profile/CompetitorsForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GenericInput } from "@/components/ui/generic-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SectionId =
  | "identity"
  | "classification"
  | "locations"
  | "service-areas"
  | "offerings"
  | "positioning"
  | "trust-people"
  | "channels"
  | "integrations"
  | "preferences"
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
  { id: "integrations", label: "Integrations" },
  { id: "preferences", label: "Preferences" },
  { id: "competitors", label: "Competitors" },
];

export function ProfileAutofillReviewTemplate({
  form,
  businessId,
  extractionController,
  hideFetchOfferingsFromWebsite,
  restrictFetchOfferings,
  leftTitle = "Profile",
  onSaveChanges,
  onSaveAndUpdateStrategy,
  saveDisabled,
  proceedDisabled,
  onAutofillProfile,
  autofillDisabled,
  autofillLoading,
  onUnlinkBusiness,
  showUnlinkBusiness = true,
  unlinkBusinessDisabled,
  className,
}: {
  form: any;
  businessId?: string | null;
  extractionController?: any;
  hideFetchOfferingsFromWebsite?: boolean;
  restrictFetchOfferings?: boolean;
  leftTitle?: string;
  onSaveChanges: () => void;
  onSaveAndUpdateStrategy: () => void;
  saveDisabled?: boolean;
  proceedDisabled?: boolean;
  onAutofillProfile?: () => void;
  autofillDisabled?: boolean;
  autofillLoading?: boolean;
  onUnlinkBusiness?: () => void;
  showUnlinkBusiness?: boolean;
  unlinkBusinessDisabled?: boolean;
  className?: string;
}) {
  const [activeSection, setActiveSection] = useState<SectionId>("identity");
  const [isEditGateOpen, setIsEditGateOpen] = useState(false);
  const values = useStore(form.store, (s: any) => s.values) as Partial<BusinessInfoFormData>;

  const summary = useMemo(() => {
    return [
      { label: "Website", value: String(values.website ?? "").trim() },
      { label: "Primary Location", value: String(values.primaryLocation ?? "").trim() },
      { label: "Service-area type", value: String(values.serviceAreaType ?? "").trim() },
    ];
  }, [values.primaryLocation, values.serviceAreaType, values.website]);

  return (
    <Card
      className={cn(
        "flex h-full min-h-0 w-full py-0 gap-0 flex-col overflow-hidden rounded-lg border border-general-border-three bg-white shadow-none",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-6 border-b border-general-border-three bg-general-primary-foreground px-6 py-6">
        <div className="flex items-center gap-6">
          <div className="text-2xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
            {leftTitle}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
            onClick={onSaveChanges}
            disabled={saveDisabled}
          >
            Save Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onSaveAndUpdateStrategy}
            disabled={proceedDisabled}
          >
            Save &amp; Update Strategy
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 items-stretch">
        {/* Sidebar */}
        <aside className="flex w-[200px] shrink-0 flex-col justify-between border-r border-general-border bg-white">
          <nav className="flex flex-col">
            {SECTIONS.map((s) => {
              const isActive = s.id === activeSection;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium leading-normal tracking-[0.07px]",
                    isActive
                      ? "bg-general-primary-foreground text-general-foreground"
                      : "text-[#737373] hover:bg-general-primary-foreground/60"
                  )}
                >
                  <span>{s.label}</span>
                  {isActive ? <ArrowRight className="size-4 text-general-muted-foreground" /> : null}
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
                  "inline-flex w-[162px] min-h-9 items-center justify-center gap-2 rounded-lg bg-[#fef2f2] px-4 py-2 text-sm font-medium leading-normal tracking-[0.07px] text-[#dc2626]",
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
        <div className="flex-1 min-w-0 px-6 py-4 overflow-y-auto">
          {activeSection === "identity" ? (
            <div className="flex min-w-0 gap-6">
              <div className="flex-1 min-w-0">
                <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                  Identity
                </h2>

                <div className="flex flex-col">
                  <div className="border-b border-general-border py-3">
                    <GenericInput<BusinessInfoFormData>
                      form={form as any}
                      fieldName="legalName"
                      type="input"
                      label="Legal name"
                      fieldOrientation="horizontal"
                      fieldClassName="gap-0 items-center"
                      className="max-w-[382px]"
                    />
                  </div>
                  <div className="border-b border-general-border py-3">
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
                  <div className="border-b border-general-border py-3">
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
                  <div className="border-b border-general-border py-3">
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
                  <div className="border-b border-general-border py-3">
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
                    />
                  </div>
                </div>
              </div>

              <div className="w-[352px] shrink-0 rounded-lg border border-general-border-three bg-white p-3">
                <div className="flex flex-col">
                  {summary.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-4 border-b border-general-border py-3 last:border-b-0"
                    >
                      <div className="text-xs font-medium text-general-muted-foreground">
                        {row.label}
                      </div>
                      <div className="max-w-[220px] truncate text-xs font-medium text-general-foreground">
                        {row.value || "—"}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setIsEditGateOpen(true)}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
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
              <BusinessInfoForm form={form} embedded />
            </div>
          ) : activeSection === "offerings" ? (
            <div className="max-w-[920px]">
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                Offerings
              </h2>
              <OfferingsForm
                form={form}
                businessId={businessId}
                embedded
                hideFetchOfferingsFromWebsite={hideFetchOfferingsFromWebsite}
                extractionController={extractionController}
                restrictFetchOfferings={restrictFetchOfferings}
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
          ) : (
            <div className="max-w-[920px]">
              <h2 className="mb-4 text-xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
                {SECTIONS.find((s) => s.id === activeSection)?.label ?? "Section"}
              </h2>
              {/* Temporary: surface all remaining fields through the existing full form to avoid losing edit coverage */}
              <BusinessInfoForm form={form} embedded />
              <ContentCuesForm form={form} embedded />
            </div>
          )}
        </div>
      </div>

      <Dialog open={isEditGateOpen} onOpenChange={setIsEditGateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit website & location</DialogTitle>
            <DialogDescription>
              Update these inputs and re-run Autofill Profile if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <BusinessInfoForm
              form={form}
              embedded
              embeddedVariant="autofillGate"
              disableWebsiteLock={true}
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
                    {autofillLoading ? "Autofilling..." : "Autofill Profile"}
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

