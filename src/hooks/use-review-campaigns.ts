"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";

export type CampaignActivityPayload = {
  Type: "EMAIL" | "SMS";
  SequenceDays: number;
  OrderIndex: number;
  Subject?: string | null;
  Content: string;
  ButtonText?: string | null;
};

export type CreateCampaignPayload = {
  businessId: string;
  locationId: string;
  name: string;
  reviewDestinationUrl: string;
  triggerType: "MANUAL" | "AUTO";
  isDefault: boolean;
  isActive: boolean;
  timezone: string;
  activities: CampaignActivityPayload[];
  replaceDefault?: boolean;
};

export type DefaultCampaignConflictError = Error & {
  code?: "DEFAULT_CAMPAIGN_EXISTS" | "CAMPAIGN_NAME_EXISTS";
  existingCampaign?: { id: string; name: string } | null;
};

type CreateCampaignResponse = {
  err: boolean;
  data?: any;
  message?: string;
};

export type DefaultCampaignTemplate = {
  Id: number;
  Type: "EMAIL" | "SMS";
  Subject: string | null;
  Content: string;
  ButtonText: string | null;
  DefaultSequenceDays: number;
};

type DefaultTemplatesResponse = {
  err: boolean;
  data?: DefaultCampaignTemplate[];
  message?: string;
};

export type CampaignActivityTemplate = {
  Id: number;
  Name: string;
  Mode: string;
  DaysLater: number;
  EmailInfo?: { Subject?: string; Content?: string; ButtonText?: string } | null;
  SMSInfo?: { Content?: string } | null;
  IsActive: boolean;
};

type CampaignActivityTemplatesResponse = {
  err: boolean;
  data?: CampaignActivityTemplate[];
  message?: string;
};

type ReviewLinkResponse = {
  err: boolean;
  data?: { reviewUrl?: string };
  message?: string;
};

export type ReviewCampaignListItem = {
  id: string;
  name: string;
  locationId?: string | null;
  isDefault: boolean;
  createdAt: string;
  totalClicks: number;
  steps: number;
  reviewDestinationUrl?: string | null;
  metrics?: {
    total: number;
    waitingForApproval: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    totalClicks: number;
    steps: {
      campaignActivityVersionId: string | null;
      sent: number;
      skipped: number;
      failed: number;
      clicks: number;
    }[];
  };
};

type ReviewCampaignsListResponse = {
  err: boolean;
  data?: ReviewCampaignListItem[];
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

export type ReviewCampaignDetail = {
  id: string;
  name: string;
  locationId?: string | null;
  reviewDestinationUrl: string;
  triggerType: "MANUAL" | "AUTO";
  isDefault: boolean;
  isActive: boolean;
  timezone: string;
  activeVersionId?: string | null;
  versionNumber?: number | null;
  createdAt?: string;
  activities: {
    Id: number;
    Type: "EMAIL" | "SMS";
    SequenceDays: number;
    OrderIndex: number;
    Subject?: string | null;
    Content: string;
    ButtonText?: string | null;
  }[];
};

type ReviewCampaignDetailResponse = {
  err: boolean;
  data?: ReviewCampaignDetail;
  message?: string;
};

export type ReviewCampaignVersion = {
  id: string;
  campaignId: string;
  campaignName: string;
  versionNumber: number;
  isActive: boolean;
  reviewDestinationUrl: string;
  triggerType: "MANUAL" | "AUTO";
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
  steps: number;
  activities: ReviewCampaignDetail["activities"];
};

type ReviewCampaignVersionsResponse = {
  err: boolean;
  data?: ReviewCampaignVersion[];
  message?: string;
};

type UpdateCampaignResponse = {
  err: boolean;
  data?: any;
  message?: string;
};

function toCampaignMutationError(error: any, fallbackMessage: string): DefaultCampaignConflictError {
  const data = error?.response?.data;
  const mutationError = new Error(data?.message || error?.message || fallbackMessage) as DefaultCampaignConflictError;
  if (data?.code === "DEFAULT_CAMPAIGN_EXISTS" || data?.code === "CAMPAIGN_NAME_EXISTS") {
    mutationError.code = data.code;
    mutationError.existingCampaign = data.existingCampaign || null;
  }
  return mutationError;
}

export type ReviewCampaignsSort = {
  sortBy?: "name" | "createdAt" | "totalClicks" | "steps";
  sortDir?: "asc" | "desc";
};

export function useReviewCampaignsList(
  businessId: string | null,
  locationId?: string | null,
  sort?: ReviewCampaignsSort,
  search?: string,
  pagination?: { pageIndex?: number; pageSize?: number }
) {
  const sortBy = sort?.sortBy;
  const sortDir = sort?.sortDir;
  const searchValue = search?.trim() || "";
  return useQuery<ReviewCampaignsListResponse, Error>({
    queryKey: [
      "review-campaigns",
      businessId,
      locationId || null,
      sortBy || null,
      sortDir || null,
      searchValue || null,
      pagination?.pageIndex ?? null,
      pagination?.pageSize ?? null,
    ],
    queryFn: async () => {
      if (!businessId || !locationId) {
        throw new Error("businessId and locationId are required");
      }

      const params = new URLSearchParams({
        businessId,
        locationId,
      });
      if (sortBy) params.set("sortBy", sortBy);
      if (sortDir) params.set("sortDir", sortDir);
      if (searchValue) params.set("search", searchValue);
      if (pagination?.pageIndex !== undefined) params.set("page", String(pagination.pageIndex + 1));
      if (pagination?.pageSize !== undefined) params.set("pageSize", String(pagination.pageSize));

      const response = await api.get<ReviewCampaignsListResponse>(
        `/campaigns?${params.toString()}`,
        "node"
      );

      if (response.err) {
        throw new Error(response.message || "Failed to fetch campaigns");
      }

      return response;
    },
    enabled: !!businessId && !!locationId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useApproveReviewCustomers() {
  const queryClient = useQueryClient();
  return useMutation<
    { err: boolean; data?: { updated: number }; message?: string },
    Error,
    { campaignId: string; customerIds?: string[]; approveAll?: boolean }
  >({
    mutationFn: async ({ campaignId, customerIds = [], approveAll = false }) => {
      const response = await api.post<{ err: boolean; data?: { updated: number }; message?: string }>(
        `/campaigns/${encodeURIComponent(campaignId)}/approve`,
        "node",
        { customerIds, approveAll }
      );

      if (response.err) {
        throw new Error(response.message || "Failed to approve customers");
      }

      return response;
    },
    onSuccess: (response) => {
      toast.success(`Approved ${response.data?.updated ?? 0} customer${response.data?.updated === 1 ? "" : "s"}`);
      queryClient.invalidateQueries({ queryKey: ["review-customers"] });
      queryClient.invalidateQueries({ queryKey: ["review-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["review-customer-timeline"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve customers");
    },
  });
}

export function useReviewCampaignById(campaignId: string | null) {
  return useQuery<ReviewCampaignDetailResponse, Error>({
    queryKey: ["review-campaign", campaignId],
    queryFn: async () => {
      if (!campaignId) {
        throw new Error("campaignId is required");
      }

      const response = await api.get<ReviewCampaignDetailResponse>(
        `/campaigns/${encodeURIComponent(campaignId)}`,
        "node"
      );

      if (response.err) {
        throw new Error(response.message || "Failed to fetch campaign");
      }

      return response;
    },
    enabled: !!campaignId,
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useReviewCampaignVersions(campaignId: string | null) {
  return useQuery<ReviewCampaignVersionsResponse, Error>({
    queryKey: ["review-campaign-versions", campaignId],
    queryFn: async () => {
      if (!campaignId) {
        throw new Error("campaignId is required");
      }

      const response = await api.get<ReviewCampaignVersionsResponse>(
        `/campaigns/${encodeURIComponent(campaignId)}/versions`,
        "node"
      );

      if (response.err) {
        throw new Error(response.message || "Failed to fetch campaign versions");
      }

      return response;
    },
    enabled: !!campaignId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useUpdateReviewCampaign() {
  const queryClient = useQueryClient();
  return useMutation<UpdateCampaignResponse, Error, { id: string; payload: CreateCampaignPayload }>({
    mutationFn: async ({ id, payload }) => {
      let response: UpdateCampaignResponse;
      try {
        response = await api.put<UpdateCampaignResponse>(
          `/campaigns/${encodeURIComponent(id)}`,
          "node",
          payload
        );
      } catch (error) {
        throw toCampaignMutationError(error, "Failed to update campaign");
      }

      if (response.err) {
        throw new Error(response.message || "Failed to update campaign");
      }

      return response;
    },
    onSuccess: () => {
      toast.success("Campaign updated");
      queryClient.invalidateQueries({ queryKey: ["review-campaign"] });
      queryClient.invalidateQueries({ queryKey: ["review-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["review-campaign-versions"] });
    },
    onError: (error) => {
      if ((error as DefaultCampaignConflictError).code === "DEFAULT_CAMPAIGN_EXISTS") return;
      toast.error(error.message || "Failed to update campaign");
    },
  });
}
export function useCreateReviewCampaign() {
  const queryClient = useQueryClient();
  return useMutation<CreateCampaignResponse, Error, CreateCampaignPayload>({
    mutationFn: async (payload) => {
      let response: CreateCampaignResponse;
      try {
        response = await api.post<CreateCampaignResponse>(
          "/campaigns",
          "node",
          payload
        );
      } catch (error) {
        throw toCampaignMutationError(error, "Failed to create campaign");
      }

      if (response.err) {
        throw new Error(response.message || "Failed to create campaign");
      }

      return response;
    },
    onSuccess: () => {
      toast.success("Campaign created");
      queryClient.invalidateQueries({ queryKey: ["review-campaigns"] });
    },
    onError: (error) => {
      if ((error as DefaultCampaignConflictError).code === "DEFAULT_CAMPAIGN_EXISTS") return;
      toast.error(error.message || "Failed to create campaign");
    },
  });
}

export function useDefaultCampaignTemplates() {
  return useQuery<DefaultTemplatesResponse, Error>({
    queryKey: ["default-campaign-templates"],
    queryFn: async () => {
      const response = await api.get<DefaultTemplatesResponse>(
        "/campaigns/default-templates",
        "node"
      );

      if (response.err) {
        throw new Error(response.message || "Failed to fetch templates");
      }

      return response;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCampaignActivityTemplates() {
  return useQuery<CampaignActivityTemplatesResponse, Error>({
    queryKey: ["campaign-activity-templates"],
    queryFn: async () => {
      const response = await api.get<CampaignActivityTemplatesResponse>(
        "/campaigns/activity-templates",
        "node"
      );

      if (response.err) {
        throw new Error(response.message || "Failed to fetch activity templates");
      }

      return response;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useUpdateCampaignActivityTemplate() {
  return useMutation<
    { err: boolean; data?: CampaignActivityTemplate; message?: string },
    Error,
    { id: number; isActive: boolean }
  >({
    mutationFn: async ({ id, isActive }) => {
      const response = await api.patch<{ err: boolean; data?: CampaignActivityTemplate; message?: string }>(
        `/campaigns/activity-templates/${id}`,
        "node",
        { isActive }
      );

      if (response.err) {
        throw new Error(response.message || "Failed to update activity template");
      }

      return response;
    },
  });
}

export function useReviewLinkByLocation(
  businessId: string | null,
  locationId: string | null
) {
  return useQuery<ReviewLinkResponse, Error>({
    queryKey: ["review-link", businessId, locationId],
    queryFn: async () => {
      if (!businessId || !locationId) {
        throw new Error("businessId and locationId are required");
      }

      const response = await api.get<ReviewLinkResponse>(
        `/google/review-link/${encodeURIComponent(locationId)}?businessId=${encodeURIComponent(businessId)}`,
        "node"
      );

      if (response.err) {
        throw new Error(response.message || "Failed to fetch review link");
      }

      return response;
    },
    enabled: !!businessId && !!locationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
