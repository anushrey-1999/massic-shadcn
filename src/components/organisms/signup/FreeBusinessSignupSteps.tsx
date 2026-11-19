"use client";

import { useEffect, useState } from "react";
import type { CredentialResponse } from "@react-oauth/google";
import { GoogleLogin } from "@react-oauth/google";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  BriefcaseBusiness,
  Check,
  Loader2,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationSelect } from "@/components/ui/location-select";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import type { CreationProgress } from "@/lib/business-creation-draft";
import { cn } from "@/lib/utils";
import { deriveBusinessNameFromWebsite } from "@/utils/business-name";
import { SERVICE_AREA_TYPE_OPTIONS } from "@/utils/profile-catalog";

export const SIGNUP_PROGRESS_STEPS = {
  business: 1,
  connectData: 2,
} as const;

const SIGNUP_PROGRESS_TOTAL = Object.keys(SIGNUP_PROGRESS_STEPS).length;

function SignupProgress({ step }: { step: number }) {
  return (
    <div
      className="flex items-center gap-2.5"
      role="progressbar"
      aria-label="Signup progress"
      aria-valuemin={1}
      aria-valuemax={SIGNUP_PROGRESS_TOTAL}
      aria-valuenow={step}
    >
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: SIGNUP_PROGRESS_TOTAL }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 w-7 rounded-full",
              index < step ? "bg-general-primary" : "bg-general-border",
            )}
          />
        ))}
      </div>
      <span className="text-xs text-general-unofficial-foreground-alt">
        Step {step} of {SIGNUP_PROGRESS_TOTAL}
      </span>
    </div>
  );
}

export function SignupStepHeader({
  title,
  description,
  step,
}: {
  title: string;
  description: string;
  step?: number;
}) {
  return (
    <div className="space-y-1 border-b border-general-border px-5 py-5 sm:px-6">
      {step ? (
        <div className="pb-2">
          <SignupProgress step={step} />
        </div>
      ) : null}
      <h1 className="text-xl font-medium tracking-[-0.01em] text-general-foreground">
        {title}
      </h1>
      <p className="text-sm text-general-unofficial-foreground-alt">{description}</p>
    </div>
  );
}

export function GoogleSignupStep({
  onSuccess,
  onError,
  onBack,
  pending,
}: {
  onSuccess: (response: CredentialResponse) => void;
  onError: () => void;
  onBack: () => void;
  pending: boolean;
}) {
  return (
    <>
      <SignupStepHeader
        title="Continue with Google"
        description="Use Google to create your free business account."
      />
      <div className="space-y-5 px-5 py-6 sm:px-6">
        <div className={cn("flex justify-center", pending && "pointer-events-none opacity-60")}>
          <GoogleLogin
            onSuccess={onSuccess}
            onError={onError}
            text="signup_with"
            shape="rectangular"
            size="large"
          />
        </div>
        {pending ? (
          <div className="flex items-center justify-center gap-2 text-sm text-general-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Signing you in…
          </div>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onBack}
          disabled={pending}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <p className="text-center text-xs leading-5 text-general-muted-foreground">
          By continuing, you agree to the Massic Terms and Privacy Policy.
          Anonymous, aggregated data may be used to show trends by business type
          and location. Your business metrics are never shared.
        </p>
      </div>
    </>
  );
}

export function AccountTypeStep({
  onBusiness,
  onAgency,
}: {
  onBusiness: () => void;
  onAgency: () => void;
}) {
  return (
    <>
      <SignupStepHeader
        title="Who are you signing up as?"
        description="Choose the account that fits you."
      />
      <div className="space-y-4 px-5 py-6 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <AccountTypeOption
            icon={BriefcaseBusiness}
            title="My own business"
            description="Free analytics and profile"
            onSelect={onBusiness}
          />
          <AccountTypeOption
            icon={Building2}
            title="An agency"
            description="Manage multiple clients"
            onSelect={onAgency}
            external
          />
        </div>
      </div>
    </>
  );
}

function AccountTypeOption({
  icon: Icon,
  title,
  description,
  onSelect,
  external = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onSelect: () => void;
  external?: boolean;
}) {
  const ArrowIcon = external ? ArrowUpRight : ArrowRight;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex items-center gap-3 rounded-lg border border-general-border bg-white px-3 py-2.5 text-left shadow-xs transition-colors hover:border-general-primary hover:bg-general-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-general-secondary group-hover:bg-white">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-general-foreground">
          {title}
        </span>
        <span className="block text-xs text-general-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowIcon
        className="size-4 shrink-0 text-general-muted-foreground transition-colors group-hover:text-general-primary"
        aria-hidden="true"
      />
    </button>
  );
}

export interface BusinessDetails {
  website: string;
  businessName: string;
  primaryLocation: string;
  serviceAreaType: string;
}

export function BusinessDetailsStep({
  value,
  locationOptions,
  locationsLoading,
  pending,
  onChange,
  onBack,
  onContinue,
}: {
  value: BusinessDetails;
  locationOptions: Array<{ value: string; label: string; disabled?: boolean }>;
  locationsLoading: boolean;
  pending: boolean;
  onChange: (value: Partial<BusinessDetails>) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [nameWasEdited, setNameWasEdited] = useState(Boolean(value.businessName));
  const complete =
    Boolean(value.website.trim()) &&
    Boolean(value.businessName.trim()) &&
    Boolean(value.primaryLocation) &&
    SERVICE_AREA_TYPE_OPTIONS.some(
      (option) => option.value === value.serviceAreaType,
    );

  useEffect(() => {
    if (nameWasEdited || !value.website.trim()) return;
    const derived = deriveBusinessNameFromWebsite(value.website);
    if (derived) onChange({ businessName: derived });
  }, [nameWasEdited, onChange, value.website]);

  return (
    <>
      <SignupStepHeader
        step={SIGNUP_PROGRESS_STEPS.business}
        title="Tell us about your business"
        description="Four quick details help us set up your analytics."
      />
      <form
        className="space-y-5 px-5 py-6 sm:px-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (complete && !pending) onContinue();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="signup-website">Website</Label>
          <Input
            id="signup-website"
            value={value.website}
            onChange={(event) => onChange({ website: event.target.value })}
            placeholder="yourbusiness.com"
            autoComplete="url"
            disabled={pending}
          />
          <p className="text-xs text-general-muted-foreground">
            We use your website to identify your business and set up analytics.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-business-name">Business name</Label>
          <Input
            id="signup-business-name"
            value={value.businessName}
            onChange={(event) => {
              setNameWasEdited(true);
              onChange({ businessName: event.target.value });
            }}
            placeholder="Your business name"
            autoComplete="organization"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-location">Primary location</Label>
          <LocationSelect
            id="signup-location"
            value={value.primaryLocation}
            onChange={(primaryLocation) => onChange({ primaryLocation })}
            options={locationOptions}
            loading={locationsLoading}
            disabled={pending}
            placeholder="Search for a city or location"
          />
        </div>
        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Service area type</legend>
          <div className="flex flex-wrap gap-2">
            {SERVICE_AREA_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={
                  value.serviceAreaType === option.value ? "default" : "outline"
                }
                aria-pressed={value.serviceAreaType === option.value}
                onClick={() => onChange({ serviceAreaType: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-general-muted-foreground">
            How far away are the customers you serve?
          </p>
        </fieldset>
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onBack}
            disabled={pending}
          >
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={!complete || pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {pending ? "Creating…" : "Create my account"}
          </Button>
        </div>
      </form>
    </>
  );
}

const BUSINESS_SETUP_STEPS = [
  {
    label: "Creating business",
    message: "Creating your business record.",
  },
  {
    label: "Saving details",
    message: "Saving your location and service details.",
  },
  {
    label: "Starting analytics",
    message: "Starting your analytics workspace.",
  },
] as const;

export function CreatingBusinessStep({
  progress,
}: {
  progress: CreationProgress;
}) {
  const activeStep = progress.business ? (progress.profileSaved ? 2 : 1) : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
    >
      <div className="px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-general-secondary">
            <MassicAmoebaLoader size={22} label={null} />
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-general-foreground">
              Setting up your business
            </h1>
            <p className="text-xs text-general-muted-foreground">
              {BUSINESS_SETUP_STEPS[activeStep].message}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-hidden="true">
          {BUSINESS_SETUP_STEPS.map((setupStep, index) => {
            const complete = index < activeStep;
            const active = index === activeStep;

            return (
              <div key={setupStep.label} className="min-w-0">
                <div
                  className={cn(
                    "mb-2 h-1 overflow-hidden rounded-full",
                    complete ? "bg-general-primary" : "bg-general-border",
                  )}
                >
                  {active ? (
                    <span className="block h-full w-1/3 rounded-full bg-general-primary motion-safe:animate-progress-indeterminate motion-reduce:w-full" />
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {complete ? (
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-general-primary text-general-primary-foreground">
                      <Check className="size-2.5" strokeWidth={2} />
                    </span>
                  ) : active ? (
                    <MassicAmoebaLoader size={16} label={null} />
                  ) : (
                    <span className="size-2 shrink-0 rounded-full bg-general-border" />
                  )}
                  <span
                    className={cn(
                      "truncate text-xs",
                      complete || active
                        ? "text-general-foreground"
                        : "text-general-muted-foreground",
                    )}
                  >
                    {setupStep.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
