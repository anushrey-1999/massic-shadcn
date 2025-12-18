import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useAuthStore } from "@/store/auth-store";
import { useBusinessStore } from "@/store/business-store";
import { toast } from "sonner";

const LINKED_BUSINESSES_KEY = "linkedBusinesses";

export interface GA4Property {
  displayName: string;
  propertyDisplayName?: string;
  propertyId: string;
  accountName: string;
  accountId: string;
}

export interface GBPLocation {
  title: string;
  locationId: string;
  location: string;
  account?: string;
  websiteUri?: string;
}

export interface BusinessProfile {
  Id: string;
  UniqueId?: string;
  IsActive: boolean;
  NoLocationExist?: boolean;
  Locations?: { Name: string; DisplayName?: string }[];
}

export interface LinkedBusiness {
  id?: string;
  siteUrl: string;
  displayName: string;
  authId: string;
  title?: string;
  matchedGa4?: GA4Property;
  matchedGa4Multiple?: GA4Property[];
  selectedGa4?: GA4Property;
  linkedPropertyId?: GA4Property & { PropertyId?: string };
  matchedGbp?: GBPLocation[];
  selectedGbp?: GBPLocation[];
  gbps?: GBPLocation[];
  businessProfile?: BusinessProfile;
  noLocation?: boolean;
}

export interface FetchBusinessesResponse {
  businesses: LinkedBusiness[];
  allGBP: GBPLocation[];
  unmatchedGa4: GA4Property[];
}

interface CreateBusinessPayload {
  userUniqueId: string;
  accountUniqueId: string;
  businesses: {
    name: string;
    description: string;
    website: string;
    displayName: string;
    locationType: string;
    propertyId: string;
    locations: { DisplayName: string; Url: string; Name: string; AccountName: string }[];
    NoLocationExist: boolean;
    category: string;
    brandVoice: string;
    productsServices: any[];
    customerPersonas: null;
    sellingPoints: null;
    businessObjective: string;
    competitors: null;
    uniqueId: string;
    userUniqueId: string;
  }[];
}

interface LinkPropertyPayload {
  websiteUri: string;
  propertyId: string;
  locations: { DisplayName: string; Url: string; Name: string; AccountName: string }[];
  NoLocationExist: boolean;
}

interface BusinessStatusPayload {
  businessId: string;
  isActive: boolean;
}

export function useFetchBusinesses() {
  const { user, isAuthenticated } = useAuthStore();
  const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;

  return useQuery<FetchBusinessesResponse>({
    queryKey: [LINKED_BUSINESSES_KEY, userUniqueId],
    queryFn: async () => {
      if (!userUniqueId) {
        return { businesses: [], allGBP: [], unmatchedGa4: [] };
      }

      const response = await api.get<{ err?: boolean; data?: FetchBusinessesResponse; message?: string }>(
        `/fetch-businesses?userUniqueId=${userUniqueId}`,
        "node"
      );

      if (response.err) {
        throw new Error(response.message || "Failed to fetch businesses");
      }

      const data = response.data || { businesses: [], allGBP: [], unmatchedGa4: [] };

      // Process businesses to add selectedGbp and selectedGa4 based on businessProfile
      const processedBusinesses = data.businesses.map((business) => {
        const selectedGbp = getSelectedGbp(business, data.allGBP || []);
        const noLocation = business.businessProfile?.NoLocationExist === true;

        // Set default selectedGa4 from linkedPropertyId or matchedGa4
        const selectedGa4 = business.selectedGa4 ||
          (business.linkedPropertyId ? {
            displayName: business.linkedPropertyId.displayName,
            propertyId: business.linkedPropertyId.PropertyId || business.linkedPropertyId.propertyId,
            accountName: business.linkedPropertyId.accountName,
            accountId: business.linkedPropertyId.accountId,
          } : business.matchedGa4) ||
          (business.matchedGa4Multiple?.[0]);

        return { ...business, selectedGbp, noLocation, selectedGa4 };
      });

      return {
        ...data,
        businesses: processedBusinesses,
      };
    },
    enabled: isAuthenticated && !!userUniqueId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

function getSelectedGbp(business: LinkedBusiness, allGBP: GBPLocation[]): GBPLocation[] {
  const { businessProfile, matchedGbp } = business;

  if (businessProfile?.Id) {
    if (businessProfile.NoLocationExist === true) {
      return [{
        title: "No locations exist",
        location: "no-location-exist",
        locationId: "no-location-exist",
      } as GBPLocation];
    }

    const businessLocations = businessProfile.Locations?.map((loc) => loc.Name) || [];
    return allGBP
      .filter((gbp) => businessLocations.includes(gbp.location))
      .map((gbp) => ({ ...gbp, label: `${gbp.title} (${gbp.locationId})` } as GBPLocation));
  }

  if (matchedGbp?.length) {
    return matchedGbp.map((gbp) => ({ ...gbp, label: `${gbp.title} (${gbp.locationId})` } as GBPLocation));
  }

  return [];
}

export function useCreateAgencyBusiness() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { setBusinessProfiles } = useBusinessStore();
  const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;

  return useMutation<void, Error, LinkedBusiness[]>({
    mutationFn: async (businesses: LinkedBusiness[]) => {
      if (!userUniqueId) {
        throw new Error("User not authenticated");
      }

      const validBusinesses = businesses.filter((b) => {
        const hasGsc = b.siteUrl || b.displayName;
        return !b.linkedPropertyId && hasGsc;
      });

      if (validBusinesses.length === 0) {
        toast.info("No businesses to link");
        return;
      }

      // Group by authId
      const grouped = validBusinesses.reduce((acc, business) => {
        const authId = business.authId || "";
        if (!acc[authId]) acc[authId] = [];
        acc[authId].push(business);
        return acc;
      }, {} as Record<string, LinkedBusiness[]>);

      for (const authId in grouped) {
        const businessList = grouped[authId];

        const payload: CreateBusinessPayload = {
          userUniqueId,
          accountUniqueId: authId,
          businesses: businessList.map((b) => ({
            name: b.title || "",
            description: "",
            website: b.siteUrl || "",
            displayName: b.title || "",
            locationType: "global",
            propertyId: b.matchedGa4?.propertyId ?? b.selectedGa4?.propertyId ?? "",
            locations: b.noLocation ? [] :
              (b.selectedGbp?.map((gbp) => ({
                DisplayName: gbp.title || "",
                Url: gbp.websiteUri || "",
                Name: gbp.location || "",
                AccountName: gbp.account || "",
              })) || []),
            NoLocationExist: b.noLocation || false,
            category: "",
            brandVoice: "",
            productsServices: [],
            customerPersonas: null,
            sellingPoints: null,
            businessObjective: "",
            competitors: null,
            uniqueId: "",
            userUniqueId,
          })),
        };

        const response = await api.post<any>(
          "/profile/create-agency-businesses",
          "node",
          payload
        );

        if (response.status !== 200 && response.err !== false) {
          throw new Error(response.message || response.response?.data?.message || "Failed to connect businesses");
        }
      }
    },
    onSuccess: () => {
      toast.success("Businesses connected successfully");
      queryClient.invalidateQueries({ queryKey: [LINKED_BUSINESSES_KEY] });
      queryClient.invalidateQueries({ queryKey: ["businessProfiles"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to connect businesses", {
        description: error.message || "Please try again later.",
      });
    },
  });
}

export function useLinkPropertyId() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { business: LinkedBusiness }>({
    mutationFn: async ({ business }) => {
      const selectedGa4 = business.selectedGa4;

      const payload: LinkPropertyPayload = {
        websiteUri: business.siteUrl,
        propertyId: selectedGa4?.propertyId || "",
        locations: business.noLocation ? [] :
          (business.selectedGbp?.map((gbp) => ({
            DisplayName: gbp.title || "",
            Url: gbp.websiteUri || "",
            Name: gbp.location || "",
            AccountName: gbp.account || "",
          })) || []),
        NoLocationExist: business.noLocation || false,
      };

      const response = await api.post<{ err?: boolean; message?: string }>(
        "/link-property-id",
        "node",
        payload
      );

      if (response.err !== false) {
        throw new Error(response.message || "Failed to link property");
      }
    },
    onSuccess: () => {
      toast.success("Changes saved successfully");
      queryClient.invalidateQueries({ queryKey: [LINKED_BUSINESSES_KEY] });
      queryClient.invalidateQueries({ queryKey: ["businessProfiles"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to save changes", {
        description: error.message || "Please try again later.",
      });
    },
  });
}

export function useToggleBusinessStatus() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { business: LinkedBusiness }>({
    mutationFn: async ({ business }) => {
      const hasBusinessProfile = business.businessProfile?.Id;

      if (!hasBusinessProfile) {
        throw new Error("Please link the business before you can enable or disable it.");
      }

      const isCurrentlyActive = business.businessProfile?.IsActive;
      const businessId = business.businessProfile?.Id;
      const businessUniqueId = business.businessProfile?.UniqueId;

      // Old UI behavior: if unlinking, cancel subscription first (best-effort)
      if (isCurrentlyActive) {
        try {
          if (businessUniqueId) {
            await api.post(`/billing/businesses/${businessUniqueId}/cancel`, "node");
          }
        } catch {
          // ignore: business might not have a subscription or cancellation might fail
        }
      }

      const payload: BusinessStatusPayload = {
        businessId: businessId!,
        isActive: !isCurrentlyActive,
      };

      const response = await api.put<{ err?: boolean; message?: string }>(
        "/business-status",
        "node",
        payload
      );

      if (response.err !== false) {
        throw new Error(response.message || "Failed to toggle business status");
      }
    },
    onSuccess: (_, variables) => {
      const wasActive = variables.business.businessProfile?.IsActive;
      toast.success(`Business ${wasActive ? "unlinked" : "linked"} successfully`);
      queryClient.invalidateQueries({ queryKey: [LINKED_BUSINESSES_KEY] });
      queryClient.invalidateQueries({ queryKey: ["businessProfiles"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to toggle business status", {
        description: error.message || "Please try again later.",
      });
    },
  });
}
