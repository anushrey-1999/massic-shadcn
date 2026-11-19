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

function SignupProgress({
  step,
  completedLabel,
}: {
  step: number;
  completedLabel?: string;
}) {
  const stepLabel = `Step ${step} of ${SIGNUP_PROGRESS_TOTAL}`;
  return (
    <div
      className="flex items-center gap-2.5"
      role="progressbar"
      aria-label="Signup progress"
      aria-valuemin={1}
      aria-valuemax={SIGNUP_PROGRESS_TOTAL}
      aria-valuenow={step}
      aria-valuetext={completedLabel ? `${completedLabel}. ${stepLabel}` : stepLabel}
    >
      {completedLabel ? (
        <Check className="size-3.5 text-general-primary" aria-hidden="true" />
      ) : (
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
      )}
      <span className="text-xs text-general-unofficial-foreground-alt">
        {completedLabel ? `${completedLabel} · ` : null}
        {stepLabel}
      </span>
    </div>
  );
}

export function SignupStepHeader({
  title,
  description,
  step,
  completedLabel,
}: {
  title: string;
  description: string;
  step?: number;
  completedLabel?: string;
}) {
  return (
    <div className="space-y-1 border-b border-general-border px-5 py-5 sm:px-6">
      {step ? (
        <div className="pb-2">
          <SignupProgress step={step} completedLabel={completedLabel} />
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
        description="Use these details to create your business profile."
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
            Use the main website for your business.
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

export function CreatingBusinessStep({
  creatingAccount,
  progress,
}: {
  creatingAccount: boolean;
  progress: CreationProgress;
}) {
  let message = "Creating your business profile…";
  if (creatingAccount) {
    message = "Creating your account…";
  } else if (progress.profileSaved) {
    message = "Finishing business setup…";
  } else if (progress.business) {
    message = "Saving your location and service area…";
  }

  return (
    <div className="px-5 py-6 text-center motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-out sm:px-6">
      <p className="text-xs text-general-muted-foreground">
        Step {SIGNUP_PROGRESS_STEPS.business} of {SIGNUP_PROGRESS_TOTAL} · Business details
      </p>
      <div className="mx-auto mt-4 grid size-14 place-items-center rounded-lg bg-general-primary/10">
        <MassicAmoebaLoader size={30} label={null} />
      </div>
      <h1 className="mt-3 text-xl font-medium tracking-[-0.01em] text-general-foreground">
        Setting up your business
      </h1>
      <p
        role="status"
        className="mt-1 min-h-10 text-sm text-general-muted-foreground sm:min-h-5"
      >
        <span
          key={message}
          className="inline-block motion-safe:animate-in motion-safe:fade-in-50 motion-safe:duration-200 motion-safe:ease-out"
        >
          {message}
        </span>
      </p>
      <p className="mt-3 text-xs text-general-muted-foreground sm:mt-5">
        Up next · Connect your Google data
      </p>
    </div>
  );
}
