"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import PageHeader from "../molecules/PageHeader";
import { useBusinessStore } from "@/store/business-store";
import ProfileSidebar from "../organisms/ProfileSidebar";
import { BusinessInfoForm } from "../organisms/profile/BusinessInfoForm";
import { OfferingsForm } from "../organisms/profile/OfferingsForm";
import { ContentCuesForm } from "../organisms/profile/ContentCuesForm";
import { LocationsForm } from "../organisms/profile/LocationsForm";
import { CompetitorsForm } from "../organisms/profile/CompetitorsForm";
import { useForm } from "@tanstack/react-form";
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
  const profiles = useBusinessStore((state) => state.profiles);

  // Get setters from Zustand store (only for UI state)
  const setActiveSection = useBusinessStore((state) => state.setActiveSection);

  // Zustand selectors - only what's needed for template-level concerns
  const activeSection = useBusinessStore(
    (state) => state.profileForm.activeSection
  );

  const [isSaving, setIsSaving] = useState(false);
  const initialValuesRef = useRef<any>(null);
  const lastProfileDataRef = useRef<string | null>(null);
  const lastProfileDataStringRef = useRef<string | null>(null);

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

    // Helper function to ensure we always have an array
    const ensureArray = <T,>(value: T | T[] | null | undefined): T[] => {
      if (Array.isArray(value)) return value;
      return [];
    };

    // Extract primary location from business API
    let primaryLocation = "";
    const profileDataAny = profileData as any; // Type assertion for PrimaryLocation
    if (profileDataAny?.PrimaryLocation) {
      const loc = profileDataAny.PrimaryLocation;
      if (loc.Location) {
        // Only append country if it's different from location to avoid duplication
        const location = loc.Location;
        const country = loc.Country || "";
        primaryLocation = country && country.toLowerCase() !== location.toLowerCase()
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
      if (jobExists && jobDetails?.offerings && jobDetails.offerings.length > 0) {
        return jobDetails.offerings.map((offering: any): OfferingRow => ({
          name: offering.offering || offering.name || "",
          description: offering.description || "",
          link: offering.url || "",
        }));
      }
      return [];
    })();

    // ALL OTHER FIELDS come from business API (source of truth)
    const ctasList = ensureArray((profileData as any).CTAs).map(
      (cta: any): CTARow => ({
        buttonText: cta.buttonText || "",
        url: cta.url || "",
      })
    );

    const stakeholdersList = ensureArray(profileData.CustomerPersonas).map(
      (person: any): StakeholderRow => ({
        name: person.personName || "",
        title: person.personDescription || "",
      })
    );

    const locationsList = ensureArray(profileData.Locations).map(
      (loc: any, index: number): LocationRow => {
        const locationName = loc.DisplayName || `Location ${index + 1}`;
        return {
          name: locationName,
          address: loc.Address1 || "",
          timezone: loc.TimeZone || "",
        };
      }
    );

    const competitorsList = ensureArray(profileData.Competitors).map(
      (comp: any): CompetitorRow => ({
        url: comp.website || comp.Website || "",
      })
    );

    // USPs from business API
    const usps = Array.isArray((profileData as any).USPs)
      ? (profileData as any).USPs.join(", ")
      : "";

    // Brand Voice from business API - convert to lowercase for checkboxes
    // IMPORTANT: Checkboxes in ContentCuesForm expect lowercase values (e.g., "professional", "bold")
    const validOptions = ["professional", "bold", "friendly", "innovative", "playful", "trustworthy"];
    const brandToneSocial = (profileData as any).SocialBrandVoice
      ? (profileData as any).SocialBrandVoice
          .map((s: string) => s.toLowerCase().trim())
          .filter((s: string) => validOptions.includes(s))
      : [];

    const brandToneWeb = (profileData as any).WebBrandVoice
      ? (profileData as any).WebBrandVoice
          .map((s: string) => s.toLowerCase().trim())
          .filter((s: string) => validOptions.includes(s))
      : [];

    return {
      // All fields from business API (source of truth)
      website: profileData.Website || "",
      businessName: profileData.Name || "",
      businessDescription: profileData.UserDefinedBusinessDescription || profileData.Description || "",
      primaryLocation: primaryLocation,
      serviceType: (() => {
        const objective = profileData.BusinessObjective?.toLowerCase();
        return objective === "local" ? "physical" : "online";
      })() as "physical" | "online",
      recurringRevenue: "",
      avgOrderValue: "",
      lifetimeValue: "",
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
      brandTerms: "",
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

  const form = useForm({
    defaultValues,
    validators: {
      onChange: businessInfoSchema as any,
    },
    onSubmit: async ({ value }) => {
      if (!onUpdateProfile) {
        console.warn("onUpdateProfile not provided");
        return;
      }

      setIsSaving(true);
      try {
        // Map form values to API payload structure
        // Spread existing profile data to preserve all fields, then update specific ones
        const locationParts = value.primaryLocation.split(",");
        const location = locationParts[0]?.trim() || "";
        const country = locationParts[1]?.trim() || "united states";

        const payload = {
          ...externalProfileData, // Spread existing profile data
          Name: value.businessName,
          Website: value.website,
          UserDefinedBusinessDescription: value.businessDescription,
          BusinessObjective:
            value.serviceType === "physical" ? "local" : "online",
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
          USPs:
            value.usps && value.usps.trim()
              ? value.usps
                  .split(",")
                  ?.map((item: string) => item.trim())
                  ?.filter((item: string) => item.length > 0)
              : null,
          SellingPoints:
            value.usps && value.usps.trim()
              ? value.usps
                  .split(",")
                  ?.map((item: string) => item.trim())
                  ?.filter((item: string) => item.length > 0)
              : null, // Keep for backward compatibility
          BrandTerms:
            value.brandTerms && value.brandTerms.trim()
              ? value.brandTerms
                  .split(",")
                  ?.map((item: string) => item.trim())
                  ?.filter((item: string) => item.length > 0)
              : null,
          CTAs:
            value.ctas && value.ctas.length > 0
              ? (value.ctas || [])?.map((cta: any) => ({
                  buttonText: cta.buttonText || "",
                  url: cta.url || "",
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
            website: comp.url || "",
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

        await onUpdateProfile(payload, value);

        // Update initial values after successful save
        initialValuesRef.current = JSON.stringify(value);
      } catch (error) {
        console.error("Failed to save profile:", error);
        // Error toast is handled by the mutation
      } finally {
        setIsSaving(false);
      }
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

  // Update form when external profile data or job details change
  // Job details only affect offerings, but we still need to update when job is created/updated
  useEffect(() => {
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

        // Set form values for each field individually to ensure they update
        Object.entries(mappedValues).forEach(([key, value]) => {
          form.setFieldValue(key as any, value as any);
        });

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
  }, [externalProfileData, externalJobDetails, form]);

  // Store initial values on mount (only once)
  useEffect(() => {
    if (!initialValuesRef.current) {
      initialValuesRef.current = JSON.stringify(form.state.values);
    }
  }, []);

  // Use form state for change detection
  const hasChanges = useMemo(() => {
    if (!initialValuesRef.current) return false;
    const currentValuesString = JSON.stringify(form.state.values);
    return currentValuesString !== initialValuesRef.current;
  }, [form.state.values]);

  // Calculate completion percentage based on filled fields
  const completionPercentage = useMemo(() => {
    const values = form.state.values;
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
    await form.handleSubmit();
  }, [form]);

  // Handle Confirm & Proceed - memoized to prevent re-renders
  const handleConfirmAndProceed = useCallback(() => {
    form.handleSubmit();
    // Navigate to strategy page or handle proceed logic
  }, [form]);

  const businessName = useMemo(() => {
    const profile = profiles.find((p) => p.UniqueId === businessId);
    return profile?.Name || profile?.DisplayName || "Business";
  }, [profiles, businessId]);

  // Memoize breadcrumbs to prevent re-renders
  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Profile" },
    ],
    [businessName]
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

  const buttonText = hasChanges
    ? isSaving
      ? "Saving..."
      : "Save Changes"
    : "Confirm & Proceed to Strategy";
  const handleButtonClick = hasChanges
    ? handleSaveChanges
    : handleConfirmAndProceed;
  const isButtonDisabled = externalLoading || isSaving;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Page Header */}
      <div className="sticky top-0 z-10 bg-background">
        <PageHeader breadcrumbs={breadcrumbs} />
      </div>

      {/* Scrollable Content */}
      <div className="flex gap-6 p-7 items-start">
        <ProfileSidebar
          sections={sections}
          activeSection={activeSection}
          onSectionClick={handleSectionClick}
          completionPercentage={completionPercentage}
          buttonText={buttonText}
          onButtonClick={handleButtonClick}
          buttonDisabled={isButtonDisabled}
        />
        <div className="flex-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <BusinessInfoForm form={form} />
            <OfferingsForm form={form} />
            <ContentCuesForm form={form} />
            <LocationsForm form={form} />
            <CompetitorsForm form={form} />
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileTemplate;
