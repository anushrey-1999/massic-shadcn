import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useBusinessStore, BusinessProfile } from "@/store/business-store";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

const BUSINESS_PROFILES_KEY = "businessProfiles";

// Extract query function to reuse in mutation
async function fetchBusinessProfiles(
  userUniqueId: string | undefined,
  isPitch?: boolean
): Promise<BusinessProfile[]> {
  if (!userUniqueId) {
    return [];
  }

  let url = `/profile/get-user-business-profiles/?useruniqueId=${userUniqueId}`;
  if (isPitch !== undefined) {
    url += `&isPitch=${isPitch}`;
  }

  const response = await api.get<{ err: boolean; data: string; message?: string }>(
    url,
    "node"
  );

  if (!response.err && response.data) {
    const parsedProfiles: BusinessProfile[] = JSON.parse(response.data);
    return parsedProfiles;
  }

  return [];
}

export async function fetchPitchBusinessProfiles(userUniqueId: string | undefined): Promise<BusinessProfile[]> {
  return fetchBusinessProfiles(userUniqueId, true);
}

export function useBusinessProfiles() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    expandedBusinessId,
    setBusinessProfiles,
    setError,
  } = useBusinessStore();

  const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;

  const {
    data: profiles = [],
    isLoading: sidebarDataLoading,
    isFetching,
    refetch,
  } = useQuery<BusinessProfile[]>({
    queryKey: [BUSINESS_PROFILES_KEY, userUniqueId],
    queryFn: async () => {
      if (!userUniqueId) {
        console.warn("[useBusinessProfiles] No userUniqueId found. User object:", user);
        return [];
      }

      const parsedProfiles = await fetchBusinessProfiles(userUniqueId);
      setBusinessProfiles(parsedProfiles);
      return parsedProfiles;
    },
    enabled: isAuthenticated && !!userUniqueId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnReconnect: true, // Refetch when network reconnects
    structuralSharing: true, // Prevent unnecessary re-renders when data hasn't changed
  });

  return {
    profiles,
    sidebarDataLoading,
    isFetching,
    expandedBusinessId,
    refetchBusinessProfiles: refetch,
  };
}

export function usePitchBusinesses() {
  const { user, isAuthenticated } = useAuthStore();
  const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;

  const {
    data: pitchBusinesses = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<BusinessProfile[]>({
    queryKey: ["pitchBusinesses", userUniqueId],
    queryFn: async () => {
      if (!userUniqueId) {
        return [];
      }

      return fetchBusinessProfiles(userUniqueId, true);
    },
    enabled: isAuthenticated && !!userUniqueId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    pitchBusinesses,
    isLoading,
    isFetching,
    refetch,
  };
}

export function useBusinessProfileById(businessUniqueId: string | null) {
  const { setProfileDataByUniqueID } = useBusinessStore();

  const {
    data: profileData,
    isLoading: profileDataLoading,
    refetch,
  } = useQuery<BusinessProfile | null>({
    queryKey: [BUSINESS_PROFILES_KEY, "detail", businessUniqueId],
    queryFn: async () => {
      if (!businessUniqueId) {
        return null;
      }

      const response = await api.get<{ err: boolean; data: string; message?: string }>(
        `/profile/get-business-profile/?uniqueId=${businessUniqueId}`,
        "node"
      );

      if (!response.err && response.data) {
        const parsedProfile: BusinessProfile = JSON.parse(response.data);
        setProfileDataByUniqueID(parsedProfile);
        return parsedProfile;
      }

      setProfileDataByUniqueID(null);
      return null;
    },
    enabled: !!businessUniqueId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnReconnect: true, // Refetch when network reconnects
    structuralSharing: true, // Prevent unnecessary re-renders when data hasn't changed
  });

  return {
    profileData,
    profileDataLoading,
    refetchProfile: refetch,
  };
}

interface CreateBusinessPayload {
  website: string;
  businessName: string;
  primaryLocation: string; // Format: "Location,Country" or just "Location"
  serveCustomers: "local" | "online";
  offerType: "products" | "services";
  isPitch?: boolean; // Set to true when created from /create-pitch
}

interface CreateBusinessResponse {
  status: number;
  data?: any;
  err?: boolean;
  message?: string;
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;

  return useMutation<
    { formData: CreateBusinessPayload; createdBusiness: BusinessProfile | null },
    Error,
    CreateBusinessPayload
  >({
    mutationFn: async (formData: CreateBusinessPayload) => {
      if (!userUniqueId) {
        throw new Error("User not authenticated");
      }

      // Parse primaryLocation - it might be "Location,Country" or just "Location"
      const locationParts = formData.primaryLocation.split(",");
      const location = locationParts[0]?.trim() || "";
      const country = locationParts[1]?.trim() || "united states";

      // Map form data to API payload structure
      const payload = {
        userUniqueId,
        accountUniqueId: null,
        businesses: [
          {
            name: formData.businessName,
            description: "",
            website: formData.website,
            displayName: formData.businessName,
            locationType: formData.offerType, // products/services
            propertyId: "",
            category: "",
            brandVoice: "",
            businessModel: "",
            productsServices: [],
            locations: null,
            customerPersonas: null,
            sellingPoints: null,
            businessObjective: formData.serveCustomers, // local/online
            competitors: null,
            uniqueId: "",
            isPitch: formData.isPitch === true ? true : false, // Set IsPitch flag based on payload
            primaryLocation: {
              Location: location,
              Country: country,
            },
            userUniqueId,
          },
        ],
      };

      let response: any;
      try {
        response = await api.post<any>(
          "/profile/create-agency-businesses",
          "node",
          payload
        );

        // Check if the API returned an error in the response body
        if (response.err === true || response.success === false) {
          throw new Error(response.message || "Failed to create business");
        }
      } catch (error: any) {
        // If axios error with response (status code error like 409)
        if (error.response?.data) {
          const errorData = error.response.data;
          throw new Error(errorData.message || errorData.error || "Failed to create business");
        }
        throw error;
      }

      // Invalidate and refetch business profiles to get the newly created one
      await queryClient.invalidateQueries({
        queryKey: [BUSINESS_PROFILES_KEY, userUniqueId],
      });

      // Refetch using the same query function (reusing fetchBusinessProfiles)
      const updatedProfiles = await fetchBusinessProfiles(userUniqueId);

      // Update the store
      const { setBusinessProfiles } = useBusinessStore.getState();
      setBusinessProfiles(updatedProfiles);

      // Find the created business by matching website
      let createdBusiness: BusinessProfile | null = null;

      if (updatedProfiles && Array.isArray(updatedProfiles) && updatedProfiles.length > 0) {
        const websiteInput = formData.website.toLowerCase().trim();
        const matchedProfile = updatedProfiles.find((profile: BusinessProfile) => {
          const profileWebsite = profile.Website?.toLowerCase().trim() || "";
          return (
            profileWebsite.includes(websiteInput) ||
            websiteInput.includes(profileWebsite)
          );
        });

        createdBusiness =
          matchedProfile || updatedProfiles[updatedProfiles.length - 1] || null;
      }

      return { formData, createdBusiness };
    },
    onSuccess: () => {
      toast.success("Business is created");
    },
    onError: (error: Error) => {
      toast.error("Failed to create business", {
        description: error.message || "Please try again later.",
      });
    },
  });
}

interface UpdateBusinessProfilePayload {
  [key: string]: any; // Flexible payload structure matching BusinessProfile
}

export function useUpdateBusinessProfile(businessUniqueId: string | null) {
  const queryClient = useQueryClient();
  const { setProfileDataByUniqueID } = useBusinessStore();

  return useMutation<
    BusinessProfile,
    Error,
    UpdateBusinessProfilePayload
  >({
    mutationFn: async (payload: UpdateBusinessProfilePayload) => {
      if (!businessUniqueId) {
        throw new Error("Business ID is required");
      }

      // Ensure uniqueId is in the payload
      const payloadWithId = {
        ...payload,
        UniqueId: businessUniqueId,
      };

      const response = await api.post<{
        status?: number;
        err?: boolean;
        data?: string;
        message?: string;
        response?: {
          data?: {
            message?: string;
          };
        };
      }>(
        `/profile/update-business-profile`,
        "node",
        payloadWithId
      );

      // Check for errors - API might return status 200 with err: true, or status !== 200
      const hasError = response.err === true ||
        (response.status !== undefined && response.status !== 200);

      if (hasError) {
        const errorMessage =
          response.message ||
          response.response?.data?.message ||
          "Failed to update business profile";
        throw new Error(errorMessage);
      }

      const updatedProfile = payloadWithId as BusinessProfile;

      // Optimistic update: Update React Query cache immediately
      queryClient.setQueryData<BusinessProfile>(
        [BUSINESS_PROFILES_KEY, "detail", businessUniqueId],
        updatedProfile
      );

      // Update the store with the payload data immediately
      setProfileDataByUniqueID(updatedProfile);

      // Update the profile in the list cache if it exists
      const { user } = useAuthStore.getState();
      const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;
      if (userUniqueId) {
        queryClient.setQueryData<BusinessProfile[]>(
          [BUSINESS_PROFILES_KEY, userUniqueId],
          (oldProfiles) => {
            if (!oldProfiles) return oldProfiles;
            return oldProfiles.map((profile) =>
              profile.UniqueId === businessUniqueId ? updatedProfile : profile
            );
          }
        );
      }

      // Invalidate queries in the background to sync with server (non-blocking)
      queryClient.invalidateQueries({
        queryKey: [BUSINESS_PROFILES_KEY, "detail", businessUniqueId],
        refetchType: "none", // Don't refetch immediately, just mark as stale
      });

      if (userUniqueId) {
        queryClient.invalidateQueries({
          queryKey: [BUSINESS_PROFILES_KEY, userUniqueId],
          refetchType: "none", // Don't refetch immediately, just mark as stale
        });
      }

      // Return the updated profile (optimistic update)
      return updatedProfile;
    },
    onSuccess: () => {
      toast.success("Business profile updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update business profile", {
        description: error.message || "Please try again later.",
      });
    },
  });
}

