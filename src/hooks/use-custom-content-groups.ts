import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";
import type {
  CustomContentGroup,
  CustomContentGroupPreview,
} from "@/utils/custom-content-groups";
import {
  normalizeCustomContentGroupsFromApi,
  serializeCustomContentGroupsForApi,
} from "@/utils/custom-content-groups";
import type { TimePeriodValue } from "@/utils/analytics-period";

interface BusinessSettingsResponse {
  err: boolean;
  data?: string;
  message?: string;
}

interface PreviewResponse {
  err: boolean;
  data?: CustomContentGroupPreview;
  message?: string;
}

export function useCustomContentGroups(businessUniqueId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<CustomContentGroup[]>({
    queryKey: ["custom-content-groups", businessUniqueId],
    queryFn: async () => {
      if (!businessUniqueId) return [];

      const response = await api.get<BusinessSettingsResponse>(
        `/profile/business-settings?businessUniqueId=${encodeURIComponent(businessUniqueId)}`,
        "node"
      );

      if (response.err || !response.data) {
        return [];
      }

      const parsed = JSON.parse(response.data);
      const rawGroups = parsed.ContentGroups ? JSON.parse(parsed.ContentGroups) : [];
      return normalizeCustomContentGroupsFromApi(rawGroups);
    },
    enabled: !!businessUniqueId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (groups: CustomContentGroup[]) => {
      if (!businessUniqueId) {
        throw new Error("Business ID is required");
      }

      await api.put(
        "/profile/business-settings",
        "node",
        {
          uniqueId: businessUniqueId,
          contentGroups: serializeCustomContentGroupsForApi(groups),
        }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["custom-content-groups", businessUniqueId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["gsc-content-groups"],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["ga4-content-groups"],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["gsc-deepdive-content-group"],
        exact: false,
      });
      toast.success("Custom content groups updated");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update custom content groups");
    },
  });

  return {
    groups: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    saveGroups: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}

export function useCustomContentGroupPreview({
  businessUniqueId,
  siteUrl,
  period,
  trafficScope = "organic",
}: {
  businessUniqueId: string | null;
  siteUrl: string | null;
  period: TimePeriodValue;
  trafficScope?: "all" | "organic";
}) {
  return useMutation({
    mutationFn: async (contentGroup: CustomContentGroup): Promise<CustomContentGroupPreview> => {
      if (!businessUniqueId || !siteUrl) {
        return { count: 0, pages: [], remainingCount: 0 };
      }

      const response = await api.post<PreviewResponse>(
        "/profile/business-settings/content-groups/preview",
        "node",
        {
          businessUniqueId,
          siteUrl,
          period,
          trafficScope,
          contentGroup,
        }
      );

      if (response.err || !response.data) {
        return { count: 0, pages: [], remainingCount: 0 };
      }

      return response.data;
    },
  });
}
