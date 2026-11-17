"use client";

import { useEffect, useState } from "react";
import type { CredentialResponse } from "@react-oauth/google";
import { GoogleLogin } from "@react-oauth/google";
import { useForm, useStore } from "@tanstack/react-form";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  BriefcaseBusiness,
  Loader2,
  type LucideIcon,
} from "lucide-react";

import { ProfileCategoryFields } from "@/components/organisms/profile/ProfileCategoryFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationSelect } from "@/components/ui/location-select";
import { cn } from "@/lib/utils";
import { deriveBusinessNameFromWebsite } from "@/utils/business-name";
import { useIndustries } from "@/hooks/use-profile-v2";
import {
  isCatalogIndustry,
  SERVICE_AREA_TYPE_OPTIONS,
} from "@/utils/profile-catalog";

export const SIGNUP_PROGRESS_STEPS = {
  business: 1,
  categories: 2,
  connectData: 3,
  reviewProfile: 4,
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
  pending,
}: {
  onSuccess: (response: CredentialResponse) => void;
  onError: () => void;
  pending: boolean;
}) {
  return (
    <>
      <SignupStepHeader
        title="Create your free account"
        description="Continue with Google to set up your business analytics dashboard."
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
  email,
  onBack,
  onBusiness,
  onAgency,
}: {
  email: string;
  onBack: () => void;
  onBusiness: () => void;
  onAgency: () => void;
}) {
  return (
    <>
      <SignupStepHeader
        title="Who are you signing up as?"
        description={email ? `Signed in as ${email}` : "Choose the account that fits you."}
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
        <Button variant="ghost" className="w-full" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
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
        description="Four quick details help us prepare your profile and analytics."
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
            We use your website to prepare the first version of your profile.
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
            Continue
          </Button>
        </div>
      </form>
    </>
  );
}

export interface BusinessCategories {
  primaryCategory: string;
  secondaryCategory: string;
  categoriesTagged: string[];
}

export function BusinessCategoriesStep({
  value,
  pending,
  onChange,
  onBack,
  onContinue,
}: {
  value: BusinessCategories;
  pending: boolean;
  onChange: (value: BusinessCategories) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [defaultValues] = useState(value);
  const form = useForm({ defaultValues });
  const values = useStore(form.store, (state) => state.values);
  const industries = useIndustries().data ?? [];
  const complete =
    isCatalogIndustry(values.primaryCategory, industries) &&
    Boolean(values.secondaryCategory.trim());

  useEffect(() => {
    onChange(values);
  }, [onChange, values]);

  return (
    <>
      <SignupStepHeader
        step={SIGNUP_PROGRESS_STEPS.categories}
        title="What kind of business is this?"
        description="Categories shape your analytics benchmarks and profile."
      />
      <form
        className="space-y-5 px-5 py-6 sm:px-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (complete && !pending) onContinue();
        }}
      >
        <ProfileCategoryFields
          form={form}
          disabled={pending}
          showCustomerTypes={false}
          className="flex flex-col gap-5"
        />
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

export function CreatingBusinessStep({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
    >
      <div className="h-0.5 overflow-hidden bg-general-secondary" aria-hidden="true">
        <span className="block h-full w-1/3 rounded-full bg-general-primary motion-safe:animate-progress-indeterminate" />
      </div>
      <div className="flex items-center gap-3 px-5 py-5 sm:px-6">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-general-secondary">
          <Loader2 className="size-4 animate-spin text-general-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="text-sm font-medium text-general-foreground">
            Setting up your business
          </h1>
          <p className="text-xs text-general-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function ProfileReviewStep({
  ready,
  businessName,
  onReview,
  onFinish,
}: {
  ready: boolean;
  businessName: string;
  onReview: () => void;
  onFinish: () => void;
}) {
  return (
    <>
      <SignupStepHeader
        step={SIGNUP_PROGRESS_STEPS.reviewProfile}
        title={ready ? "Your profile is ready" : "Almost there"}
        description={
          ready
            ? `Review what we found for ${businessName || "your business"}.`
            : "We are reading your website and preparing categories and offerings."
        }
      />
      <div className="space-y-5 px-5 py-6 sm:px-6">
        <div className="rounded-lg border border-general-border bg-general-secondary p-4">
          <div className="flex items-start gap-3">
            {ready ? (
              <BarChart3 className="mt-0.5 size-5 text-general-primary" />
            ) : (
              <Loader2 className="mt-0.5 size-5 animate-spin text-general-primary" />
            )}
            <div>
              <p className="text-sm font-medium">
                {ready ? "Business context prepared" : "Profile build in progress"}
              </p>
              <p className="mt-1 text-sm text-general-muted-foreground">
                You can edit identity, categories, offerings, and competitors in
                Profile at any time.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onReview}
          >
            Review and edit profile
          </Button>
          <Button className="flex-1" onClick={onFinish}>
            {ready ? "Looks good" : "Continue to analytics"}
          </Button>
        </div>
      </div>
    </>
  );
}
