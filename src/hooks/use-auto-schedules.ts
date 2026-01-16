"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiPlatform } from "./use-api";
import type {
  CreateAutoScheduleRequest,
  CreateAutoScheduleResponse,
  UpdateAutoScheduleRequest,
  AutoSchedule,
} from "@/types/auto-schedule-types";

export function useCreateAutoSchedule() {
  const queryClient = useQueryClient();
  const platform: ApiPlatform = "node";

  return useMutation<CreateAutoScheduleResponse, Error, CreateAutoScheduleRequest>({
    mutationFn: async (data) => {
      if (!data.businessId) {
        throw new Error("Business ID is required");
      }

      const response = await api.post<CreateAutoScheduleResponse>(
        `/reports/auto-schedules`,
        platform,
        data
      );

      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["auto-schedules", variables.businessId],
      });
    },
  });
}

export function useGetAutoScheduleByBusiness(businessId: string) {
  const platform: ApiPlatform = "node";

  return useQuery<AutoSchedule | null, Error>({
    queryKey: ["auto-schedules", businessId],
    queryFn: async () => {
      if (!businessId) {
        return null;
      }

      try {
        const response = await api.get<AutoSchedule>(
          `/reports/auto-schedules/business/${businessId}`,
          platform
        );
        return response;
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!businessId,
  });
}

export function useUpdateAutoSchedule() {
  const queryClient = useQueryClient();
  const platform: ApiPlatform = "node";

  return useMutation<
    AutoSchedule,
    Error,
    { id: string; data: UpdateAutoScheduleRequest; businessId: string }
  >({
    mutationFn: async ({ id, data }) => {
      if (!id) {
        throw new Error("Schedule ID is required");
      }

      const response = await api.put<AutoSchedule>(
        `/reports/auto-schedules/${id}`,
        platform,
        data
      );

      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["auto-schedules", variables.businessId],
      });
    },
  });
}

