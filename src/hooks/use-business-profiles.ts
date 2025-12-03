import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useBusinessStore, BusinessProfile } from "@/store/business-store";
import { useAuthStore } from "@/store/auth-store";

const BUSINESS_PROFILES_KEY = "businessProfiles";

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

      const response = await api.get<{ err: boolean; data: string; message?: string }>(
        `/profile/get-user-business-profiles/?useruniqueId=${userUniqueId}`,
        "node"
      );

      if (!response.err && response.data) {
        const parsedProfiles: BusinessProfile[] = JSON.parse(response.data);
        setBusinessProfiles(parsedProfiles);
        return parsedProfiles;
      }

      setBusinessProfiles([]);
      return [];
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

