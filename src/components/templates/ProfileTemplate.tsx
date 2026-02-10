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
import ProfileSidebar from "../organisms/ProfileSidebar";
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
import { Button } from "@/components/ui/button";
import { Unlink } from "lucide-react";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { useSubscription } from "@/hooks/use-subscription";
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
import { useUnlinkOrDeleteBusiness } from "@/hooks/use-business-actions";

interface ProfileTemplateProps {
  businessId: string;
  profileData?: BusinessProfile | null;
  jobDetails?: any | null; // Job details from job API
  isLoading?: boolean;
  onUpdateProfile?: (payload: any, formValues?: any) => Promise<void>;
}

const sections = [
  { id: "business-info", label: "Business Info" },
  { id: "offerings", label: "Offerings" },
  { id: "content-cues", label: "Content Cues" },
  { id: "locations-addresses", label: "Locations & Addresses" },
  { id: "competitors", label: "Competitors" },
];

// Scroll configuration
const SCROLL_HEADER_OFFSET = 100;
const SCROLL_DETECTION_OFFSET = 150;

// Helper function to find the scrollable container
const findScrollableContainer = (element: HTMLElement): HTMLElement | null => {
  let parent: HTMLElement | null = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    if (
      style.overflowY === "auto" ||
      style.overflowY === "scroll" ||
      style.overflow === "auto" ||
      style.overflow === "scroll"
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return null;
};

// Helper function to get element position relative to scrollable container
const getElementScrollPosition = (
  element: HTMLElement,
  container: HTMLElement
): number => {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return elementRect.top - containerRect.top + container.scrollTop;
};

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
  // Get setters from Zustand store (only for UI state)
  const setActiveSection = useBusinessStore((state) => state.setActiveSection);

  // Zustand selectors - only what's needed for template-level concerns
  const activeSection = useBusinessStore(
    (state) => state.profileForm.activeSection
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isTriggeringWorkflow, setIsTriggeringWorkflow] = useState(false);
  const [isCheckingPlan, setIsCheckingPlan] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const unlinkOrDeleteMutation = useUnlinkOrDeleteBusiness();
  const {
    loading: subscriptionLoading,
    data: subscriptionData,
    handleSubscribeToPlan,
    refetchData: refetchSubscriptionData,
  } = useSubscription();
  const [showSubmitErrors, setShowSubmitErrors] = useState(false);
  const initialValuesRef = useRef<any>(null);
  const hasChangesRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const lastProfileDataRef = useRef<string | null>(null);
  const lastProfileDataStringRef = useRef<string | null>(null);
  // Track the offerings that were just saved to prevent overwriting with stale data
  const lastSavedOfferingsRef = useRef<OfferingRow[] | null>(null);

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
        recurringRevenue: "",
        avgOrderValue: "",
        lifetimeValue: "",
        offerings: "products",
        offeringsList: [],
        usps: "",
        ctas: [],
        brandTerms: "",
        stakeholders: [],
        locations: [],
        competitors: [],
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
        return objective === "local" ? "physical" : "online";
      })() as "physical" | "online",
      recurringRevenue: (() => {
        const normalize = (raw: unknown): "yes" | "no" | "partial" | "" => {
          if (raw === null || raw === undefined) return "";
          if (raw === true) return "yes";
          if (raw === false) return "no";

          const s = String(raw).trim().toLowerCase();
          if (s === "yes" || s === "y" || s === "true" || s === "1") return "yes";
          if (s === "no" || s === "n" || s === "false" || s === "0") return "no";
          if (s === "partial" || s === "partially" || s === "sometimes") return "partial";
          return "";
        };

        const recurringFromBusiness =
          (profileData as any).RecurringFlag ??
          (profileData as any).recurring_flag ??
          (profileData as any).recurringFlag ??
          (profileData as any).RecurringRevenue ??
          (profileData as any).recurringRevenue;
        const recurringFromJob =
          (jobDetails as any)?.recurring_flag ??
          (jobDetails as any)?.recurringFlag ??
          (jobDetails as any)?.recurring_revenue;

        return normalize(recurringFromBusiness ?? recurringFromJob);
      })(),
      avgOrderValue: (() => {
        const aovFromBusiness = (profileData as any).AOV ?? (profileData as any).aov;
        const aovFromJob = (jobDetails as any)?.aov;
        const aov = aovFromBusiness ?? aovFromJob;
        return typeof aov === "number" && Number.isFinite(aov)
          ? String(aov)
          : aov
            ? String(aov)
            : "";
      })(),
      lifetimeValue: (() => {
        const ltvFromBusiness = (profileData as any).LTV ?? (profileData as any).ltv;
        const ltvFromJob = (jobDetails as any)?.ltv;
        const ltv = ltvFromBusiness ?? ltvFromJob;
        return typeof ltv === "number" && Number.isFinite(ltv)
          ? String(ltv)
          : ltv
            ? String(ltv)
            : "";
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

        if (Array.isArray(brandTerms)) {
          return brandTerms.map((t) => String(t).trim()).filter(Boolean).join(", ");
        }
        if (typeof brandTerms === "string") {
          // Job API may send JSON string
          try {
            const parsed = JSON.parse(brandTerms);
            if (Array.isArray(parsed)) {
              return parsed.map((t) => String(t).trim()).filter(Boolean).join(", ");
            }
          } catch {
            // ignore
          }
          return brandTerms;
        }

        return "";
      })(),
      stakeholders: stakeholdersList,
      locations: locationsList,
      competitors: competitorsList,
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
          BusinessObjective: value.serviceType === "physical" ? "local" : "online",
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
            value.brandTerms && value.brandTerms.trim()
              ? value.brandTerms
                .split(",")
                ?.map((item: string) => item.trim())
                ?.filter((item: string) => item.length > 0)
              : null,
          RecurringFlag:
            value.recurringRevenue && value.recurringRevenue.trim()
              ? value.recurringRevenue.trim().toLowerCase() === "partial"
                ? "sometimes"
                : value.recurringRevenue.trim().toLowerCase()
              : null,
          AOV: (() => {
            const num = Number.parseFloat(String(value.avgOrderValue || "").trim());
            return Number.isFinite(num) ? num : null;
          })(),
          LTV: (() => {
            const num = Number.parseFloat(String(value.lifetimeValue || "").trim());
            return Number.isFinite(num) ? num : null;
          })(),
          CTAs:
            value.ctas && value.ctas.length > 0
              ? (value.ctas || [])?.map((cta: any) => ({
                buttonText: String(cta?.buttonText || ""),
                url: (() => {
                  const raw = String(cta?.url || "");
                  const cleaned = raw.replace(/^sc-domain:/i, "").trim();
                  if (!cleaned) return "";
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

        await onUpdateProfile(payload, value);

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

  // Initialize active section on mount
  useEffect(() => {
    if (activeSection !== sections[0].id) {
      setActiveSection(sections[0].id);
    }
  }, []); // Only run on mount

  // Track job details to detect changes
  const lastJobDetailsRef = useRef<string | null>(null);

  // Ensure recurring revenue flag is always hydrated (select needs exact yes|no|partial)
  // This is intentionally separate from the broader mapping logic to avoid edge cases
  // where the form doesn't rehydrate due to caching/heuristics.
  useEffect(() => {
    if (isSaving) return;

    const normalize = (raw: unknown): "yes" | "no" | "partial" | "" => {
      if (raw === null || raw === undefined) return "";
      if (raw === true) return "yes";
      if (raw === false) return "no";

      const s = String(raw).trim().toLowerCase();
      if (s === "yes" || s === "y" || s === "true" || s === "1") return "yes";
      if (s === "no" || s === "n" || s === "false" || s === "0") return "no";
      if (s === "partial" || s === "partially" || s === "sometimes") return "partial";
      return "";
    };

    const recurringFromBusiness = externalProfileData
      ? (externalProfileData as any).RecurringFlag ??
      (externalProfileData as any).recurring_flag ??
      (externalProfileData as any).recurringFlag ??
      (externalProfileData as any).RecurringRevenue ??
      (externalProfileData as any).recurringRevenue
      : undefined;
    const recurringFromJob = (externalJobDetails as any)?.recurring_flag ??
      (externalJobDetails as any)?.recurringFlag ??
      (externalJobDetails as any)?.recurring_revenue;

    const nextValue = normalize(recurringFromBusiness ?? recurringFromJob);
    if ((form.state.values as any)?.recurringRevenue !== nextValue) {
      form.setFieldValue("recurringRevenue" as any, nextValue as any);
    }
  }, [externalProfileData, externalJobDetails, form, isSaving]);

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

  // Calculate completion percentage based on filled fields
  const completionPercentage = useMemo(() => {
    const values = formValues;
    const totalFields = 19; // Total number of fields to track

    let filledFields = 0;

    // Required fields
    if (values.website?.trim()) filledFields++;
    if (values.businessName?.trim()) filledFields++;
    if (values.primaryLocation?.trim()) filledFields++;
    if (values.recurringRevenue?.trim()) filledFields++;
    if (values.serviceType) filledFields++;
    if (values.offerings) filledFields++;

    // Optional but tracked fields
    if (values.businessDescription?.trim()) filledFields++;
    // Number fields - handle both string and number types
    if (values.avgOrderValue != null && values.avgOrderValue !== "") {
      const avgOrderValueStr =
        typeof values.avgOrderValue === "string"
          ? values.avgOrderValue.trim()
          : String(values.avgOrderValue);
      if (avgOrderValueStr) filledFields++;
    }

    if (values.lifetimeValue != null && values.lifetimeValue !== "") {
      const lifetimeValueStr =
        typeof values.lifetimeValue === "string"
          ? values.lifetimeValue.trim()
          : String(values.lifetimeValue);
      if (lifetimeValueStr) filledFields++;
    }

    // Array fields - check for rows with actual data
    // Offerings: check if there are rows with names
    const hasOfferings = (values.offeringsList || []).some((row: any) =>
      row.name?.trim()
    );
    if (hasOfferings) filledFields++;

    // USPs: check if there are any USPs
    if (
      values.usps &&
      typeof values.usps === "string" &&
      values.usps.trim().length > 0
    ) {
      filledFields++;
    }

    // CTAs: check if there are rows with button text and URL
    const hasCTAs = (values.ctas || []).some(
      (row: any) => row.buttonText?.trim() && row.url?.trim()
    );
    if (hasCTAs) filledFields++;

    // Brand terms: check if there are any brand terms
    if (
      values.brandTerms &&
      typeof values.brandTerms === "string" &&
      values.brandTerms.trim().length > 0
    ) {
      filledFields++;
    }

    // Stakeholders: check if there are rows with data
    const hasStakeholders = (values.stakeholders || []).some(
      (row: any) => row.name?.trim() || row.title?.trim()
    );
    if (hasStakeholders) filledFields++;

    // Locations: check if there are rows with data
    const hasLocations = (values.locations || []).some(
      (row: any) => row.name?.trim() || row.address?.trim()
    );
    if (hasLocations) filledFields++;

    // Competitors: check if there are rows with URLs
    const hasCompetitors = (values.competitors || []).some((row: any) =>
      row.url?.trim()
    );
    if (hasCompetitors) filledFields++;

    // Brand tone: check if at least one is selected
    if (
      values.brandToneSocial &&
      Array.isArray(values.brandToneSocial) &&
      values.brandToneSocial.length > 0
    ) {
      filledFields++;
    }
    if (
      values.brandToneWeb &&
      Array.isArray(values.brandToneWeb) &&
      values.brandToneWeb.length > 0
    ) {
      filledFields++;
    }

    return Math.round((filledFields / totalFields) * 100);
  }, [form.state.values]);

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
      const latestSubscription = await refetchSubscriptionData();
      const effectiveSubscription = latestSubscription ?? subscriptionData;
      const isWhitelisted =
        effectiveSubscription?.whitelisted === true ||
        effectiveSubscription?.status === "whitelisted";
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
      const hasAboveStarterPlan = isWhitelisted || level > planLevels.starter;

      if (!hasAboveStarterPlan) {
        setPlanModalOpen(true);
        return;
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

  // Cache scroll container ref
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  // Flag to prevent scroll detection from overriding clicked section
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track the last clicked section to give it priority
  const lastClickedSectionRef = useRef<string | null>(null);

  const handleSectionClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    lastClickedSectionRef.current = sectionId;
    const element = document.getElementById(sectionId);

    if (!element) {
      console.warn(`Section with id "${sectionId}" not found`);
      return;
    }

    // Set flag to prevent scroll detection from updating active section
    isScrollingRef.current = true;

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Find or use cached scroll container
    if (!scrollContainerRef.current) {
      scrollContainerRef.current = findScrollableContainer(element);
    }

    const scrollContainer = scrollContainerRef.current;
    const isWindow =
      !scrollContainer || scrollContainer === document.documentElement;

    if (isWindow) {
      const rect = element.getBoundingClientRect();
      const scrollY = window.scrollY || 0;
      const targetScroll = rect.top + scrollY - SCROLL_HEADER_OFFSET;

      window.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    } else {
      const targetScroll =
        getElementScrollPosition(element, scrollContainer) -
        SCROLL_HEADER_OFFSET;
      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }

    // Re-enable scroll detection after smooth scroll completes
    // Use a longer timeout to ensure smooth scroll is fully complete
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      // Keep the clicked section active for a bit longer to ensure it's visible
      setTimeout(() => {
        lastClickedSectionRef.current = null;
      }, 500);
    }, 1200);
  }, []);

  // Update active section based on scroll position
  useEffect(() => {
    // Initialize scroll container cache
    const firstSection = document.getElementById("business-info");
    if (firstSection && !scrollContainerRef.current) {
      scrollContainerRef.current = findScrollableContainer(firstSection);
    }

    const scrollContainer = scrollContainerRef.current;
    const isWindow =
      !scrollContainer || scrollContainer === document.documentElement;
    const targetElement = isWindow ? window : scrollContainer;

    const handleScroll = () => {
      // Don't update active section if we're programmatically scrolling
      if (isScrollingRef.current) {
        return;
      }

      // If we recently clicked a section, prioritize it
      if (lastClickedSectionRef.current) {
        const clickedElement = document.getElementById(
          lastClickedSectionRef.current
        );
        if (clickedElement) {
          const scrollPosition = isWindow
            ? window.scrollY || 0
            : scrollContainer.scrollTop;

          const elementTop = isWindow
            ? clickedElement.getBoundingClientRect().top + scrollPosition
            : getElementScrollPosition(clickedElement, scrollContainer);

          const viewportTop = scrollPosition + SCROLL_DETECTION_OFFSET;
          const elementBottom = elementTop + clickedElement.offsetHeight;

          // If clicked section is still in viewport, keep it active
          if (viewportTop >= elementTop && viewportTop < elementBottom) {
            setActiveSection(lastClickedSectionRef.current);
            return;
          }
        }
      }

      const scrollPosition = isWindow
        ? window.scrollY || 0
        : scrollContainer.scrollTop;

      let currentSection = sections[0].id;
      let closestToTop = Infinity;

      // Find the section that's closest to the top of the viewport
      // This ensures we select the section actually at the top, not just any visible section
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (!element) continue;

        const elementTop = isWindow
          ? element.getBoundingClientRect().top + scrollPosition
          : getElementScrollPosition(element, scrollContainer);

        const viewportTop = scrollPosition + SCROLL_DETECTION_OFFSET;

        // Calculate distance from viewport top to element top
        const distanceFromTop = Math.abs(elementTop - viewportTop);

        // Only consider sections that are at or above the viewport top
        // and find the one closest to the viewport top
        if (elementTop <= viewportTop + 50) {
          // Allow 50px tolerance
          if (distanceFromTop < closestToTop) {
            closestToTop = distanceFromTop;
            currentSection = section.id;
          }
        }
      }

      setActiveSection(currentSection);
    };

    targetElement.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check after DOM is ready
    setTimeout(handleScroll, 100);

    return () => {
      if (targetElement === window) {
        window.removeEventListener("scroll", handleScroll);
      } else {
        targetElement.removeEventListener("scroll", handleScroll);
      }
      // Cleanup timeout on unmount
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

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
        ? "Triggering Workflow..."
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

  const hasSchemaValidationErrors = useMemo(() => {
    return !businessInfoSchema.safeParse(formValues).success;
  }, [formValues]);

  // Combine all validation errors
  const hasAnyValidationErrors =
    hasSchemaValidationErrors || hasCtaValidationErrors || hasOfferingsValidationErrors;

  // Disable button logic:
  // - For "Save Changes": disable if loading, saving, or has any validation errors
  // - For "Confirm & Proceed": disable if loading, saving, triggering, workflow processing, or no job exists
  const isButtonDisabled = hasChanges
    ? externalLoading || isSaving || hasAnyValidationErrors // Save Changes: disable during loading, saving, or validation errors
    : externalLoading ||
    isSaving ||
    isCheckingPlan ||
    isTriggeringWorkflow ||
    isWorkflowProcessing || // Disable if workflow is already processing
    !externalJobDetails?.job_id; // Require job to exist before proceeding

  const buttonHelperText = useMemo(() => {
    if (!isButtonDisabled) return undefined;

    if (hasChanges) {
      if (externalLoading) return "Please wait for the profile to finish loading.";
      if (isSaving) return "Saving in progress.";
      if (hasAnyValidationErrors) return "Fix the highlighted fields to enable saving.";
      return "Unable to save right now.";
    }

    if (!externalJobDetails?.job_id) return "Add offerings first to proceed to Strategy.";
    if (isWorkflowProcessing) return "Workflows are under process. Please wait till they are done.";
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
    hasAnyValidationErrors,
    externalJobDetails?.job_id,
    isWorkflowProcessing,
    isCheckingPlan,
    isTriggeringWorkflow,
  ]);

  const handlePrimaryButtonClick = useCallback(async () => {
    if (hasChanges) {
      try {
        await handleSaveChanges();
      } catch (e) {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }

    setIsStrategyConfirmOpen(true);
  }, [hasChanges, handleSaveChanges]);

  // Determine loading state and message
  const isLoading = externalLoading || isSaving || isTriggeringWorkflow;
  const loadingMessage = useMemo(() => {
    if (isTriggeringWorkflow) return "Triggering workflow...";
    if (isSaving) return "Saving changes...";
    if (externalLoading) return "Loading profile data...";
    return undefined;
  }, [isTriggeringWorkflow, isSaving, externalLoading]);

  // Determine if we should show "Unlink" or "Delete" based on LinkedAuthId
  const hasLinkedAuth = !!currentProfile?.LinkedAuthId;
  const isActive = currentProfile?.IsActive === true;
  const businessDbId = currentProfile?.Id;

  // Can unlink if: has LinkedAuthId AND is active AND has database Id
  const canUnlink = hasLinkedAuth && isActive && !!businessDbId;

  // Can delete if: no LinkedAuthId AND is active AND has database Id
  const canDelete = !hasLinkedAuth && isActive && !!businessDbId;

  const canPerformAction = canUnlink || canDelete;
  const actionLabel = hasLinkedAuth ? "Unlink Business" : "Delete Business";

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

  const handleConfirmAction = useCallback(async () => {
    if (!currentProfile) {
      toast.error(`Unable to ${actionLabel.toLowerCase()}`, {
        description: "Business profile not found.",
      });
      return;
    }

    if (!businessDbId) {
      toast.error(`Unable to ${actionLabel.toLowerCase()}`, {
        description: "This business has not been saved yet.",
      });
      return;
    }

    if (!isActive) {
      toast.info(`Business is already ${hasLinkedAuth ? "unlinked" : "deleted"}`);
      setIsUnlinkModalOpen(false);
      return;
    }

    try {
      await unlinkOrDeleteMutation.mutateAsync({
        businessId,
        businessDbId,
        hasLinkedAuth,
        isActive,
      });
      setIsUnlinkModalOpen(false);
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  }, [currentProfile, businessDbId, isActive, hasLinkedAuth, actionLabel, businessId, unlinkOrDeleteMutation]);

  return (
    <div
      className={cn(
        "flex flex-col min-h-full relative",
        isLoading ? "overflow-hidden" : ""
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
        {/* Sticky Page Header */}
        <div className="sticky top-0 z-10">
          <PageHeader
            breadcrumbs={breadcrumbs}
            showAskMassic={Boolean(externalJobDetails?.job_id)}
          />
        </div>

        {/* Scrollable Content */}
        <div className="w-full max-w-[1224px] flex gap-6 p-5 items-start">
          <ProfileSidebar
            sections={sections}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
            completionPercentage={completionPercentage}
            buttonText={buttonText}
            onButtonClick={handlePrimaryButtonClick}
            buttonDisabled={isButtonDisabled}
            buttonHelperText={buttonHelperText}
            isWorkflowProcessing={isWorkflowProcessing}
          />
          {/* Loader overlay only on the right panel (form content) */}

          <div className="flex-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              <BusinessInfoForm form={form} />
              <OfferingsForm form={form} businessId={businessId} />
              <ContentCuesForm form={form} />
              <LocationsForm form={form} />
              <CompetitorsForm form={form} />
            </form>
            <div className="mt-6 flex justify-end">
              <Button
                variant="destructive"
                onClick={() => setIsUnlinkModalOpen(true)}
                className="flex items-center gap-2"
                disabled={!canPerformAction || unlinkOrDeleteMutation.isPending}
              >
                <Unlink className="size-4" />
                {actionLabel}
              </Button>
            </div>
          </div>
        </div>

        {/* Unlink/Delete Confirmation Modal (shadcn) */}
        <AlertDialog open={isUnlinkModalOpen} onOpenChange={setIsUnlinkModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to {hasLinkedAuth ? "unlink" : "delete"} this business?</AlertDialogTitle>
              <AlertDialogDescription>
                {hasLinkedAuth
                  ? "Unlinking this business will deactivate it, cancel any associated subscription, and remove it from your profile along with all linked accounts (GSC, GA4, GBP). This impacts your strategy and execution. Only do this if your business goals have significantly changed."
                  : "Deleting this business will permanently deactivate it and cancel any associated subscription. This action will remove the business from your profile."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={unlinkOrDeleteMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  onClick={handleConfirmAction}
                  disabled={!canPerformAction || unlinkOrDeleteMutation.isPending}
                >
                  {unlinkOrDeleteMutation.isPending ? `${hasLinkedAuth ? "Unlinking" : "Deleting"}...` : hasLinkedAuth ? "Unlink" : "Delete"}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
              <AlertDialogCancel disabled={isTriggeringWorkflow || isCheckingPlan}>
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
                  disabled={isTriggeringWorkflow || isCheckingPlan}
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
