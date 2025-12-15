"use client"

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import PageHeader from '../molecules/PageHeader'
import { useBusinessStore } from '@/store/business-store'
import ProfileSidebar from '../organisms/ProfileSidebar'
import ProfileContent from '../organisms/ProfileContent'
import { useForm } from "@tanstack/react-form"
import * as z from "zod"
import { Column } from "@/components/organisms/CustomAddRowTable"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ProfileTemplateProps {
  businessId: string
}

const sections = [
  { id: "business-info", label: "Business Info" },
  { id: "offerings", label: "Offerings" },
  { id: "content-cues", label: "Content Cues" },
  { id: "locations-addresses", label: "Locations & Addresses" },
  { id: "competitors", label: "Competitors" },
]

// Scroll configuration
const SCROLL_HEADER_OFFSET = 100
const SCROLL_DETECTION_OFFSET = 150

// Helper function to find the scrollable container
const findScrollableContainer = (element: HTMLElement): HTMLElement | null => {
  let parent: HTMLElement | null = element.parentElement
  
  while (parent) {
    const style = window.getComputedStyle(parent)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll' || 
        style.overflow === 'auto' || style.overflow === 'scroll') {
      return parent
    }
    parent = parent.parentElement
  }
  
  return null
}

// Helper function to get element position relative to scrollable container
const getElementScrollPosition = (element: HTMLElement, container: HTMLElement): number => {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return elementRect.top - containerRect.top + container.scrollTop
}

// Form schema and types
const businessInfoSchema = z.object({
  website: z
    .string()
    .min(1, "Website is required")
    .url("Please enter a valid URL"),
  businessName: z.string().min(1, "Business Name is required"),
  businessDescription: z.string(),
  primaryLocation: z.string().min(1, "Primary Location is required"),
  serviceType: z.enum(["physical", "online"]),
  recurringRevenue: z.string().min(1, "Recurring Revenue is required"),
  avgOrderValue: z.string(),
  lifetimeValue: z.string(),
  offerings: z.enum(["products", "services", "both"]),
  offeringsList: z
    .array(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        link: z
          .string()
          .optional()
          .refine(
            (val) => {
              if (!val || val.trim() === "") return true;
              try {
                new URL(val);
                return true;
              } catch {
                return false;
              }
            },
            { message: "Please enter a valid URL" }
          ),
      })
    )
    .optional(),
  usps: z.array(z.string()).optional(),
  ctas: z
    .array(
      z.object({
        buttonText: z.string().min(1, "Button Text is required"),
        url: z
          .string()
          .min(1, "URL is required")
          .url("Please enter a valid URL"),
      })
    )
    .optional(),
  brandTerms: z.array(z.string()).optional(),
  stakeholders: z
    .array(
      z.object({
        name: z.string().optional(),
        title: z.string().optional(),
      })
    )
    .optional(),
  locations: z
    .array(
      z.object({
        name: z.string().optional(),
        address: z.string().optional(),
        timezone: z.string().optional(),
      })
    )
    .optional(),
  competitors: z
    .array(
      z.object({
        url: z.string().optional(),
      })
    )
    .optional(),
  brandToneSocial: z
    .array(z.string())
    .max(3, "You can only select up to 3 options")
    .optional(),
  brandToneWeb: z
    .array(z.string())
    .max(3, "You can only select up to 3 options")
    .optional(),
});

type BusinessInfoFormData = z.infer<typeof businessInfoSchema>;

type OfferingRow = {
  name: string;
  description: string;
  link: string;
};

type CTARow = {
  buttonText: string;
  url: string;
};

type StakeholderRow = {
  name: string;
  title: string;
};

type LocationRow = {
  name: string;
  address: string;
  timezone: string;
};

type CompetitorRow = {
  url: string;
};

const ProfileTemplate = ({ businessId }: ProfileTemplateProps) => {
  const profiles = useBusinessStore((state) => state.profiles)
  const [activeSection, setActiveSection] = useState(sections[0].id)
  const [hasChanges, setHasChanges] = useState(false)
  const initialValuesRef = useRef<any>(null)

  // All state for table data
  const [offeringsData, setOfferingsData] = useState<OfferingRow[]>([]);
  const [savedRowIndices, setSavedRowIndices] = useState<Set<number>>(new Set());
  const [ctasData, setCtasData] = useState<CTARow[]>([]);
  const [ctasSavedRowIndices, setCtasSavedRowIndices] = useState<Set<number>>(new Set());
  const [stakeholdersData, setStakeholdersData] = useState<StakeholderRow[]>([]);
  const [stakeholdersSavedRowIndices, setStakeholdersSavedRowIndices] = useState<Set<number>>(new Set());
  const [locationsData, setLocationsData] = useState<LocationRow[]>([]);
  const [locationsSavedRowIndices, setLocationsSavedRowIndices] = useState<Set<number>>(new Set());
  const [competitorsData, setCompetitorsData] = useState<CompetitorRow[]>([]);
  const [competitorsSavedRowIndices, setCompetitorsSavedRowIndices] = useState<Set<number>>(new Set());

  const defaultValues = {
    website: "",
    businessName: "",
    businessDescription: "",
    primaryLocation: "",
    serviceType: "physical" as "physical" | "online",
    recurringRevenue: "",
    avgOrderValue: "",
    lifetimeValue: "",
    offerings: "products" as "products" | "services" | "both",
    offeringsList: [] as OfferingRow[],
    usps: [] as string[],
    ctas: [] as CTARow[],
    brandTerms: [] as string[],
    stakeholders: [] as StakeholderRow[],
    locations: [] as LocationRow[],
    competitors: [] as CompetitorRow[],
    brandToneSocial: [] as string[],
    brandToneWeb: [] as string[],
  };

  const form = useForm({
    defaultValues,
    validators: {
      onChange: businessInfoSchema as any,
    },
    onSubmit: async ({ value }) => {
      console.log("Form submitted:", value);
      // TODO: Add API call to save business info
    },
  });

  // Store initial values on mount (only once)
  useEffect(() => {
    if (!initialValuesRef.current) {
      initialValuesRef.current = JSON.stringify(form.state.values);
      setHasChanges(false);
    }
  }, []);

  // Track form changes - serialize values to detect changes
  // Force recalculation by including a timestamp or counter
  const [formUpdateTrigger, setFormUpdateTrigger] = useState(0)
  
  const formValuesString = useMemo(() => {
    const values = form.state.values
    // Trigger update by accessing the values
    return JSON.stringify(values);
  }, [form.state.values, formUpdateTrigger]);
  
  // Subscribe to form field changes to trigger updates
  useEffect(() => {
    // Check for form value changes periodically (as fallback)
    const checkInterval = setInterval(() => {
      const currentValues = JSON.stringify(form.state.values)
      if (currentValues !== formValuesString) {
        setFormUpdateTrigger(prev => prev + 1)
      }
    }, 300) // Check every 300ms
    
    return () => clearInterval(checkInterval)
  }, [form, formValuesString])
  
  useEffect(() => {
    if (initialValuesRef.current) {
      const hasFormChanged = formValuesString !== initialValuesRef.current;
      setHasChanges(hasFormChanged);
    }
  }, [formValuesString]);

  // Calculate completion percentage based on filled fields
  const completionPercentage = useMemo(() => {
    // Parse form values from the stringified version to ensure we get updates
    const values = formValuesString ? JSON.parse(formValuesString) : form.state.values;
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
    if (values.avgOrderValue != null && values.avgOrderValue !== '') {
      const avgOrderValueStr = typeof values.avgOrderValue === 'string' 
        ? values.avgOrderValue.trim() 
        : String(values.avgOrderValue);
      if (avgOrderValueStr) filledFields++;
    }
    
    if (values.lifetimeValue != null && values.lifetimeValue !== '') {
      const lifetimeValueStr = typeof values.lifetimeValue === 'string' 
        ? values.lifetimeValue.trim() 
        : String(values.lifetimeValue);
      if (lifetimeValueStr) filledFields++;
    }
    
    // Array fields - check for saved rows with actual data
    // Offerings: check if there are saved rows with names
    const hasOfferings = offeringsData.some((row, index) => 
      savedRowIndices.has(index) && row.name?.trim()
    );
    if (hasOfferings) filledFields++;
    
    // USPs: check if there are any USPs
    if (values.usps && Array.isArray(values.usps) && values.usps.length > 0 && values.usps.some((usp: string) => usp?.trim())) {
      filledFields++;
    }
    
    // CTAs: check if there are saved rows with button text and URL
    const hasCTAs = ctasData.some((row, index) => 
      ctasSavedRowIndices.has(index) && row.buttonText?.trim() && row.url?.trim()
    );
    if (hasCTAs) filledFields++;
    
    // Brand terms: check if there are any brand terms
    if (values.brandTerms && Array.isArray(values.brandTerms) && values.brandTerms.length > 0 && values.brandTerms.some((term: string) => term?.trim())) {
      filledFields++;
    }
    
    // Stakeholders: check if there are saved rows
    const hasStakeholders = stakeholdersData.some((row, index) => 
      stakeholdersSavedRowIndices.has(index) && (row.name?.trim() || row.title?.trim())
    );
    if (hasStakeholders) filledFields++;
    
    // Locations: check if there are saved rows
    const hasLocations = locationsData.some((row, index) => 
      locationsSavedRowIndices.has(index) && (row.name?.trim() || row.address?.trim())
    );
    if (hasLocations) filledFields++;
    
    // Competitors: check if there are saved rows with URLs
    const hasCompetitors = competitorsData.some((row, index) => 
      competitorsSavedRowIndices.has(index) && row.url?.trim()
    );
    if (hasCompetitors) filledFields++;
    
    // Brand tone: check if at least one is selected
    if (values.brandToneSocial && Array.isArray(values.brandToneSocial) && values.brandToneSocial.length > 0) {
      filledFields++;
    }
    if (values.brandToneWeb && Array.isArray(values.brandToneWeb) && values.brandToneWeb.length > 0) {
      filledFields++;
    }
    
    return Math.round((filledFields / totalFields) * 100);
  }, [
    form.state.values, // Direct dependency on form state
    formValuesString, // Also include stringified version for change detection
    offeringsData,
    savedRowIndices,
    ctasData,
    ctasSavedRowIndices,
    stakeholdersData,
    stakeholdersSavedRowIndices,
    locationsData,
    locationsSavedRowIndices,
    competitorsData,
    competitorsSavedRowIndices,
  ]);

  // Handlers for offerings
  const offeringsColumns: Column<OfferingRow>[] = [
    { key: "name", label: "Name", validation: { required: true } },
    { key: "description", label: "Description", validation: { required: false } },
    { key: "link", label: "Link", validation: { required: false, url: true } },
  ];

  const handleAddOfferingRow = () => {
    const newRow: OfferingRow = { name: "", description: "", link: "" };
    const updatedData = [...offeringsData, newRow];
    setOfferingsData(updatedData);
    form.setFieldValue("offeringsList", updatedData);
  };

  const handleRowChange = (rowIndex: number, field: string, value: string) => {
    const updatedData = [...offeringsData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [field]: value };
    setOfferingsData(updatedData);
    form.setFieldValue("offeringsList", updatedData);
    setHasChanges(true);
  };

  const handleDeleteRow = (rowIndex: number) => {
    const updatedData = offeringsData.filter((_, index) => index !== rowIndex);
    setOfferingsData(updatedData);
    form.setFieldValue("offeringsList", updatedData);
    setSavedRowIndices((prev) => {
      const newSaved = new Set<number>();
      prev.forEach((idx) => {
        if (idx < rowIndex) newSaved.add(idx);
        else if (idx > rowIndex) newSaved.add(idx - 1);
      });
      return newSaved;
    });
    setHasChanges(true);
  };

  const handleSaveRow = (rowIndex: number, row: OfferingRow) => {
    const updatedData = [...offeringsData];
    updatedData[rowIndex] = row;
    const newRow: OfferingRow = { name: "", description: "", link: "" };
    updatedData.splice(rowIndex + 1, 0, newRow);
    setSavedRowIndices((prev) => {
      const newSaved = new Set<number>();
      newSaved.add(rowIndex);
      prev.forEach((idx) => {
        if (idx <= rowIndex) newSaved.add(idx);
        else newSaved.add(idx + 1);
      });
      return newSaved;
    });
    setOfferingsData(updatedData);
    form.setFieldValue("offeringsList", updatedData);
  };

  // CTAs handlers
  const ctaColumns: Column<CTARow>[] = [
    { key: "buttonText", label: "Button Text", validation: { required: true } },
    { key: "url", label: "URL", validation: { required: true, url: true } },
  ];

  const handleAddCTARow = () => {
    const newRow: CTARow = { buttonText: "", url: "" };
    const updatedData = [...ctasData, newRow];
    setCtasData(updatedData);
    form.setFieldValue("ctas", updatedData);
  };

  const handleCTARowChange = (rowIndex: number, field: string, value: string) => {
    const updatedData = [...ctasData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [field]: value };
    setCtasData(updatedData);
    form.setFieldValue("ctas", updatedData);
    setHasChanges(true);
  };

  const handleCTADeleteRow = (rowIndex: number) => {
    const updatedData = ctasData.filter((_, index) => index !== rowIndex);
    setCtasData(updatedData);
    form.setFieldValue("ctas", updatedData);
    setCtasSavedRowIndices((prev) => {
      const newSaved = new Set<number>();
      prev.forEach((idx) => {
        if (idx < rowIndex) newSaved.add(idx);
        else if (idx > rowIndex) newSaved.add(idx - 1);
      });
      return newSaved;
    });
    setHasChanges(true);
  };

  const handleCTASaveRow = (rowIndex: number, row: CTARow) => {
    const updatedData = [...ctasData];
    updatedData[rowIndex] = row;
    const newRow: CTARow = { buttonText: "", url: "" };
    updatedData.splice(rowIndex + 1, 0, newRow);
    setCtasSavedRowIndices((prev) => {
      const newSaved = new Set<number>();
      newSaved.add(rowIndex);
      prev.forEach((idx) => {
        if (idx <= rowIndex) newSaved.add(idx);
        else newSaved.add(idx + 1);
      });
      return newSaved;
    });
    setCtasData(updatedData);
    form.setFieldValue("ctas", updatedData);
  };

  // Stakeholders handlers
  const stakeholdersColumns: Column<StakeholderRow>[] = [
    { key: "name", label: "Name", validation: { required: false } },
    { key: "title", label: "Title", validation: { required: false } },
  ];

  const handleAddStakeholderRow = () => {
    const newRow: StakeholderRow = { name: "", title: "" };
    const updatedData = [...stakeholdersData, newRow];
    setStakeholdersData(updatedData);
    form.setFieldValue("stakeholders", updatedData);
  };

  const handleStakeholderRowChange = (rowIndex: number, field: string, value: string) => {
    const updatedData = [...stakeholdersData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [field]: value };
    setStakeholdersData(updatedData);
    form.setFieldValue("stakeholders", updatedData);
    setHasChanges(true);
  };

  const handleStakeholderDeleteRow = (rowIndex: number) => {
    const updatedData = stakeholdersData.filter((_, index) => index !== rowIndex);
    setStakeholdersData(updatedData);
    form.setFieldValue("stakeholders", updatedData);
    setStakeholdersSavedRowIndices((prev) => {
      const newSaved = new Set<number>();
      prev.forEach((idx) => {
        if (idx < rowIndex) newSaved.add(idx);
        else if (idx > rowIndex) newSaved.add(idx - 1);
      });
      return newSaved;
    });
    setHasChanges(true);
  };

  const handleStakeholderSaveRow = (rowIndex: number, row: StakeholderRow) => {
    const updatedData = [...stakeholdersData];
    updatedData[rowIndex] = row;
    const newRow: StakeholderRow = { name: "", title: "" };
    updatedData.splice(rowIndex + 1, 0, newRow);
    setStakeholdersSavedRowIndices((prev) => {
      const newSaved = new Set<number>();
      newSaved.add(rowIndex);
      prev.forEach((idx) => {
        if (idx <= rowIndex) newSaved.add(idx);
        else newSaved.add(idx + 1);
      });
      return newSaved;
    });
    setStakeholdersData(updatedData);
    form.setFieldValue("stakeholders", updatedData);
  };

  // Locations handlers
  const handleAddLocationRow = () => {
    const newRow: LocationRow = { name: "", address: "", timezone: "" };
    const updatedData = [...locationsData, newRow];
    setLocationsData(updatedData);
    form.setFieldValue("locations", updatedData);
  };

  const handleLocationRowChange = (rowIndex: number, field: string, value: string) => {
    const updatedData = [...locationsData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [field]: value };
    setLocationsData(updatedData);
    form.setFieldValue("locations", updatedData);
    setHasChanges(true);
  };

  const handleLocationDeleteRow = (rowIndex: number) => {
    const updatedData = locationsData.filter((_, index) => index !== rowIndex);
    setLocationsData(updatedData);
    form.setFieldValue("locations", updatedData);
    setLocationsSavedRowIndices((prev) => {
      const newSaved = new Set<number>();
      prev.forEach((idx) => {
        if (idx < rowIndex) newSaved.add(idx);
        else if (idx > rowIndex) newSaved.add(idx - 1);
      });
      return newSaved;
    });
    setHasChanges(true);
  };

  const handleLocationSaveRow = (rowIndex: number, row: LocationRow) => {
    const updatedData = [...locationsData];
    updatedData[rowIndex] = row;
    const newRow: LocationRow = { name: "", address: "", timezone: "" };
    updatedData.splice(rowIndex + 1, 0, newRow);
    setLocationsSavedRowIndices((prev) => {
      const newSaved = new Set<number>();
      newSaved.add(rowIndex);
      prev.forEach((idx) => {
        if (idx <= rowIndex) newSaved.add(idx);
        else newSaved.add(idx + 1);
      });
      return newSaved;
    });
    setLocationsData(updatedData);
    form.setFieldValue("locations", updatedData);
  };

  // Locations columns (defined after handlers)
  const locationsColumns: Column<LocationRow>[] = [
    { key: "name", label: "Name", validation: { required: false } },
    { key: "address", label: "Address", validation: { required: false } },
    {
      key: "timezone",
      label: "Timezone",
      validation: { required: false },
      render: (value: any, row: LocationRow, index: number) => {
        const timezones = [
          "UTC", "America/New_York", "America/Chicago", "America/Denver",
          "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
          "America/Honolulu", "Europe/London", "Europe/Paris", "Europe/Berlin",
          "Asia/Tokyo", "Asia/Shanghai", "Asia/Dubai", "Australia/Sydney",
          "Pacific/Auckland",
        ];
        return (
          <Select
            value={value || ""}
            onValueChange={(newValue) => handleLocationRowChange(index, "timezone", newValue)}
          >
            <SelectTrigger className="w-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 rounded-none h-auto">
              <SelectValue placeholder="Choose a timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
  ];

  // Competitors handlers
  const competitorsColumns: Column<CompetitorRow>[] = [
    { key: "url", label: "URL of competitor website", validation: { required: false } },
  ];

  const handleAddCompetitorRow = () => {
    const newRow: CompetitorRow = { url: "" };
    const updatedData = [...competitorsData, newRow];
    setCompetitorsData(updatedData);
    form.setFieldValue("competitors", updatedData);
  };

  const handleCompetitorRowChange = (rowIndex: number, field: string, value: string) => {
    const updatedData = [...competitorsData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [field]: value };
    setCompetitorsData(updatedData);
    form.setFieldValue("competitors", updatedData);
    setHasChanges(true);
  };

  const handleCompetitorDeleteRow = (rowIndex: number) => {
    const updatedData = competitorsData.filter((_, index) => index !== rowIndex);
    setCompetitorsData(updatedData);
    form.setFieldValue("competitors", updatedData);
    setCompetitorsSavedRowIndices((prev) => {
      const newSaved = new Set<number>();
      prev.forEach((idx) => {
        if (idx < rowIndex) newSaved.add(idx);
        else if (idx > rowIndex) newSaved.add(idx - 1);
      });
      return newSaved;
    });
    setHasChanges(true);
  };

  const handleCompetitorSaveRow = (rowIndex: number, row: CompetitorRow) => {
    const updatedData = [...competitorsData];
    updatedData[rowIndex] = row;
    const newRow: CompetitorRow = { url: "" };
    updatedData.splice(rowIndex + 1, 0, newRow);
    setCompetitorsSavedRowIndices((prev) => {
      const newSaved = new Set<number>();
      newSaved.add(rowIndex);
      prev.forEach((idx) => {
        if (idx <= rowIndex) newSaved.add(idx);
        else newSaved.add(idx + 1);
      });
      return newSaved;
    });
    setCompetitorsData(updatedData);
    form.setFieldValue("competitors", updatedData);
  };

  // Handle Save Changes
  const handleSaveChanges = () => {
    console.log("Form Data:", form.state.values);
    // Update initial values after save
    initialValuesRef.current = JSON.stringify(form.state.values);
    setHasChanges(false);
  };

  // Handle Confirm & Proceed
  const handleConfirmAndProceed = () => {
    form.handleSubmit();
    // Navigate to strategy page or handle proceed logic
  };

  const businessName = useMemo(() => {
    const profile = profiles.find((p) => p.UniqueId === businessId)
    return profile?.Name || profile?.DisplayName || "Business"
  }, [profiles, businessId])

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: businessName },
    { label: "Profile" },
  ]

  // Cache scroll container ref
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  // Flag to prevent scroll detection from overriding clicked section
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Track the last clicked section to give it priority
  const lastClickedSectionRef = useRef<string | null>(null)

  const handleSectionClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId)
    lastClickedSectionRef.current = sectionId
    const element = document.getElementById(sectionId)
    
    if (!element) {
      console.warn(`Section with id "${sectionId}" not found`)
      return
    }

    // Set flag to prevent scroll detection from updating active section
    isScrollingRef.current = true
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Find or use cached scroll container
    if (!scrollContainerRef.current) {
      scrollContainerRef.current = findScrollableContainer(element)
    }
    
    const scrollContainer = scrollContainerRef.current
    const isWindow = !scrollContainer || scrollContainer === document.documentElement
    
    if (isWindow) {
      const rect = element.getBoundingClientRect()
      const scrollY = window.scrollY || 0
      const targetScroll = rect.top + scrollY - SCROLL_HEADER_OFFSET
      
      window.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth"
      })
    } else {
      const targetScroll = getElementScrollPosition(element, scrollContainer) - SCROLL_HEADER_OFFSET
      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth"
      })
    }
    
    // Re-enable scroll detection after smooth scroll completes
    // Use a longer timeout to ensure smooth scroll is fully complete
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false
      // Keep the clicked section active for a bit longer to ensure it's visible
      setTimeout(() => {
        lastClickedSectionRef.current = null
      }, 500)
    }, 1200)
  }, [])

  // Update active section based on scroll position
  useEffect(() => {
    // Initialize scroll container cache
    const firstSection = document.getElementById("business-info")
    if (firstSection && !scrollContainerRef.current) {
      scrollContainerRef.current = findScrollableContainer(firstSection)
    }
    
    const scrollContainer = scrollContainerRef.current
    const isWindow = !scrollContainer || scrollContainer === document.documentElement
    const targetElement = isWindow ? window : scrollContainer

    const handleScroll = () => {
      // Don't update active section if we're programmatically scrolling
      if (isScrollingRef.current) {
        return
      }
      
      // If we recently clicked a section, prioritize it
      if (lastClickedSectionRef.current) {
        const clickedElement = document.getElementById(lastClickedSectionRef.current)
        if (clickedElement) {
          const scrollPosition = isWindow 
            ? (window.scrollY || 0)
            : scrollContainer.scrollTop
          
          const elementTop = isWindow
            ? clickedElement.getBoundingClientRect().top + scrollPosition
            : getElementScrollPosition(clickedElement, scrollContainer)
          
          const viewportTop = scrollPosition + SCROLL_DETECTION_OFFSET
          const elementBottom = elementTop + clickedElement.offsetHeight
          
          // If clicked section is still in viewport, keep it active
          if (viewportTop >= elementTop && viewportTop < elementBottom) {
            setActiveSection(lastClickedSectionRef.current)
            return
          }
        }
      }
      
      const scrollPosition = isWindow 
        ? (window.scrollY || 0)
        : scrollContainer.scrollTop
      
      let currentSection = sections[0].id
      let closestToTop = Infinity
      
      // Find the section that's closest to the top of the viewport
      // This ensures we select the section actually at the top, not just any visible section
      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (!element) continue
        
        const elementTop = isWindow
          ? element.getBoundingClientRect().top + scrollPosition
          : getElementScrollPosition(element, scrollContainer)
        
        const viewportTop = scrollPosition + SCROLL_DETECTION_OFFSET
        
        // Calculate distance from viewport top to element top
        const distanceFromTop = Math.abs(elementTop - viewportTop)
        
        // Only consider sections that are at or above the viewport top
        // and find the one closest to the viewport top
        if (elementTop <= viewportTop + 50) { // Allow 50px tolerance
          if (distanceFromTop < closestToTop) {
            closestToTop = distanceFromTop
            currentSection = section.id
          }
        }
      }
      
      setActiveSection(currentSection)
    }

    targetElement.addEventListener('scroll', handleScroll, { passive: true })
    // Initial check after DOM is ready
    setTimeout(handleScroll, 100)
    
    return () => {
      if (targetElement === window) {
        window.removeEventListener('scroll', handleScroll)
      } else {
        targetElement.removeEventListener('scroll', handleScroll)
      }
      // Cleanup timeout on unmount
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const buttonText = hasChanges ? "Save Changes" : "Confirm & Proceed to Strategy";
  const handleButtonClick = hasChanges ? handleSaveChanges : handleConfirmAndProceed;

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
        />
        <ProfileContent
          form={form}
          offeringsColumns={offeringsColumns}
          offeringsData={offeringsData}
          savedRowIndices={savedRowIndices}
          onAddOfferingRow={handleAddOfferingRow}
          onRowChange={handleRowChange}
          onDeleteRow={handleDeleteRow}
          onSaveRow={handleSaveRow}
          ctaColumns={ctaColumns}
          ctasData={ctasData}
          ctasSavedRowIndices={ctasSavedRowIndices}
          onAddCTARow={handleAddCTARow}
          onCTARowChange={handleCTARowChange}
          onCTADeleteRow={handleCTADeleteRow}
          onCTASaveRow={handleCTASaveRow}
          stakeholdersColumns={stakeholdersColumns}
          stakeholdersData={stakeholdersData}
          stakeholdersSavedRowIndices={stakeholdersSavedRowIndices}
          onAddStakeholderRow={handleAddStakeholderRow}
          onStakeholderRowChange={handleStakeholderRowChange}
          onStakeholderDeleteRow={handleStakeholderDeleteRow}
          onStakeholderSaveRow={handleStakeholderSaveRow}
          locationsColumns={locationsColumns}
          locationsData={locationsData}
          locationsSavedRowIndices={locationsSavedRowIndices}
          onAddLocationRow={handleAddLocationRow}
          onLocationRowChange={handleLocationRowChange}
          onLocationDeleteRow={handleLocationDeleteRow}
          onLocationSaveRow={handleLocationSaveRow}
          competitorsColumns={competitorsColumns}
          competitorsData={competitorsData}
          competitorsSavedRowIndices={competitorsSavedRowIndices}
          onAddCompetitorRow={handleAddCompetitorRow}
          onCompetitorRowChange={handleCompetitorRowChange}
          onCompetitorDeleteRow={handleCompetitorDeleteRow}
          onCompetitorSaveRow={handleCompetitorSaveRow}
        />
      </div>
    </div>
  )
}

export default ProfileTemplate
