import { create } from "zustand";

export interface BusinessLocation {
  Name: string;
  DisplayName: string;
}

export interface BusinessProfile {
  UniqueId: string;
  Name: string;
  DisplayName?: string;
  Website?: string;
  Description?: string;
  ProductsServices?: string[];
  LocationType?: string;
  Locations?: BusinessLocation[];
  CustomerPersonas?: { personName: string; personDescription: string }[] | null;
  SellingPoints?: string[] | null;
  BusinessObjective?: string | null;
  Competitors?: { name: string; website: string }[] | null;
  SubscriptionItems?: {
    plan_type?: string;
    status?: string;
    [key: string]: any;
  };
}

interface BusinessState {
  profiles: BusinessProfile[];
  error: string | null;
  expandedBusinessId: string | null;
  profileDataByUniqueID: BusinessProfile | null;

  setBusinessProfiles: (profiles: BusinessProfile[]) => void;
  resetBusinessProfiles: () => void;
  setError: (error: string | null) => void;
  setExpandedBusinessId: (id: string | null) => void;
  setProfileDataByUniqueID: (data: BusinessProfile | null) => void;
}

export const useBusinessStore = create<BusinessState>()((set) => ({
  profiles: [],
  error: null,
  expandedBusinessId: null,
  profileDataByUniqueID: null,

  setBusinessProfiles: (profiles) => set({ profiles }),

  resetBusinessProfiles: () => set({ profiles: [] }),

  setError: (error) => set({ error }),

  setExpandedBusinessId: (id) => set({ expandedBusinessId: id }),

  setProfileDataByUniqueID: (data) => set({ profileDataByUniqueID: data }),
}));
