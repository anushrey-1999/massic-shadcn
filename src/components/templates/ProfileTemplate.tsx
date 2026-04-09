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
import {
  parseArrayField,
  cleanWebsiteUrl,
  normalizeWebsiteUrl,
} from "@/utils/utils";
import { getAutofillErrorMessage } from "@/utils/profile-autofill";
import { Button } from "@/components/ui/button";
import { GenericInput } from "@/components/ui/generic-input";
import { Stepper } from "@/components/ui/stepper";
import { ProfileStepCard } from "@/components/ui/profile-step-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, Loader2 } from "lucide-react";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { useSubscription } from "@/hooks/use-subscription";
import { useOfferingsExtractor } from "@/hooks/use-offerings-extractor";
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
  CalendarEventRow,
} from "@/store/business-store";

interface ProfileAutofillResponse {
  business_url?: string;
  profile_autofill?: {
    business_name?: string;
    url?: string;
    market?: string;
    ltv?: string;
    sell?: string;
    b2b_b2c?: string;
    competitors?: string[];
    segment?: number;
    ctas?: Array<{ text?: string; url?: string }>;
    brand_terms?: string[];
    web_tone?: string[];
    social_tone?: string[];
    error?: string | null;
    reason?: string | null;
    recommendation?: string | null;
    [key: string]: unknown;
  };
  errors?: string | string[] | null;
  error?: string | null;
  message?: string | null;
  detail?: string | null;
}

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
  const currentProfile = profiles.find((p) => p.UniqueId === businessId);
  const [isStrategyConfirmOpen, setIsStrategyConfirmOpen] = useState(false);
  const offeringsExtractor = useOfferingsExtractor(businessId);

  // Derive whitelist status from profiles (agency-level check)
  const isAgencyWhitelisted = useMemo(() => {
    return profiles.some(profile => profile.isWhitelisted === true);
  }, [profiles]);

  const [isSaving, setIsSaving] = useState(false);
  const [isAutofillLoading, setIsAutofillLoading] = useState(false);
  const [isTriggeringWorkflow, setIsTriggeringWorkflow] = useState(false);
  const [isCheckingPlan, setIsCheckingPlan] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [hasAutofilledProfile, setHasAutofilledProfile] = useState(false);
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
        businessName: "",
        businessDescription: "",
        primaryLocation: "",
        serviceType: "physical",
        lifetimeValue: "",
        offerings: "products",
        offeringsList: [],
        usps: "",
        ctas: [],
        brandTerms: [],
        stakeholders: [],
        locations: [],
        competitors: [],
        calendarEvents: [],
        brandToneSocial: [],
        brandToneWeb: [],
      };
    }

    // Extract primary location from business API
    let primaryLocation = "";
    const profileDataAny = profileData as any; // Type assertion for PrimaryLocation
    if (profileDataAny?.PrimaryLocation) {
      const loc = profileDataAny.PrimaryLocation;
      if (loc.Location) {
        // Only append country if it's different from location to avoid duplication
        const location = loc.Location;
        const country = loc.Country || "";
        primaryLocation =
          country && country.toLowerCase() !== location.toLowerCase()
            ? `${location},${country}`
            : location;
      }
    } else if (profileData?.Locations?.[0]) {
      const loc = profileData.Locations[0] as any;
      primaryLocation = loc.Name || "";
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

    const stakeholdersList = parseArrayField(profileData.CustomerPersonas).map(
      (person: any): StakeholderRow => ({
        name: person.personName || "",
        title: person.personDescription || "",
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

    const calendarEventsList = parseArrayField((profileData as any).CalendarEvents).map(
      (event: any): CalendarEventRow => ({
        eventName: event.eventName || "",
        startDate: event.startDate || null,
        endDate: event.endDate || null,
      })
    );

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
      businessName: profileData.Name || "",
      businessDescription:
        profileData.UserDefinedBusinessDescription ||
        profileData.Description ||
        "",
      primaryLocation: primaryLocation,
      serviceType: (() => {
        const objective = profileData.BusinessObjective?.toLowerCase();
        if (objective === "local") return "physical";
        if (objective === "hybrid") return "both";
        return "online";
      })() as "physical" | "online" | "both",
      lifetimeValue: (() => {
        const ltvFromBusiness = (profileData as any).LTV ?? (profileData as any).ltv;
        const ltvFromJob = (jobDetails as any)?.ltv;
        const ltv = ltvFromBusiness ?? ltvFromJob;
        const s = ltv != null ? String(ltv).trim().toLowerCase() : "";
        return s === "high" || s === "low" ? s : "";
      })(),
      offerings: (() => {
        const locationType = profileData.LocationType?.toLowerCase();
        return locationType === "products"
          ? "products"
          : locationType === "services"
            ? "services"
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
      competitors: competitorsList,
      calendarEvents: calendarEventsList,
      brandToneSocial: brandToneSocial,
      brandToneWeb: brandToneWeb,
      // ONLY offerings come from job API (if job exists)
      offeringsList: offeringsList,
    };
  };

  // On page load: Business API is source of truth for all fields except offerings
  // Offerings come from job API if job exists
  const defaultValues = mapProfileDataToFormValues(
    externalProfileData || null,
    externalJobDetails || null // Only used for offerings if job exists
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

        // Map form values to API payload structure
        // Spread existing profile data to preserve all fields, then update specific ones
        const locationParts = value.primaryLocation.split(",");
        const location = locationParts[0]?.trim() || "";
        const country = locationParts[1]?.trim() || "united states";

        const payload = {
          ...externalProfileData, // Spread existing profile data
          Name: value.businessName,
          Website: normalizeWebsiteUrl(cleanWebsiteUrl(value.website)),
          UserDefinedBusinessDescription: value.businessDescription,
          BusinessObjective:
            value.serviceType === "physical"
              ? "local"
              : value.serviceType === "both"
                ? "hybrid"
              : "online",
          LocationType:
            value.offerings === "products"
              ? "products"
              : value.offerings === "services"
                ? "services"
                : "products",
          PrimaryLocation: {
            Location: location,
            Country: country,
          },
          // ProductsServices removed - offerings are only in job API, not business API
          USPs: uspsPayload.length > 0 ? uspsPayload : null,
          SellingPoints: uspsPayload.length > 0 ? uspsPayload : null, // Keep for backward compatibility
          BrandTerms:
            Array.isArray(value.brandTerms) && value.brandTerms.length > 0
              ? value.brandTerms
                .map((t: any) => String(t).trim())
                .filter((t: string) => t.length > 0)
              : null,
          LTV:
            value.lifetimeValue === "high" || value.lifetimeValue === "low"
              ? value.lifetimeValue
              : null,
          CTAs:
            value.ctas && value.ctas.length > 0
              ? (value.ctas || [])?.map((cta: any) => ({
                buttonText: String(cta?.buttonText || ""),
                url: (() => {
                  const raw = String(cta?.url || "");
                  const cleaned = raw.replace(/^sc-domain:/i, "").trim();
                  if (!cleaned) return "";
                  if (/^(tel:|mailto:)/i.test(cleaned)) return cleaned;
                  if (/^https?:\/\//i.test(cleaned)) {
                    return cleaned.replace(/^http:\/\//i, "https://");
                  }
                  return `https://${cleaned}`;
                })(),
              }))
              : null,
          CustomerPersonas: (value.stakeholders || [])?.map((s: any) => ({
            personName: s.name || "",
            personDescription: s.title || "",
          })),
          Locations: (value.locations || [])?.map((loc: any) => ({
            Name: loc.name || "",
            Address1: loc.address || "",
            TimeZone: loc.timezone || "",
          })),
          Competitors: (value.competitors || [])?.map((comp: any) => ({
            website: cleanWebsiteUrl(comp.url),
          })),
          CalendarEvents: (value.calendarEvents || [])
            ?.filter((event: any) => {
              const hasEventName = event.eventName && String(event.eventName).trim().length > 0;
              const hasStartDate = event.startDate && String(event.startDate).trim().length > 0;
              return hasEventName || hasStartDate;
            })
            ?.map((event: any) => ({
              eventName: String(event.eventName || "").trim(),
              startDate: event.startDate ? String(event.startDate).trim() : null,
              endDate: event.endDate ? String(event.endDate).trim() : null,
            })) || null,
          WebBrandVoice:
            value.brandToneWeb && value.brandToneWeb.length > 0
              ? value.brandToneWeb.map((v: string) => {
                // Convert lowercase to title case for business API
                return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
              })
              : null,
          SocialBrandVoice:
            value.brandToneSocial && value.brandToneSocial.length > 0
              ? value.brandToneSocial.map((v: string) => {
                // Convert lowercase to title case for business API
                return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
              })
              : null,
        };

        // Store offerings that are being saved (ensure proper type - all fields must be strings)
        lastSavedOfferingsRef.current = (value.offeringsList || []).map(
          (off: any): OfferingRow => ({
            name: off.name || "",
            description: off.description || "",
            link: off.link || "",
          })
        );

        const updateResult = await onUpdateProfile(payload, value);

        if (updateResult?.jobExistsAfterSave) {
          setHasCreatedJobAfterSave(true);
        }

        // Update initial values after successful save
        initialValuesRef.current = JSON.stringify(value);
      } catch (error) {
        // Error toast is handled by the mutation
      } finally {
        setIsSaving(false);
      }
    },
    [
      businessId,
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

  const handleAutofillProfile = useCallback(async () => {
    const values = form.state.values as BusinessInfoFormData;
    const website = cleanWebsiteUrl(values?.website || "").trim();
    if (!website) {
      toast.error("Please enter a website URL first");
      return;
    }
    setIsAutofillLoading(true);
    // Start offerings extraction in parallel (same click as Profile Autofill)
    // Do not await here so Profile Autofill UX isn't blocked.
    void offeringsExtractor.startExtraction(website).catch(() => {});
    try {
      const res = await api.post<ProfileAutofillResponse>(
        "/profile-autofill",
        "python",
        { business_url: website },
        { timeout: 120000 }
      );
      const autofillErrorMessage = getAutofillErrorMessage(res, "");
      if (autofillErrorMessage) {
        toast.error(autofillErrorMessage);
        return;
      }
      const pa = res?.profile_autofill;
      if (!pa) {
        const fallbackMessage = String(res?.message ?? res?.detail ?? "").trim();
        toast.error(fallbackMessage || "Failed to autofill profile");
        return;
      }

      const ensureHttpsUrl = (raw: unknown): string => {
        const s = String(raw ?? "")
          .replace(/^sc-domain:/i, "")
          .trim();
        if (!s) return "";
        if (/^(tel:|mailto:)/i.test(s)) return s;
        if (/^https?:\/\//i.test(s)) {
          return s.replace(/^http:\/\//i, "https://");
        }
        return `https://${s}`;
      };

      // Overwrite fields from autofill response (NOTE: this overwrites user-entered data)
      const nextWebsite = (() => {
        const raw = pa.url || res?.business_url || website;
        return cleanWebsiteUrl(String(raw ?? ""));
      })();
      if (nextWebsite) {
        form.setFieldValue("website" as any, nextWebsite as any);
      }

      const nextBusinessName = String(pa.business_name ?? "").trim();
      if (nextBusinessName) {
        form.setFieldValue("businessName" as any, nextBusinessName as any);
      }

      const market = (pa.market ?? "").toString().trim().toLowerCase();
      const nextServiceType =
        market === "online"
          ? "online"
          : market === "local"
            ? "physical"
            : market === "hybrid"
              ? "both"
              : undefined;
      if (nextServiceType) {
        form.setFieldValue("serviceType" as any, nextServiceType as any);
      }

      const ltvFromAutofill = (pa.ltv ?? "").toString().trim().toLowerCase();
      form.setFieldValue(
        "lifetimeValue" as any,
        (ltvFromAutofill === "high" || ltvFromAutofill === "low"
          ? ltvFromAutofill
          : "") as any
      );

      const sell = (pa.sell ?? "products").toString().trim().toLowerCase();
      const nextOfferings =
        sell === "services"
          ? "services"
          : sell === "both"
            ? "both"
            : "products";
      form.setFieldValue("offerings" as any, nextOfferings as any);

      // Competitors (overwrite)
      const competitorsFromApi = Array.isArray(pa.competitors)
        ? pa.competitors
          .filter((url): url is string => Boolean(url && String(url).trim()))
          .map((url) => cleanWebsiteUrl(String(url)))
          .filter(Boolean)
        : [];
      form.setFieldValue(
        "competitors" as any,
        competitorsFromApi.map((url) => ({ url })) as any
      );

      // CTAs (overwrite)
      const ctasFromApi = Array.isArray(pa.ctas)
        ? pa.ctas
          .map((cta) => ({
            buttonText: String(cta?.text ?? "").trim(),
            url: ensureHttpsUrl(cta?.url),
          }))
          .filter((cta) => Boolean(cta.buttonText && cta.url))
        : [];
      form.setFieldValue("ctas" as any, ctasFromApi as any);

      // Brand terms (overwrite as comma-separated string)
      const brandTermsFromApi = Array.isArray(pa.brand_terms)
        ? pa.brand_terms.map((t) => String(t).trim()).filter(Boolean)
        : [];
      form.setFieldValue("brandTerms" as any, brandTermsFromApi as any);

      // Tone fields (overwrite, max 3, allowed options only)
      const allowedToneOptions = new Set([
        "professional",
        "bold",
        "friendly",
        "innovative",
        "playful",
        "trustworthy",
      ]);
      const normalizeTones = (raw: unknown): string[] => {
        if (!Array.isArray(raw)) return [];
        return raw
          .map((v) => String(v).toLowerCase().trim())
          .filter((v) => allowedToneOptions.has(v))
          .slice(0, 3);
      };
      form.setFieldValue("brandToneWeb" as any, normalizeTones(pa.web_tone) as any);
      form.setFieldValue(
        "brandToneSocial" as any,
        normalizeTones(pa.social_tone) as any
      );

      setHasAutofilledProfile(true);
      toast.success("Profile fields updated from website");
    } catch (error: any) {
      const fallbackMessage = String(
        error?.response?.data?.message ??
        error?.response?.data?.detail ??
        error?.message ??
        ""
      ).trim();
      toast.error(
        getAutofillErrorMessage(error?.response?.data ?? error, "") ||
        fallbackMessage ||
        "Failed to autofill profile"
      );
    } finally {
      setIsAutofillLoading(false);
    }
  }, [form, offeringsExtractor]);

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
      ? JSON.stringify(externalJobDetails)
      : null;
    const jobDetailsChanged =
      lastJobDetailsRef.current !== currentJobDetailsString;

    if (externalProfileData) {
      // Serialize current profile data to detect if it changed
      const currentDataString = JSON.stringify(externalProfileData);
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
        const mappedValues = mapProfileDataToFormValues(
          externalProfileData,
          externalJobDetails
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

        // Clear the saved offerings ref after processing (so next update can proceed normally)
        if (apiOfferingsMatchSaved) {
          lastSavedOfferingsRef.current = null;
        }

        // Set initial values ref
        initialValuesRef.current = JSON.stringify(mappedValues);
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
  }, [externalProfileData, externalJobDetails, form, isSaving]);

  // Store initial values on mount (only once)
  useEffect(() => {
    if (!initialValuesRef.current) {
      initialValuesRef.current = JSON.stringify(form.state.values);
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
  const [hasChanges, setHasChanges] = useState(false);

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
      const currentValuesString = JSON.stringify(formValues);
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
  }, [form, saveProfileValues]);

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
      }>("/trigger-workflow", "python", {
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

  // Check if workflow is currently processing
  const isWorkflowProcessing = useMemo(() => {
    return externalJobDetails?.workflow_status?.status === "processing";
  }, [externalJobDetails?.workflow_status?.status]);

  // Always prioritize showing "Save Changes" when there are changes, regardless of workflow state
  const buttonText = hasChanges
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

  const isAutofillGateActive = !isJobCreated && !hasAutofilledProfile;
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
  const isButtonDisabled = hasChanges
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

    if (hasChanges) {
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
    hasChanges,
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
    if (!isJobCreated) {
      try {
        await handleSaveChanges();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }

    if (hasChanges) {
      try {
        await handleSaveChanges();
      } catch (e) {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }

    setIsStrategyConfirmOpen(true);
  }, [handleSaveChanges, hasChanges, isJobCreated]);

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
      const business = currentProfile || externalProfileData;
      if (!business) return;
      await handleSubscribeToPlan({
        business,
        planName,
        action,
        closeAllModals: () => setPlanModalOpen(false),
      });
    },
    [currentProfile, externalProfileData, handleSubscribeToPlan]
  );

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
      <LoaderOverlay isLoading={isLoading} message={loadingMessage}>
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
            {!isJobCreated ? (
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
            ) : (
              <Tabs
                value={profileTabValue}
                onValueChange={(value) => {
                  const nextIndex = PROFILE_STEPPER_STEPS.findIndex(
                    (s) => s.id === value
                  );
                  setProfileStep(nextIndex >= 0 ? nextIndex : 0);
                }}
                className="shrink-0"
              >
                <TabsList className="w-fit self-start">
                  {PROFILE_STEPPER_STEPS.map((s) => (
                    <TabsTrigger
                      key={s.id}
                      value={s.id}
                      className="py-2 flex-none px-4"
                    >
                      {s.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {!isJobCreated ? (
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
                              onClick={handleAutofillProfile}
                              disabled={
                                isAutofillLoading ||
                                offeringsExtractor.isExtracting ||
                                !(formValues?.website ?? "").toString().trim()
                              }
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
                              onClick={handleAutofillProfile}
                              disabled={
                                isAutofillLoading ||
                                offeringsExtractor.isExtracting ||
                                !(formValues?.website ?? "").toString().trim()
                              }
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
                      rightAction={
                        <Button
                          type="button"
                          className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
                          onClick={handlePrimaryButtonClick}
                          disabled={
                            externalLoading ||
                            isSaving ||
                            hasAnyValidationErrors ||
                            isAutofillWorkflowInProgress
                          }
                          title={buttonHelperText}
                        >
                          {isSaving ? "Saving..." : "Save Changes"}
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
                <Tabs
                  value={profileTabValue}
                  onValueChange={(value) => {
                    const nextIndex = PROFILE_STEPPER_STEPS.findIndex(
                      (s) => s.id === value
                    );
                    setProfileStep(nextIndex >= 0 ? nextIndex : 0);
                  }}
                  className="flex flex-col gap-0 flex-1 min-h-0 overflow-hidden"
                >
                  <TabsContent
                    value="basic-details"
                    className="flex flex-col flex-1 min-h-0 overflow-hidden mt-0"
                  >
                    <ProfileStepCard
                      title="Basic Details"
                      description="Helps us understand who you are and how to tailor insights, benchmarks, and strategy to your business."
                      className="flex-1"
                      scrollableContent
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
                      <BusinessInfoForm
                        form={form}
                        embedded
                        embeddedVariant="full"
                        primaryLocationAction={
                          <Button
                            type="button"
                            variant="outline"
                            size="default"
                            onClick={handleAutofillProfile}
                            disabled={
                              isAutofillLoading ||
                              offeringsExtractor.isExtracting ||
                              !(formValues?.website ?? "").toString().trim()
                            }
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
                      />
                      <OfferingsForm
                        form={form}
                        businessId={businessId}
                        embedded
                        hideFetchOfferingsFromWebsite
                        extractionController={offeringsExtractor}
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
                    </ProfileStepCard>
                  </TabsContent>

                  <TabsContent
                    value="content-cues"
                    className="flex flex-col flex-1 min-h-0 overflow-hidden mt-0"
                  >
                    <ProfileStepCard
                      title="Content Cues"
                      description="Guides tone, messaging, and calls-to-action so content sounds like you and converts better."
                      className="flex-1"
                      scrollableContent
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
                      <ContentCuesForm form={form} embedded />
                      <LocationsForm form={form} embedded />
                    </ProfileStepCard>
                  </TabsContent>

                  <TabsContent
                    value="competitors"
                    className="flex flex-col flex-1 min-h-0 overflow-hidden mt-0"
                  >
                    <ProfileStepCard
                      title="Competitors"
                      description="Gives context on your landscape so we can spot gaps, differentiation, and growth opportunities."
                      className="flex-1"
                      scrollableContent
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
                  </TabsContent>
                </Tabs>
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
      </LoaderOverlay>
    </div>
  );
};

export default ProfileTemplate;
