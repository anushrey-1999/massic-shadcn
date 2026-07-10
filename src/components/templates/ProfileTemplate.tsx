"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../molecules/PageHeader";
import { useBusinessStore } from "@/store/business-store";
import { BusinessInfoForm } from "../organisms/profile/BusinessInfoForm";
import { OfferingsForm } from "../organisms/profile/OfferingsForm";
import { ContentCuesForm } from "../organisms/profile/ContentCuesForm";
import { LocationsForm } from "../organisms/profile/LocationsForm";
import { CompetitorsForm } from "../organisms/profile/CompetitorsForm";
import { useForm, useStore } from "@tanstack/react-form";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderOverlay } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { isWorkflowActive } from "@/lib/workflow-status";
import {
  parseArrayField,
  cleanWebsiteUrl,
  normalizeWebsiteUrl,
} from "@/utils/utils";
import {
  type NormalizedProfileResult,
} from "@/utils/profile-result";
import {
  buildBusinessProfilePayload,
  mapProfileDataToFormValues as mapBusinessProfileToFormValues,
} from "@/utils/profile-form-mappers";
import { primaryLocationFromProfile, resolvePrimaryLocationFormValue } from "@/utils/primary-location";
import { Button } from "@/components/ui/button";
import { GenericInput } from "@/components/ui/generic-input";
import { Stepper } from "@/components/ui/stepper";
import { ProfileStepCard } from "@/components/ui/profile-step-card";
import { ProfileFormTabs } from "@/components/templates/ProfileFormTabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, Loader2 } from "lucide-react";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { useSubscription } from "@/hooks/use-subscription";
import { useOfferingsExtractor } from "@/hooks/use-offerings-extractor";
import { useProfileAutofillForm } from "@/hooks/use-profile-autofill-form";
import { useToggleBusinessStatus } from "@/hooks/use-linked-businesses";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import {
  BusinessProfile,
  OfferingRow,
  CTARow,
  StakeholderRow,
  LocationRow,
  CompetitorRow,
} from "@/store/business-store";

interface ProfileTemplateProps {
  businessId: string;
  profileData?: BusinessProfile | null;
  jobDetails?: any | null; // Job details from job API
  isLoading?: boolean;
  onUpdateProfile?: (
    payload: any,
    formValues?: any
  ) => Promise<{ jobExistsAfterSave?: boolean } | void>;
}

const PROFILE_STEPPER_STEPS = [
  { id: "basic-details", label: "Basic Details" },
  { id: "content-cues", label: "Content Cues" },
  { id: "competitors", label: "Competitors" },
] as const;

function stableStringify(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map(normalize);
    }
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, entry]) => [key, normalize(entry)])
      );
    }
    return input;
  };

  return JSON.stringify(normalize(value));
}

const basicDetailsSchema = businessInfoSchema.pick({
  website: true,
  businessName: true,
  primaryLocation: true,
  serviceType: true,
  lifetimeValue: true,
  offerings: true,
  offeringsList: true,
});

// Form schema and types are imported from @/schemas/ProfileFormSchema

const ProfileTemplate = ({
  businessId,
  profileData: externalProfileData,
  jobDetails: externalJobDetails,
  isLoading: externalLoading = false,
  onUpdateProfile,
}: ProfileTemplateProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profiles = useBusinessStore((state) => state.profiles);
  const locationOptions = useBusinessStore((state) => state.profileForm.locationOptions);
  const locationsLoading = useBusinessStore((state) => state.profileForm.locationsLoading);
  const currentProfile = profiles.find((p) => p.UniqueId === businessId);
  const [isStrategyConfirmOpen, setIsStrategyConfirmOpen] = useState(false);
  const [isUnlinkBusinessConfirmOpen, setIsUnlinkBusinessConfirmOpen] =
    useState(false);
  const offeringsExtractor = useOfferingsExtractor(businessId);
  const toggleBusinessStatusMutation = useToggleBusinessStatus();

  // Derive whitelist status from profiles (agency-level check)
  const isAgencyWhitelisted = useMemo(() => {
    return profiles.some(profile => profile.isWhitelisted === true);
  }, [profiles]);

  const [isSaving, setIsSaving] = useState(false);
  const [isTriggeringWorkflow, setIsTriggeringWorkflow] = useState(false);
  const [isCheckingPlan, setIsCheckingPlan] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [hasAutofilledProfile, setHasAutofilledProfile] = useState(false);
  const [autofillProfileResult, setAutofillProfileResult] =
    useState<NormalizedProfileResult | null>(null);
  const [hasCreatedJobAfterSave, setHasCreatedJobAfterSave] = useState(false);
  const {
    loading: subscriptionLoading,
    data: subscriptionData,
    handleSubscribeToPlan,
    refetchData: refetchSubscriptionData,
  } = useSubscription({ isWhitelisted: isAgencyWhitelisted });
  const [showSubmitErrors, setShowSubmitErrors] = useState(false);
  const [profileStep, setProfileStep] = useState(0);
  const initialValuesRef = useRef<any>(null);
  const hasChangesRef = useRef(false);
  const [hasChanges, setHasChanges] = useState(false);
  const rafIdRef = useRef<number | null>(null);
  const lastProfileDataRef = useRef<string | null>(null);
  const lastProfileDataStringRef = useRef<string | null>(null);
  // Track the offerings that were just saved to prevent overwriting with stale data
  const lastSavedOfferingsRef = useRef<OfferingRow[] | null>(null);
  const isJobCreated = Boolean(externalJobDetails?.job_id) || hasCreatedJobAfterSave;

  // Helper function to map profile data and job data to form values
  // ALWAYS checks if job exists first - this determines which data source to use
  // If job exists: fill inputs from job API data
  // If no job: fill inputs from business API data
  const mapProfileDataToFormValues = (
    profileData: typeof externalProfileData,
    jobDetails: typeof externalJobDetails
  ): BusinessInfoFormData => {
    // SIMPLIFIED FLOW: Business API is always the source of truth for all fields except offerings
    // Job API only provides offerings data

    if (!profileData) {
      return {
        website: "",
        legalName: "",
        businessName: "",
        businessCategory: "",
        foundingDate: "",
        logoUrl: "",
        siteName: "",
        alternateName: "",
        siteSearchUrlPattern: "",
        businessDescription: "",
        primaryLocation: "",
        serviceAreaType: "city_local",
        serviceAreas: [],
        serviceType: "physical",
        lifetimeValue: "",
        b2bB2c: "",
        segment: "",
        offerings: "products",
        offeringsList: [],
        usps: "",
        ctas: [],
        brandTerms: [],
        stakeholders: [],
        locations: [],
        detailedLocations: [],
        keyPeople: [],
        licensesCompliance: [],
        awardsCertifications: [],
        reviewRating: "",
        reviewCount: "",
        testimonials: [],
        colorsFontsCss: "",
        imagePhotoLibrary: [],
        socialProfiles: [],
        directoryProfiles: [],
        supportEmail: "",
        commsEmail: "",
        competitors: [],
        brandToneSocial: [],
        brandToneWeb: [],
      };
    }

    // Extract primary location from business API (resolve to LocationSelect option value)
    let primaryLocation = "";
    const profileDataAny = profileData as any; // Type assertion for PrimaryLocation
    const locationOptions = useBusinessStore.getState().profileForm.locationOptions;

    if (profileDataAny?.PrimaryLocation) {
      primaryLocation = primaryLocationFromProfile(
        profileDataAny.PrimaryLocation,
        locationOptions
      );
    } else if (profileData?.Locations?.[0]) {
      const loc = profileData.Locations[0] as any;
      primaryLocation = resolvePrimaryLocationFormValue(
        loc.Name || "",
        locationOptions
      );
    }

    // Offerings: ONLY field that comes from job API (if job exists)
    const jobExists = jobDetails && jobDetails.job_id;
    const offeringsList = (() => {
      if (
        jobExists &&
        jobDetails?.offerings &&
        jobDetails.offerings.length > 0
      ) {
        return jobDetails.offerings.map(
          (offering: any): OfferingRow => ({
            name: offering.offering || offering.name || "",
            description: offering.description || "",
            link: offering.url || offering.link || "",
            pricePositioning:
              offering.price_positioning || offering.priceRange || "",
          })
        );
      }
      return [];
    })();

    // ALL OTHER FIELDS come from business API (source of truth)
    const ctasList = parseArrayField((profileData as any).CTAs).map(
      (cta: any): CTARow => ({
        buttonText: cta?.buttonText || "",
        url: cta?.url || "",
      })
    );

    const rawStakeholders = parseArrayField(profileData.CustomerPersonas);
    const rawKeyPeople = parseArrayField((profileData as any).KeyPeople);
    const stakeholdersList = (rawStakeholders.length > 0 ? rawStakeholders : rawKeyPeople).map(
      (person: any): StakeholderRow => ({
        name: person.personName || "",
        title: person.personDescription || person.role || "",
        bio: person.bio || "",
      })
    );

    const locationsList = parseArrayField(profileData.Locations).map(
      (loc: any, index: number): LocationRow => {
        const locationName = loc.DisplayName || `Location ${index + 1}`;
        return {
          name: locationName,
          address: loc.Address1 || "",
          timezone: loc.TimeZone || "",
        };
      }
    );

    const competitorsList = parseArrayField(profileData.Competitors).map(
      (comp: any): CompetitorRow => ({
        url: cleanWebsiteUrl(comp.website || comp.Website),
      })
    );

    const normalizeStringArray = (raw: unknown): string[] => {
      if (!raw) return [];
      if (Array.isArray(raw)) {
        return raw.map((item) => String(item).trim()).filter(Boolean);
      }
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item).trim()).filter(Boolean);
          }
        } catch {
          // ignore
        }
        return raw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return [];
    };

    const normalizeUsps = (raw: unknown): string[] => {
      if (!raw) return [];
      if (Array.isArray(raw)) {
        return raw.map((item) => String(item).trim()).filter(Boolean);
      }
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item).trim()).filter(Boolean);
          }
        } catch {
          // ignore
        }
        return raw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return [];
    };

    const uspsFromJob = normalizeUsps(
      (jobDetails as any)?.usps ?? (jobDetails as any)?.USPs
    );
    const usps = uspsFromJob.join(", ");

    // Brand Voice from business API - convert to lowercase for checkboxes
    // IMPORTANT: Checkboxes in ContentCuesForm expect lowercase values (e.g., "professional", "bold")
    const validOptions = [
      "professional",
      "bold",
      "friendly",
      "innovative",
      "playful",
      "trustworthy",
    ];
    const brandToneSocial = (profileData as any).SocialBrandVoice
      ? (profileData as any).SocialBrandVoice.map((s: string) =>
        s.toLowerCase().trim()
      ).filter((s: string) => validOptions.includes(s))
      : [];

    const brandToneWeb = (profileData as any).WebBrandVoice
      ? (profileData as any).WebBrandVoice.map((s: string) =>
        s.toLowerCase().trim()
      ).filter((s: string) => validOptions.includes(s))
      : [];

    return {
      // All fields from business API (source of truth)
      website: cleanWebsiteUrl(profileData.Website),
      legalName:
        (profileData as any).LegalName ||
        (profileData as any).legalName ||
        (profileData as any).legal_business_name ||
        "",
      businessName: profileData.Name || "",
      businessCategory:
        (profileData as any).BusinessCategory ||
        (profileData as any).business_category ||
        (jobDetails as any)?.business_category ||
        "",
      foundingDate:
        (profileData as any).FoundingDate ||
        (profileData as any).foundingDate ||
        (profileData as any).year_founded ||
        "",
      logoUrl:
        (profileData as any).LogoUrl ||
        (profileData as any).logoUrl ||
        (profileData as any).logo_url ||
        "",
      siteName:
        (profileData as any).SiteName ||
        (profileData as any).siteName ||
        (profileData as any).site_name ||
        "",
      alternateName:
        (profileData as any).AlternateName ||
        (profileData as any).alternateName ||
        (profileData as any).alternate_name ||
        "",
      siteSearchUrlPattern:
        (profileData as any).SiteSearchUrlPattern ||
        (profileData as any).siteSearchUrlPattern ||
        (profileData as any).site_search_url_pattern ||
        "",
      businessDescription:
        profileData.UserDefinedBusinessDescription ||
        profileData.Description ||
        "",
      primaryLocation: primaryLocation,
      serviceAreaType:
        (profileData as any).ServiceAreaType ||
        (profileData as any).service_area_type ||
        (jobDetails as any)?.service_area_type ||
        "",
      serviceAreas: normalizeStringArray(
        (profileData as any).ServiceAreas ??
        (profileData as any).service_areas ??
        (jobDetails as any)?.service_areas
      ),
      serviceType: (() => {
        const objective = profileData.BusinessObjective?.toLowerCase();
        if (objective === "local") return "physical";
        if (objective === "hybrid" || objective === "both") return "both";
        return "online";
      })() as "physical" | "online" | "both",
      lifetimeValue: (() => {
        const ltvFromBusiness = (profileData as any).LTV ?? (profileData as any).ltv;
        const ltvFromJob = (jobDetails as any)?.ltv;
        const ltv = ltvFromBusiness ?? ltvFromJob;
        const s = ltv != null ? String(ltv).trim().toLowerCase() : "";
        return s === "high" || s === "low" ? s : "";
      })(),
      b2bB2c:
        (profileData as any).B2bB2c ||
        (profileData as any).b2b_b2c ||
        (jobDetails as any)?.b2b_b2c ||
        "",
      segment:
        String(
          (profileData as any).Segment ??
            (profileData as any).segment ??
            (jobDetails as any)?.segment ??
            ""
        ),
      offerings: (() => {
        const locationType = profileData.LocationType?.toLowerCase();
        return locationType === "products"
          ? "products"
          : locationType === "services"
            ? "services"
            : locationType === "both"
              ? "both"
              : "products";
      })() as "products" | "services" | "both",
      usps: usps,
      ctas: ctasList,
      brandTerms: (() => {
        const brandTermsFromBusiness =
          (profileData as any).BrandTerms ?? (profileData as any).brand_terms;
        const brandTermsFromJob = (jobDetails as any)?.brand_terms;
        const brandTerms = brandTermsFromBusiness ?? brandTermsFromJob;

        const normalize = (raw: unknown): string[] => {
          if (!raw) return [];
          if (Array.isArray(raw)) {
            return raw.map((t) => String(t).trim()).filter(Boolean);
          }
          if (typeof raw === "string") {
            const s = raw.trim();
            if (!s) return [];
            try {
              const parsed = JSON.parse(s);
              if (Array.isArray(parsed)) {
                return parsed.map((t) => String(t).trim()).filter(Boolean);
              }
            } catch {
              // ignore
            }
            return s
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
          }
          return [];
        };

        return normalize(brandTerms);
      })(),
      stakeholders: stakeholdersList,
      locations: locationsList,
      detailedLocations: parseArrayField((profileData as any).DetailedLocations),
      keyPeople: parseArrayField((profileData as any).KeyPeople),
      licensesCompliance: normalizeStringArray(
        (profileData as any).LicensesCompliance ?? (profileData as any).licenses
      ),
      awardsCertifications: normalizeStringArray(
        (profileData as any).AwardsCertifications ?? (profileData as any).awards
      ),
      reviewRating: String(
        (profileData as any).ReviewRating ??
          (profileData as any).aggregate_rating?.rating ??
          (profileData as any).aggregate_rating?.ratingValue ??
          ""
      ),
      reviewCount: String(
        (profileData as any).ReviewCount ??
          (profileData as any).aggregate_rating?.count ??
          (profileData as any).aggregate_rating?.reviewCount ??
          ""
      ),
      testimonials: normalizeStringArray((profileData as any).Testimonials),
      colorsFontsCss: String((profileData as any).ColorsFontsCss ?? ""),
      imagePhotoLibrary: normalizeStringArray(
        (profileData as any).ImagePhotoLibrary
      ),
      socialProfiles: parseArrayField((profileData as any).SocialProfiles),
      directoryProfiles: parseArrayField((profileData as any).DirectoryProfiles),
      supportEmail: String((profileData as any).SupportEmail ?? ""),
      commsEmail: String((profileData as any).CommsEmail ?? ""),
      competitors: competitorsList,
      brandToneSocial: brandToneSocial,
      brandToneWeb: brandToneWeb,
      // ONLY offerings come from job API (if job exists)
      offeringsList: offeringsList,
    };
  };

  // On page load: Business API is source of truth for all fields except offerings
  // Offerings come from job API if job exists
  const defaultValues = mapBusinessProfileToFormValues(
    externalProfileData || null,
    externalJobDetails || null,
    locationOptions
  );

  const saveProfileValues = useCallback(
    async (value: BusinessInfoFormData) => {
      if (!onUpdateProfile) {
        console.warn("onUpdateProfile not provided");
        return;
      }

      setIsSaving(true);
      try {
        const normalizeUsps = (raw: unknown): string[] => {
          if (!raw) return [];
          if (Array.isArray(raw)) {
            return raw.map((item) => String(item).trim()).filter(Boolean);
          }
          if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item).trim()).filter(Boolean);
              }
            } catch {
              // ignore
            }
            return raw
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
          }
          return [];
        };

        const jobUsps = normalizeUsps(
          (externalJobDetails as any)?.usps ?? (externalJobDetails as any)?.USPs
        );
        const formUsps = value.usps && value.usps.trim()
          ? value.usps
            .split(",")
            ?.map((item: string) => item.trim())
            ?.filter((item: string) => item.length > 0)
          : [];
        const jobExists = Boolean(externalJobDetails && externalJobDetails.job_id);
        const uspsPayload = jobExists
          ? Array.from(
            new Set([
              ...jobUsps,
              ...formUsps,
            ])
          )
          : formUsps;

        const payload = {
          ...buildBusinessProfilePayload(value, {
            autofillResult: autofillProfileResult,
            existingProfile: externalProfileData,
            locationOptions: useBusinessStore.getState().profileForm.locationOptions,
            normalizeWebsite: true,
            businessObjectiveBothValue: "hybrid",
            preserveExistingProfile: true,
          }),
          USPs: uspsPayload.length > 0 ? uspsPayload : null,
          SellingPoints: uspsPayload.length > 0 ? uspsPayload : null,
        };

        // Store offerings that are being saved (ensure proper type - all fields must be strings)
        lastSavedOfferingsRef.current = (value.offeringsList || []).map(
          (off: any): OfferingRow => ({
            name: off.name || "",
            description: off.description || "",
            link: off.link || "",
            pricePositioning: off.pricePositioning || "",
            offeringType: (off as any).offeringType || "",
            priceRange: (off as any).priceRange || "",
            duration: (off as any).duration || "",
            inclusions: (off as any).inclusions || [],
          })
        );

        const updateResult = await onUpdateProfile(payload, value);

        if (updateResult?.jobExistsAfterSave) {
          setHasCreatedJobAfterSave(true);
        }

        // Update initial values after successful save
        initialValuesRef.current = stableStringify(value);
        hasChangesRef.current = false;
        setHasChanges(false);
      } catch (error) {
        // Error toast is handled by the mutation
      } finally {
        setIsSaving(false);
      }
    },
    [
      businessId,
      autofillProfileResult,
      externalProfileData,
      onUpdateProfile,
      setIsSaving,
    ]
  );

  const form = useForm({
    defaultValues,
    validators: {
      onChange: businessInfoSchema as any,
    },
    onSubmit: async ({ value }) => {
      await saveProfileValues(value as BusinessInfoFormData);
    },
  });

  const guardAutofillProfile = useFeatureActionGuard("actions.autofillProfile");
  const guardAcceptPlan = useFeatureActionGuard("actions.acceptPlan");
  const guardSaveProfile = useFeatureActionGuard("profile.save");
  const guardUnlinkBusiness = useFeatureActionGuard("business.unlink");
  const guardSubscribePlan = useFeatureActionGuard("billing.subscribe");
  const guardChangeBillingPlan = useFeatureActionGuard("billing.changePlan");

  const { autofillProfile: handleAutofillProfile, isAutofillLoading } =
    useProfileAutofillForm({
      form,
      locationOptions,
      guard: guardAutofillProfile,
      onBeforeAutofill: (website) => {
        void offeringsExtractor.startExtraction(website).catch(() => {});
      },
      onAutofillSuccess: (profile) => {
        setAutofillProfileResult(profile);
        setHasAutofilledProfile(true);
      },
    });

  // Track job details to detect changes
  const lastJobDetailsRef = useRef<string | null>(null);

  // Update form when external profile data or job details change
  // Job details only affect offerings, but we still need to update when job is created/updated
  useEffect(() => {
    // Don't update form while saving - preserve user's current input
    if (isSaving) {
      return;
    }

      const currentJobDetailsString = externalJobDetails
      ? stableStringify(externalJobDetails)
      : null;
    const jobDetailsChanged =
      lastJobDetailsRef.current !== currentJobDetailsString;

    if (externalProfileData) {
      // Serialize current profile data to detect if it changed
      const currentDataString = stableStringify(externalProfileData);
      const currentProfileId = externalProfileData.UniqueId;
      const isNewProfile = lastProfileDataRef.current !== currentProfileId;
      const isDataChanged =
        lastProfileDataStringRef.current !== currentDataString;

      // Update form if:
      // 1. It's a new profile
      // 2. Profile data changed (business API is source of truth)
      // 3. Job details changed (important: job creation affects offerings)
      // 4. We haven't initialized yet
      if (
        isNewProfile ||
        isDataChanged ||
        jobDetailsChanged ||
        !initialValuesRef.current
      ) {
        const mappedValues = mapBusinessProfileToFormValues(
          externalProfileData,
          externalJobDetails,
          locationOptions
        );

        // IMPORTANT: Preserve current offeringsList if user has made changes or just saved
        // Only update offeringsList from API if:
        // 1. Form hasn't been initialized yet, OR
        // 2. Current form has no offerings (empty array), OR
        // 3. The new API data is different from what was just saved (avoid stale data overwrite)
        const currentOfferings = form.state.values.offeringsList || [];
        const hasUserOfferings =
          currentOfferings.length > 0 &&
          currentOfferings.some((off: any) => off?.name?.trim());

        // Check if the new API offerings match what was just saved
        const newApiOfferings = mappedValues.offeringsList || [];
        const apiOfferingsMatchSaved =
          lastSavedOfferingsRef.current &&
          newApiOfferings.length === lastSavedOfferingsRef.current.length &&
          newApiOfferings.every((apiOff: any, idx: number) => {
            const savedOff = lastSavedOfferingsRef.current![idx];
            return (
              apiOff.name === savedOff.name &&
              apiOff.description === savedOff.description &&
              apiOff.link === savedOff.link
            );
          });

        // Only update offeringsList if:
        // - No user offerings exist, OR
        // - Form not initialized, OR
        // - API data doesn't match what was just saved (means it's fresh data)
        const shouldUpdateOfferings =
          !hasUserOfferings ||
          !initialValuesRef.current ||
          !apiOfferingsMatchSaved;

        if (shouldUpdateOfferings) {
          // Set form values for each field individually to ensure they update
          Object.entries(mappedValues).forEach(([key, value]) => {
            form.setFieldValue(key as any, value as any);
          });
        } else {
          // Preserve user's offerings, only update other fields
          Object.entries(mappedValues).forEach(([key, value]) => {
            if (key !== "offeringsList") {
              form.setFieldValue(key as any, value as any);
            }
          });
        }

        Object.keys(mappedValues).forEach((key) => {
          form.setFieldMeta(key as any, (prev: any) => ({
            ...prev,
            isTouched: false,
          }));
        });

        // Clear the saved offerings ref after processing (so next update can proceed normally)
        if (apiOfferingsMatchSaved) {
          lastSavedOfferingsRef.current = null;
        }

        const baselineValues = shouldUpdateOfferings
          ? mappedValues
          : {
            ...mappedValues,
            offeringsList: currentOfferings,
          };
        initialValuesRef.current = stableStringify(baselineValues);
        hasChangesRef.current = false;
        setHasChanges(false);
        lastProfileDataRef.current = currentProfileId;
        lastProfileDataStringRef.current = currentDataString;
        lastJobDetailsRef.current = currentJobDetailsString;
      }
    } else if (!externalProfileData && initialValuesRef.current) {
      // If profile data is cleared, reset the form
      initialValuesRef.current = null;
      lastProfileDataRef.current = null;
      lastProfileDataStringRef.current = null;
      lastJobDetailsRef.current = null;
    }
  }, [externalProfileData, externalJobDetails, form, isSaving, locationOptions]);

  // Re-resolve primary location once options load (saved API labels -> select values)
  useEffect(() => {
    if (isSaving || locationsLoading || !externalProfileData) return;

    const hasSelectableOptions = locationOptions.some(
      (opt) => !opt.disabled && opt.value !== ""
    );
    if (!hasSelectableOptions) return;

    const resolved = primaryLocationFromProfile(
      (externalProfileData as any).PrimaryLocation,
      locationOptions
    );
    if (!resolved) return;

    const current = String(form.state.values.primaryLocation || "");
    const currentIsValid = locationOptions.some(
      (opt) => !opt.disabled && opt.value !== "" && opt.value === current
    );

    if (!currentIsValid && resolved !== current) {
      form.setFieldValue("primaryLocation", resolved);
      form.setFieldMeta("primaryLocation", (prev: any) => ({
        ...prev,
        isTouched: false,
      }));
      initialValuesRef.current = stableStringify({
        ...form.state.values,
        primaryLocation: resolved,
      });
      hasChangesRef.current = false;
      setHasChanges(false);
    }
  }, [
    externalProfileData,
    form,
    isSaving,
    locationOptions,
    locationsLoading,
  ]);

  // Store initial values on mount (only once)
  useEffect(() => {
    if (!initialValuesRef.current) {
      initialValuesRef.current = stableStringify(form.state.values);
    }
  }, []);

  useEffect(() => {
    if (externalJobDetails?.job_id) {
      setHasCreatedJobAfterSave(true);
      return;
    }

    setHasCreatedJobAfterSave(false);
  }, [businessId, externalJobDetails?.job_id]);

  // Use form store subscription for real-time change detection
  // Optimized: Batches updates using requestAnimationFrame to avoid excessive JSON.stringify calls
  // This provides instant visual feedback while maintaining good performance
  const formValues = useStore(form.store, (state) => state.values);

  // Optimized change detection: Batch comparisons using requestAnimationFrame
  // This prevents JSON.stringify from running on every single keystroke
  // while still feeling instant to the user (updates within 16ms frame budget)
  useEffect(() => {
    if (!initialValuesRef.current) {
      setHasChanges(false);
      return;
    }

    // Cancel any pending comparison
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Schedule comparison on next animation frame (batches rapid updates)
    // This means if user types 10 characters quickly, we only compare once
    rafIdRef.current = requestAnimationFrame(() => {
      const currentValuesString = stableStringify(formValues);
      const hasChangesValue = currentValuesString !== initialValuesRef.current;

      // Only update state if it actually changed (prevents unnecessary re-renders)
      if (hasChangesRef.current !== hasChangesValue) {
        hasChangesRef.current = hasChangesValue;
        setHasChanges(hasChangesValue);
      }
      rafIdRef.current = null;
    });

    // Cleanup on unmount or when formValues changes before RAF executes
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [formValues]);

  // Handle Save Changes - memoized to prevent re-renders
  const handleSaveChanges = useCallback(async () => {
    if (!guardSaveProfile()) return;

    setShowSubmitErrors(true);

    // Force field-level errors to render (GenericInput only shows errors when touched/has value)
    const values = form.state.values as Record<string, unknown>;
    Object.keys(values).forEach((key) => {
      form.setFieldMeta(key as any, (prev: any) => ({
        ...prev,
        isTouched: true,
      }));
    });

    const parsed = businessInfoSchema.safeParse(form.state.values);
    if (!parsed.success) {
      toast.error("Please fix the highlighted fields before saving.");
      return;
    }

    await saveProfileValues(parsed.data as BusinessInfoFormData);
  }, [form, guardSaveProfile, saveProfileValues]);

  const getPlanTypeFromData = useCallback(
    (data: any) => {
      if (data?.status === "canceled") return "no_plan";
      const raw =
        currentProfile?.SubscriptionItems?.plan_type ||
        (externalProfileData as any)?.SubscriptionItems?.plan_type ||
        data?.plan_type ||
        data?.planType ||
        data?.plan;
      if (!raw) return "";
      return String(raw).toLowerCase();
    },
    [currentProfile, externalProfileData]
  );

  // Handle Confirm & Proceed - trigger workflow API and navigate to strategy
  const handleConfirmAndProceed = useCallback(async () => {
    if (!businessId) {
      toast.error("Business ID is required");
      return;
    }

    // Check if job exists (required before triggering workflow)
    if (!externalJobDetails?.job_id) {
      toast.error("Please add offerings to create a job first");
      return;
    }

    try {
      setIsCheckingPlan(true);

      // Check whitelist status first (agency-level)
      if (!isAgencyWhitelisted) {
        // For non-whitelisted users, check subscription and plan level
        const latestSubscription = await refetchSubscriptionData();
        const effectiveSubscription = latestSubscription ?? subscriptionData;
        const isCanceled = effectiveSubscription?.status === "canceled";

        if (isCanceled) {
          setPlanModalOpen(true);
          return;
        }

        const planType = getPlanTypeFromData(effectiveSubscription);
        const planLevels: Record<string, number> = {
          no_plan: 0,
          starter: 1,
          core: 2,
          growth: 3,
        };
        const level = planLevels[planType] ?? 0;
        const hasAboveStarterPlan = level > planLevels.starter;

        if (!hasAboveStarterPlan) {
          setPlanModalOpen(true);
          return;
        }
      }

      setIsTriggeringWorkflow(true);

      // Call trigger workflow API
      const response = await api.post<{
        success?: boolean;
        [key: string]: any;
      }>("/jobs/run", "python", {
        business_id: businessId,
      });

      // Validate response (matching old repo pattern)
      if (response) {
        toast.success("Workflow triggered successfully!");

        // Invalidate job query cache to ensure fresh workflow status when user returns
        // This is more efficient than always refetching - only refetches when needed
        queryClient.invalidateQueries({
          queryKey: ["jobs", "detail", businessId],
        });

        // Navigate to strategy page after successful API call
        router.push(`/business/${businessId}/strategy`);
      }
    } catch (error: unknown) {
      // Improved error handling with better type safety
      let errorMessage = "Unknown error";

      if (error && typeof error === "object") {
        const axiosError = error as {
          response?: { data?: { detail?: string } };
          message?: string;
        };
        errorMessage =
          axiosError?.response?.data?.detail ||
          axiosError?.message ||
          errorMessage;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      toast.error(`Error triggering workflow: ${errorMessage}`);
    } finally {
      setIsCheckingPlan(false);
      setIsTriggeringWorkflow(false);
    }
  }, [
    businessId,
    externalJobDetails,
    router,
    refetchSubscriptionData,
    subscriptionData,
    getPlanTypeFromData,
  ]);

  const businessName = useMemo(() => {
    const profile = profiles.find((p) => p.UniqueId === businessId);
    return profile?.Name || profile?.DisplayName || "Business";
  }, [profiles, businessId]);

  const isTrialActive =
    ((externalProfileData as any)?.isTrialActive ??
      (currentProfile as any)?.isTrialActive) === true;

  const remainingTrialDays =
    typeof (externalProfileData as any)?.remainingTrialDays === "number"
      ? (externalProfileData as any).remainingTrialDays
      : typeof (currentProfile as any)?.remainingTrialDays === "number"
        ? (currentProfile as any).remainingTrialDays
        : undefined;

  const getCurrentPlanLabel = useCallback((planType?: string | null) => {
    if (!planType) return "No Plan";
    if (planType.toLowerCase() === "no_plan") return "No Plan";
    return planType.charAt(0).toUpperCase() + planType.slice(1).toLowerCase();
  }, []);

  const getPlanAlertMessage = useCallback(
    (currentPlan: string) => {
      if (isTrialActive) {
        const trialDaysMessage =
          typeof remainingTrialDays === "number" && remainingTrialDays > 0
            ? ` Your trial expires in ${remainingTrialDays} day${remainingTrialDays === 1 ? "" : "s"}.`
            : "";
        return `You're on a free trial. Upgrade to access this feature.${trialDaysMessage}`;
      }

      if (currentPlan === "No Plan") {
        return "Upgrade to Core to access this feature.";
      }

      return `You're on ${currentPlan}. Upgrade to Core to access this feature.`;
    },
    [isTrialActive, remainingTrialDays]
  );

  // Memoize breadcrumbs to prevent re-renders
  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Profile", href: `/business/${businessId}/profile` },
    ],
    [businessName, businessId]
  );
  const profileTabValue =
    PROFILE_STEPPER_STEPS[profileStep]?.id ?? PROFILE_STEPPER_STEPS[0].id;

  const profileForInitialFillCheck = externalProfileData || currentProfile;
  const hasPersistedProfileCore = useMemo(() => {
    const profile = profileForInitialFillCheck as any;
    if (!profile) return false;

    const primaryLocation = profile.PrimaryLocation;
    const hasPrimaryLocation =
      Boolean(String(primaryLocation?.Location || "").trim()) ||
      Boolean(String(primaryLocation?.Country || "").trim()) ||
      Boolean(String(profile.ProfileLocation || "").trim()) ||
      Boolean(String(profile.Locations?.[0]?.Name || "").trim());

    return (
      Boolean(String(profile.Website || "").trim()) &&
      Boolean(String(profile.Name || profile.DisplayName || "").trim()) &&
      hasPrimaryLocation &&
      Boolean(String(profile.BusinessObjective || "").trim()) &&
      Boolean(String(profile.LocationType || "").trim())
    );
  }, [profileForInitialFillCheck]);

  const isFirstProfileFill = !isJobCreated && !hasPersistedProfileCore;
  const showFirstFillStepper = isFirstProfileFill;

  // Check if workflow is currently processing
  const isWorkflowProcessing = useMemo(() => {
    return isWorkflowActive(externalJobDetails);
  }, [externalJobDetails]);

  const handleAutofillProfileClick = useCallback(async () => {
    if (!String((form.state.values as any)?.serviceAreaType || "").trim()) {
      form.setFieldValue("serviceAreaType" as any, "city_local" as any);
    }

    await handleAutofillProfile();
  }, [form, handleAutofillProfile]);

  const isAutofillProfileDisabled =
    isAutofillLoading ||
    offeringsExtractor.isExtracting ||
    !(formValues?.website ?? "").toString().trim() ||
    !(formValues?.primaryLocation ?? "").toString().trim();

  const isSaveChangesAction = !isJobCreated || hasChanges;

  // Always prioritize showing "Save Changes" when there are changes, regardless of workflow state
  const buttonText = isSaveChangesAction
    ? isSaving
      ? "Saving..."
      : "Save Changes"
    : isCheckingPlan
      ? "Checking Plan..."
      : isTriggeringWorkflow
        ? "Starting your analysis..."
        : isWorkflowProcessing
          ? "Workflow Processing..."
          : "Confirm & Proceed to Strategy";

  // Check if CTAs have validation errors
  const hasCtaValidationErrors = useStore(form.store, (state: any) => {
    const ctasMeta = state.fieldMeta?.ctas;
    return ctasMeta?.hasValidationErrors === true;
  });

  // Check if offerings have validation errors
  const hasOfferingsValidationErrors = useStore(form.store, (state: any) => {
    const offeringsMeta = state.fieldMeta?.offeringsList;
    return offeringsMeta?.hasValidationErrors === true;
  });

  const hasBasicDetailsSchemaValidationErrors = useMemo(() => {
    return !basicDetailsSchema.safeParse(formValues).success;
  }, [formValues]);

  const hasBasicDetailsValidationErrors =
    hasBasicDetailsSchemaValidationErrors || hasOfferingsValidationErrors;

  const isAutofillGateActive = isFirstProfileFill && !hasAutofilledProfile;
  const canAdvanceFromStep0 =
    !isAutofillGateActive &&
    !hasBasicDetailsValidationErrors;

  const isAutofillWorkflowInProgress =
    isAutofillLoading || offeringsExtractor.isExtracting;

  const hasSchemaValidationErrors = useMemo(() => {
    return !businessInfoSchema.safeParse(formValues).success;
  }, [formValues]);

  // Combine all validation errors
  const hasAnyValidationErrors =
    hasSchemaValidationErrors || hasCtaValidationErrors || hasOfferingsValidationErrors;

  const canAdvanceFromStep1 = !hasAnyValidationErrors;

  // Disable button logic:
  // - For "Save Changes": disable if loading, saving, or has any validation errors
  // - For "Confirm & Proceed": disable if loading, saving, triggering, workflow processing, or no job exists
  const isButtonDisabled = isSaveChangesAction
    ? externalLoading ||
      isSaving ||
      isAutofillWorkflowInProgress ||
      hasAnyValidationErrors
    : externalLoading ||
    isSaving ||
      isAutofillWorkflowInProgress ||
    isCheckingPlan ||
    isTriggeringWorkflow ||
    isWorkflowProcessing || // Disable if workflow is already processing
    !externalJobDetails?.job_id; // Require job to exist before proceeding

  const buttonHelperText = useMemo(() => {
    if (!isButtonDisabled) return undefined;

    if (isSaveChangesAction) {
      if (externalLoading) return "Please wait for the profile to finish loading.";
      if (isSaving) return "Saving in progress.";
      if (isAutofillWorkflowInProgress) return "Autofill is in progress. Please wait.";
      if (hasAnyValidationErrors) return "Fix the highlighted fields to enable saving.";
      return "Unable to save right now.";
    }

    if (!externalJobDetails?.job_id) return "Add offerings first to proceed to Strategy.";
    if (isWorkflowProcessing) return "Workflows are under process. Please wait till they are done.";
    if (isAutofillWorkflowInProgress) return "Autofill is in progress. Please wait.";
    if (isCheckingPlan) return "Checking your plan...";
    if (isTriggeringWorkflow) return "Triggering workflow...";
    if (externalLoading) return "Please wait for the profile to finish loading.";
    if (isSaving) return "Saving in progress.";
    return "Unable to proceed right now.";
  }, [
    isButtonDisabled,
    isSaveChangesAction,
    externalLoading,
    isSaving,
    isAutofillWorkflowInProgress,
    hasAnyValidationErrors,
    externalJobDetails?.job_id,
    isWorkflowProcessing,
    isCheckingPlan,
    isTriggeringWorkflow,
  ]);

  const handleStepperStepClick = useCallback(
    (nextStep: number) => {
      if (nextStep <= profileStep) {
        setProfileStep(nextStep);
        return;
      }

      if (profileStep === 0) {
        if (isAutofillGateActive) {
          toast.error("Please use Autofill Profile before continuing.");
          return;
        }
        if (hasBasicDetailsValidationErrors) {
          toast.error("Please fix the highlighted fields before continuing.");
          (["website", "businessName", "primaryLocation"] as const).forEach((key) => {
            form.setFieldMeta(key as any, (prev: any) => ({
              ...prev,
              isTouched: true,
            }));
          });
          return;
        }
      }

      if (profileStep === 1 && !canAdvanceFromStep1) {
        toast.error("Please fix the highlighted fields before continuing.");
        return;
      }

      setProfileStep(nextStep);
    },
    [
      form,
      hasBasicDetailsValidationErrors,
      canAdvanceFromStep1,
      isAutofillGateActive,
      profileStep,
    ]
  );

  const handlePrimaryButtonClick = useCallback(async () => {
    if (isSaveChangesAction) {
      try {
        await handleSaveChanges();
      } catch (e) {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }

    if (!guardAcceptPlan()) return;
    setIsStrategyConfirmOpen(true);
  }, [handleSaveChanges, isSaveChangesAction, guardAcceptPlan]);

  // Determine loading state and message
  const isLoading =
    externalLoading || isSaving || isTriggeringWorkflow || isAutofillLoading;
  const loadingMessage = useMemo(() => {
    if (isAutofillLoading) return "Autofilling profile...";
    if (isTriggeringWorkflow) return "Triggering workflow...";
    if (isSaving) return "Saving changes...";
    if (externalLoading) return "Loading profile data...";
    return undefined;
  }, [isAutofillLoading, isTriggeringWorkflow, isSaving, externalLoading]);

  const currentPlanLabel = useMemo(() => {
    const planType = getPlanTypeFromData(subscriptionData);
    return getCurrentPlanLabel(planType);
  }, [getPlanTypeFromData, getCurrentPlanLabel, subscriptionData]);

  const planAlertMessage = useMemo(
    () => getPlanAlertMessage(currentPlanLabel),
    [getPlanAlertMessage, currentPlanLabel]
  );

  const handlePlanSelect = useCallback(
    async (planName: string, action: "UPGRADE" | "DOWNGRADE" | "SUBSCRIBE") => {
      if (action === "SUBSCRIBE") {
        if (!guardSubscribePlan()) return;
      } else if (!guardChangeBillingPlan()) {
        return;
      }

      const business = currentProfile || externalProfileData;
      if (!business) return;
      await handleSubscribeToPlan({
        business,
        planName,
        action,
        closeAllModals: () => setPlanModalOpen(false),
      });
    },
    [currentProfile, externalProfileData, guardChangeBillingPlan, guardSubscribePlan, handleSubscribeToPlan]
  );

  const businessForUnlink = externalProfileData || currentProfile;
  const canUnlinkBusiness =
    Boolean(businessForUnlink?.Id) && businessForUnlink?.IsActive !== false;

  const handleConfirmUnlinkBusiness = useCallback(async () => {
    if (!guardUnlinkBusiness()) return;

    if (!businessForUnlink?.Id) {
      toast.error("Unable to unlink business", {
        description: "Business details are still loading. Please try again.",
      });
      return;
    }

    await toggleBusinessStatusMutation.mutateAsync({
      business: {
        siteUrl: businessForUnlink.Website || "",
        displayName:
          businessForUnlink.DisplayName || businessForUnlink.Name || "Business",
        authId: businessForUnlink.LinkedAuthId || "",
        businessProfile: {
          Id: businessForUnlink.Id,
          UniqueId: businessForUnlink.UniqueId || businessId,
          IsActive: businessForUnlink.IsActive !== false,
        },
      },
    });
    setIsUnlinkBusinessConfirmOpen(false);
    queryClient.invalidateQueries({
      queryKey: ["businessProfiles", "detail", businessId],
    });
    router.push("/");
  }, [
    businessForUnlink,
    businessId,
    guardUnlinkBusiness,
    queryClient,
    router,
    toggleBusinessStatusMutation,
  ]);

  const unlinkBusinessFooter = canUnlinkBusiness ? (
    <div className="flex justify-end">
      <Button
        type="button"
        variant="destructive"
        onClick={() => {
          if (!guardUnlinkBusiness()) return;
          setIsUnlinkBusinessConfirmOpen(true);
        }}
        disabled={externalLoading || toggleBusinessStatusMutation.isPending}
      >
        {toggleBusinessStatusMutation.isPending
          ? "Unlinking..."
          : "Unlink Business"}
      </Button>
    </div>
  ) : null;

  return (
    <div
      className={cn(
        // NOTE: This page is rendered inside `SidebarInset` which already controls
        // viewport height + scrolling. Using `dvh` here can cause layout jumps on
        // first interaction when browsers recalc dynamic viewport units.
        "flex flex-col h-full min-h-0 relative overflow-hidden"
      )}
    >
      <PlanModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        currentPlan={currentPlanLabel}
        showFooterButtons={true}
        showAlertBar={true}
        alertSeverity="error"
        alertMessage={planAlertMessage}
        isDescription={false}
        onSelectPlan={handlePlanSelect}
        loading={subscriptionLoading}
      />
      <LoaderOverlay
        isLoading={isLoading || toggleBusinessStatusMutation.isPending}
        message={
          toggleBusinessStatusMutation.isPending
            ? "Unlinking business..."
            : loadingMessage
        }
      >
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          {/* Sticky Page Header */}
          <div className="sticky top-0 z-10 shrink-0 bg-background">
            <PageHeader
              breadcrumbs={breadcrumbs}
              showAskMassic={Boolean(externalJobDetails?.job_id)}
            />
          </div>

          {/* Content area: takes remaining height, scroll lives inside form column */}
          <div className="flex-1 flex min-h-0 overflow-hidden min-w-0">
            <div className="w-full max-w-[1224px] flex gap-6 p-5 items-stretch min-h-0 min-w-0 flex-1">
          <div className="flex-1 flex flex-col gap-7 min-h-0 min-w-0 overflow-hidden">
            {showFirstFillStepper ? (
              <Stepper
                steps={[...PROFILE_STEPPER_STEPS]}
                currentStep={profileStep}
                onStepClick={handleStepperStepClick}
                isStepEnabled={(idx) => {
                  if (idx <= profileStep) return true;
                  if (idx === 1) return canAdvanceFromStep0;
                  if (idx === 2) return canAdvanceFromStep0 && canAdvanceFromStep1;
                  return true;
                }}
                className="shrink-0"
              />
            ) : null}

            {showFirstFillStepper ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit();
                }}
                className="flex flex-col gap-0 flex-1 min-h-0 overflow-hidden"
              >
                  {profileStep === 0 && (
                    <ProfileStepCard
                      title={isAutofillGateActive ? "Let's set up your profile" : "Basic Details"}
                      description={
                        isAutofillGateActive
                          ? "Enter your website URL and primary location, then click Autofill Profile — we'll take care of the rest."
                          : "Helps us understand who you are and how to tailor insights, benchmarks, and strategy to your business."
                      }
                      className="flex-1"
                      scrollableContent
                      footer={unlinkBusinessFooter}
                      rightAction={
                        !isAutofillGateActive ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block">
                                <Button
                                  type="button"
                                  className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                                  disabled={!canAdvanceFromStep0}
                                  onClick={() =>
                                    setProfileStep((s) => Math.min(2, s + 1))
                                  }
                                >
                                  Next
                                  <ChevronRight className="size-4 shrink-0" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                          </Tooltip>
                        ) : undefined
                      }
                    >
                      <BusinessInfoForm
                        form={form}
                        embedded
                        embeddedVariant={isAutofillGateActive ? "autofillGate" : "full"}
                        disableWebsiteLock={isAutofillGateActive}
                        primaryLocationAction={
                          isAutofillGateActive ? (
                            <Button
                              type="button"
                              onClick={handleAutofillProfileClick}
                              disabled={isAutofillProfileDisabled}
                              className="w-full gap-2"
                            >
                              {isAutofillLoading ? (
                                <>
                                  <Loader2 className="size-4 animate-spin" />
                                  Autofilling...
                                </>
                              ) : (
                                "Autofill Profile"
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="default"
                              onClick={handleAutofillProfileClick}
                              disabled={isAutofillProfileDisabled}
                              className="gap-2 border-general-border-three text-general-foreground"
                            >
                              {isAutofillLoading ? (
                                <>
                                  <Loader2 className="size-4 animate-spin" />
                                  Autofilling...
                                </>
                              ) : (
                                "Autofill Profile"
                              )}
                            </Button>
                          )
                        }
                      />
                      {!isAutofillGateActive && (
                        <>
                          <OfferingsForm
                            form={form}
                            businessId={businessId}
                            embedded
                            hideFetchOfferingsFromWebsite
                            extractionController={offeringsExtractor}
                            restrictFetchOfferings
                          />
                          <div className="w-1/2">
                            <GenericInput<BusinessInfoFormData>
                              form={form as any}
                              fieldName="businessDescription"
                              type="textarea"
                              className="min-h-[160px]"
                              label={
                                <>
                                  Anything else we should know about your business?{" "}
                                  <span className="text-general-muted-foreground font-normal">
                                    (optional)
                                  </span>
                                </>
                              }
                              placeholder="Provide any additional info"
                              rows={6}
                            />
                          </div>
                        </>
                      )}
                    </ProfileStepCard>
                  )}
                  {profileStep === 1 && (
                    <ProfileStepCard
                      title="Content Cues"
                      description="Guides tone, messaging, and calls-to-action so content sounds like you and converts better."
                      className="flex-1"
                      scrollableContent
                      footer={unlinkBusinessFooter}
                      rightAction={
                        <Button
                          type="button"
                          className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                          disabled={!canAdvanceFromStep1}
                          onClick={() =>
                            setProfileStep((s) => Math.min(2, s + 1))
                          }
                        >
                          Next
                          <ChevronRight className="size-4 shrink-0" />
                        </Button>
                      }
                    >
                      <ContentCuesForm form={form} embedded />
                      <LocationsForm form={form} embedded />
                    </ProfileStepCard>
                  )}
                  {profileStep === 2 && (
                    <ProfileStepCard
                      title="Competitors"
                      description="Gives context on your landscape so we can spot gaps, differentiation, and growth opportunities."
                      className="flex-1"
                      scrollableContent
                      footer={unlinkBusinessFooter}
                      rightAction={
                        <Button
                          type="button"
                          className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                          onClick={handlePrimaryButtonClick}
                          disabled={isButtonDisabled}
                          title={buttonHelperText}
                        >
                          {buttonText}
                          <ChevronRight className="size-4 shrink-0" />
                        </Button>
                      }
                    >
                      <CompetitorsForm form={form} embedded />
                    </ProfileStepCard>
                  )}
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit();
                }}
                className="flex flex-col gap-0 flex-1 min-h-0 overflow-hidden"
              >
                <ProfileFormTabs
                  form={form}
                  businessId={businessId}
                  value={profileTabValue}
                  onValueChange={(value) => {
                    const nextIndex = PROFILE_STEPPER_STEPS.findIndex(
                      (step) => step.id === value
                    );
                    setProfileStep(nextIndex >= 0 ? nextIndex : 0);
                  }}
                  footer={unlinkBusinessFooter}
                  hideFetchOfferingsFromWebsite
                  restrictFetchOfferings
                  extractionController={offeringsExtractor}
                  includeBusinessDescription
                  primaryLocationAction={
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={handleAutofillProfileClick}
                      disabled={isAutofillProfileDisabled}
                      className="gap-2 border-general-border-three text-general-foreground"
                    >
                      {isAutofillLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Autofilling...
                        </>
                      ) : (
                        "Autofill Profile"
                      )}
                    </Button>
                  }
                  rightAction={
                    <Button
                      type="button"
                      className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                      onClick={handlePrimaryButtonClick}
                      disabled={isButtonDisabled}
                      title={buttonHelperText}
                    >
                      {buttonText}
                      <ChevronRight className="size-4 shrink-0" />
                    </Button>
                  }
                />
              </form>
            )}
          </div>
            </div>
        </div>
        </div>

        {/* Confirm & Proceed to Strategy Modal */}
        <AlertDialog open={isStrategyConfirmOpen} onOpenChange={setIsStrategyConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm & Proceed to Strategy</AlertDialogTitle>
              <AlertDialogDescription>
                This will trigger deep analysis of search data and build strategy for this business. It may take upto an hour.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={
                  isTriggeringWorkflow ||
                  isCheckingPlan ||
                  isAutofillWorkflowInProgress
                }
              >
                Do Later
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  onClick={async () => {
                    if (!guardAcceptPlan()) return;
                    setIsStrategyConfirmOpen(false);
                    try {
                      await handleConfirmAndProceed();
                    } catch (e) {
                      toast.error("Something went wrong. Please try again.");
                    }
                  }}
                  disabled={
                    isTriggeringWorkflow ||
                    isCheckingPlan ||
                    isAutofillWorkflowInProgress
                  }
                >
                  Confirm
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={isUnlinkBusinessConfirmOpen}
          onOpenChange={setIsUnlinkBusinessConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unlink Business</AlertDialogTitle>
              <AlertDialogDescription>
                Unlinking this business will deactivate it, cancel any associated
                subscription, and remove it from your profile along with all linked
                accounts (GSC, GA4, GBP). This impacts your strategy and execution.
                Only do this if your business goals have significantly changed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={toggleBusinessStatusMutation.isPending}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  onClick={handleConfirmUnlinkBusiness}
                  disabled={toggleBusinessStatusMutation.isPending}
                >
                  {toggleBusinessStatusMutation.isPending
                    ? "Please wait..."
                    : "Unlink"}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </LoaderOverlay>
    </div>
  );
};

export default ProfileTemplate;
