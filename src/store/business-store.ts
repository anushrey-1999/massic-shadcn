import { create } from "zustand";

export interface BusinessLocation {
  Name: string;
  DisplayName: string;
}

export interface BusinessProfile {
  UniqueId: string;
  Id?: string;
  Name: string;
  DisplayName?: string;
  Website?: string;
  Description?: string;
  UserDefinedBusinessDescription?: string;
  AOV?: number | null;
  LTV?: number | null;
  BrandTerms?: string[] | null;
  RecurringFlag?: "yes" | "no" | "partial" | string | null;
  ProductsServices?: string[];
  LocationType?: string;
  Locations?: BusinessLocation[];
  isTrialActive?: boolean;
  remainingTrialDays?: number;
  TrialStartDate?: string;
  TrialEndDate?: string;
  CustomerPersonas?: { personName: string; personDescription: string }[] | null;
  SellingPoints?: string[] | null;
  USPs?: string[] | null;
  BusinessObjective?: string | null;
  Competitors?: { name: string; website: string }[] | null;
  CalendarEvents?: CalendarEventRow[] | null;
  SubscriptionItems?: {
    plan_type?: string;
    status?: string;
    cancel_at_period_end?: boolean;
    cancelled_date?: string;
    current_period_start?: string;
    current_period_end?: string;
    [key: string]: any;
  };
  LinkedAuthId?: string | null;
  IsActive?: boolean;
  isWhitelisted?: boolean;
}

// Profile form table row types
export type OfferingRow = {
  name: string;
  description: string;
  link: string;
};

export type CTARow = {
  buttonText: string;
  url: string;
};

export type StakeholderRow = {
  name: string;
  title: string;
};

export type LocationRow = {
  name: string;
  address: string;
  timezone: string;
};

export type CompetitorRow = {
  url: string;
};

export type CalendarEventRow = {
  eventName: string;
  startDate: string | null;
  endDate: string | null;
};

export type LocationOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

interface ProfileFormState {
  // Location options
  locationOptions: LocationOption[];
  locationsLoading: boolean;

  // UI state
  activeSection: string;
  currentBusinessId: string | null;
}

interface BusinessState {
  profiles: BusinessProfile[];
  error: string | null;
  expandedBusinessId: string | null;
  profileDataByUniqueID: BusinessProfile | null;

  // Profile form state
  profileForm: ProfileFormState;

  // Actions
  setBusinessProfiles: (profiles: BusinessProfile[]) => void;
  resetBusinessProfiles: () => void;
  setError: (error: string | null) => void;
  setExpandedBusinessId: (id: string | null) => void;
  setProfileDataByUniqueID: (data: BusinessProfile | null) => void;

  // Profile form actions
  setLocationOptions: (options: LocationOption[]) => void;
  setLocationsLoading: (loading: boolean) => void;

  setActiveSection: (section: string) => void;
  setCurrentBusinessId: (id: string | null) => void;

  // Reset profile form state
  resetProfileForm: () => void;
}

const initialProfileFormState: ProfileFormState = {
  locationOptions: [],
  locationsLoading: false,
  activeSection: "business-info",
  currentBusinessId: null,
};

export const useBusinessStore = create<BusinessState>()((set) => ({
  profiles: [],
  error: null,
  expandedBusinessId: null,
  profileDataByUniqueID: null,
  profileForm: initialProfileFormState,

  setBusinessProfiles: (profiles) => set({ profiles }),

  resetBusinessProfiles: () => set({ profiles: [] }),

  setError: (error) => set({ error }),

  setExpandedBusinessId: (id) => set({ expandedBusinessId: id }),

  setProfileDataByUniqueID: (data) => set({ profileDataByUniqueID: data }),

  // Profile form actions
  setLocationOptions: (options) => set((state) => {
    // Only update if options actually changed
    if (state.profileForm.locationOptions === options) {
      return state; // Return same state to prevent re-render
    }
    return {
      profileForm: { ...state.profileForm, locationOptions: options }
    };
  }),

  setLocationsLoading: (loading) => set((state) => {
    // Only update if loading state actually changed
    if (state.profileForm.locationsLoading === loading) {
      return state; // Return same state to prevent re-render
    }
    return {
      profileForm: { ...state.profileForm, locationsLoading: loading }
    };
  }),

  setActiveSection: (section) => set((state) => ({
    profileForm: { ...state.profileForm, activeSection: section }
  })),

  setCurrentBusinessId: (id) => set((state) => ({
    profileForm: { ...state.profileForm, currentBusinessId: id }
  })),

  resetProfileForm: () => set({ profileForm: initialProfileFormState }),
}));
