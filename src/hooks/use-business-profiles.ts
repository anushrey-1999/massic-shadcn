import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useBusinessStore, BusinessProfile } from "@/store/business-store";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

const BUSINESS_PROFILES_KEY = "businessProfiles";

// Extract query function to reuse in mutation
async function fetchBusinessProfiles(userUniqueId: string | undefined): Promise<BusinessProfile[]> {
  if (!userUniqueId) {
    return [];
  }

  const response = await api.get<{ err: boolean; data: string; message?: string }>(
    `/profile/get-user-business-profiles/?useruniqueId=${userUniqueId}`,
    "node"
  );

  if (!response.err && response.data) {
    const parsedProfiles: BusinessProfile[] = JSON.parse(response.data);
    return parsedProfiles;
  }

  return [];
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
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    profiles,
    sidebarDataLoading,
    isFetching,
    expandedBusinessId,
    refetchBusinessProfiles: refetch,
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
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
        accountUniqueId: "",
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
            primaryLocation: {
              Location: location,
              Country: country,
            },
            userUniqueId,
          },
        ],
      };

      const response = await api.post<any>(
        "/profile/create-agency-businesses",
        "node",
        payload
      );

      // Check if the API returned an error
      // Response might be { status: 200, ... } or { err: false, ... } or direct data
      const status = response.status || (response.err === false ? 200 : undefined);
      const hasError = response.err === true || (status !== undefined && status !== 200);

      if (hasError) {
        const errorMessage =
          response.message ||
          response.data?.message ||
          response.response?.data?.message ||
          "Failed to create business";
        throw new Error(errorMessage);
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

