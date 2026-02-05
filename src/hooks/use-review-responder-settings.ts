import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";

// Response mode mapping between API and UI
export type ApiResponseMode = "all" | "only_4_and_above" | "manual";
export type UiResponseMode = "all" | "only_4_plus" | "manual";

export interface ReviewResponderSetting {
  LocationId: string;
  LocationName: string;
  ResponseMode: ApiResponseMode;
  NegativeReviewContactEmail: string;
}

export interface BusinessProfileSettings {
  UniqueId: string;
  UserUniqueId: string;
  ContentGroups: any[];
  ReviewResponderSettings: ReviewResponderSetting[];
  IsActive: boolean;
}

interface BusinessProfileSettingsResponse {
  err: boolean;
  message: string;
  data: BusinessProfileSettings;
}

interface UpdateReviewResponderSettingsParams {
  businessUniqueId: string;
  userUniqueId: string;
  locationId: string;
  settings: {
    ResponseMode: ApiResponseMode;
    NegativeReviewContactEmail: string;
  };
}

interface UpdateReviewResponderSettingsResponse {
  success: boolean;
  message: string;
}

// Map UI response mode to API format
export function uiToApiResponseMode(uiMode: UiResponseMode): ApiResponseMode {
  if (uiMode === "only_4_plus") return "only_4_and_above";
  return uiMode;
}

// Map API response mode to UI format
export function apiToUiResponseMode(apiMode: ApiResponseMode): UiResponseMode {
  if (apiMode === "only_4_and_above") return "only_4_plus";
  return apiMode;
}

/**
 * Fetch business profile settings including review responder settings
 */
export function useBusinessProfileSettings(
  businessUniqueId: string | null | undefined,
  userUniqueId: string | null | undefined
) {
  return useQuery<BusinessProfileSettingsResponse>({
    queryKey: ["businessProfileSettings", businessUniqueId, userUniqueId],
    queryFn: async () => {
      if (!businessUniqueId || !userUniqueId) {
        throw new Error("Business ID and User ID are required");
      }

      const params = new URLSearchParams({
        businessUniqueId,
        userUniqueId,
      });

      const response = await api.get<BusinessProfileSettingsResponse>(
        `/profile/business-settings?${params.toString()}`,
        "node"
      );

      if (response.err) {
        throw new Error(response.message || "Failed to fetch business profile settings");
      }

      return response;
    },
    enabled: !!businessUniqueId && !!userUniqueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Update review responder settings for a specific location
 */
export function useUpdateReviewResponderSettings() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateReviewResponderSettingsResponse,
    Error,
    UpdateReviewResponderSettingsParams
  >({
    mutationFn: async (params) => {
      const response = await api.put<UpdateReviewResponderSettingsResponse>(
        "/reviews/responder-settings",
        "node",
        params
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to update review responder settings");
      }

      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch business profile settings
      queryClient.invalidateQueries({
        queryKey: ["businessProfileSettings", variables.businessUniqueId, variables.userUniqueId],
      });

      toast.success("Review responder settings updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update review responder settings");
    },
  });
}

/**
 * Get review responder settings for a specific location
 */
export function useLocationResponderSettings(
  businessUniqueId: string | null | undefined,
  userUniqueId: string | null | undefined,
  locationId: string | null | undefined
) {
  const { data, isLoading, error, refetch } = useBusinessProfileSettings(businessUniqueId, userUniqueId);

  const locationSettings = React.useMemo(() => {
    if (!data?.data?.ReviewResponderSettings || !locationId) {
      return null;
    }

    return data.data.ReviewResponderSettings.find(
      (setting) => setting.LocationId === locationId
    );
  }, [data, locationId]);

  return {
    settings: locationSettings,
    isLoading,
    error,
    refetch,
  };
}

// Add React import for useMemo
import React from "react";
