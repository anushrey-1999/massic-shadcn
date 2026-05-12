"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";

export type ReviewCustomerStatus =
  | "WAITING_FOR_APPROVAL"
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

export type ReviewCustomerCampaign = {
  id: string;
  name: string;
  locationId?: string | null;
  reviewDestinationUrl?: string | null;
  triggerType?: string | null;
} | null;

export type ReviewCustomerListItem = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  status: ReviewCustomerStatus;
  locationId?: string | null;
  createdAt: string;
  campaign: ReviewCustomerCampaign;
};

type ReviewCustomersListResponse = {
  err: boolean;
  data?: ReviewCustomerListItem[];
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

export type ReviewCustomerUpsertRow = {
  id?: string | number;
  name: string;
  phone?: string | null;
  email?: string | null;
  campaignId: string | number;
};

export type ReviewCustomerUpsertPayload = {
  businessId: string;
  locationId: string;
  customers: ReviewCustomerUpsertRow[];
};

export type ReviewCustomerFieldErrors = Partial<Record<"name" | "phone" | "email" | "campaignId", string>>;

export type ReviewCustomerMutationError = Error & {
  code?: "CUSTOMER_DUPLICATE" | "CUSTOMER_PREVIOUSLY_MESSAGED";
  fieldErrors?: ReviewCustomerFieldErrors;
};

type ReviewCustomerUpsertResponse = {
  err: boolean;
  data?: { created: number; updated: number; total: number };
  message?: string;
  code?: "CUSTOMER_DUPLICATE" | "CUSTOMER_PREVIOUSLY_MESSAGED";
  fieldErrors?: ReviewCustomerFieldErrors;
};

type ReviewCustomerDeleteResponse = {
  err: boolean;
  data?: { id: string };
  message?: string;
};

type ReviewCustomerSendNowResponse = {
  err: boolean;
  data?: {
    status?: "SENT" | "SKIPPED" | "FAILED" | null;
    message?: string;
    activity?: {
      id: string;
      type: "EMAIL" | "SMS";
      orderIndex: number;
    } | null;
  };
  message?: string;
};

export type ReviewCustomerListSort = {
  sortBy?: "name" | "createdAt" | "status" | "campaignName";
  sortDir?: "asc" | "desc";
};

export type ReviewCustomerListFilters = {
  campaignId?: string | null;
  status?: ReviewCustomerStatus | null;
  createdFrom?: string | null;
  createdTo?: string | null;
  completedFrom?: string | null;
  completedTo?: string | null;
};

export type ReviewCustomerTimeline = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  status: ReviewCustomerStatus;
  locationId?: string | null;
  campaign: { id: string; name: string } | null;
  campaignVersionId?: string | null;
  waitingReason?: string | null;
  nextStep?: {
    campaignActivityVersionId: string;
    type: "EMAIL" | "SMS";
    orderIndex: number;
    sequenceDays: number;
    scheduledAt: string;
    timezone: string;
  } | null;
  plannedActivities: {
    type: "EMAIL" | "SMS";
    orderIndex: number;
    sequenceDays: number;
    subject?: string | null;
    content?: string | null;
    contentPreview?: string | null;
    buttonText?: string | null;
    scheduledAt?: string | null;
    executedAt?: string | null;
    sentManually?: boolean;
    status: "PLANNED" | "NEXT" | "SENT" | "SKIPPED" | "FAILED" | "CLICKED" | "PROCESSED";
    skipReason?: string | null;
    errorMessage?: string | null;
  }[];
  events: {
    type: string;
    label: string;
    occurredAt: string;
    campaignActivityVersionId?: string | null;
    skipReason?: string | null;
    errorMessage?: string | null;
    activity?: {
      type: "EMAIL" | "SMS";
      orderIndex: number;
      sequenceDays: number;
    } | null;
  }[];
};

export function useReviewCustomers(
  businessId: string | null,
  locationId: string | null,
  search?: string,
  sort?: ReviewCustomerListSort,
  pagination?: { pageIndex?: number; pageSize?: number },
  filters?: ReviewCustomerListFilters
) {
  const searchValue = search?.trim() || "";
  const sortBy = sort?.sortBy;
  const sortDir = sort?.sortDir;

  return useQuery<ReviewCustomersListResponse, Error>({
    queryKey: [
      "review-customers",
      businessId,
      locationId,
      searchValue || null,
      sortBy || null,
      sortDir || null,
      pagination?.pageIndex ?? null,
      pagination?.pageSize ?? null,
      filters || null,
    ],
    queryFn: async () => {
      if (!businessId || !locationId) {
        throw new Error("businessId and locationId are required");
      }

      const params = new URLSearchParams({ businessId, locationId });
      if (searchValue) params.set("search", searchValue);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortDir) params.set("sortDir", sortDir);
      if (pagination?.pageIndex !== undefined) params.set("page", String(pagination.pageIndex + 1));
      if (pagination?.pageSize !== undefined) params.set("pageSize", String(pagination.pageSize));
      if (filters?.campaignId) params.set("campaignId", filters.campaignId);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.createdFrom) params.set("createdFrom", filters.createdFrom);
      if (filters?.createdTo) params.set("createdTo", filters.createdTo);
      if (filters?.completedFrom) params.set("completedFrom", filters.completedFrom);
      if (filters?.completedTo) params.set("completedTo", filters.completedTo);

      const response = await api.get<ReviewCustomersListResponse>(
        `/customers?${params.toString()}`,
        "node"
      );

      if (response.err) {
        throw new Error(response.message || "Failed to fetch customers");
      }

      return response;
    },
    enabled: !!businessId && !!locationId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useReviewCustomerTimeline(
  businessId: string | null,
  customerId: string | null
) {
  return useQuery<{ err: boolean; data?: ReviewCustomerTimeline; message?: string }, Error>({
    queryKey: ["review-customer-timeline", businessId, customerId],
    queryFn: async () => {
      if (!businessId || !customerId) {
        throw new Error("businessId and customerId are required");
      }

      const params = new URLSearchParams({ businessId });
      const response = await api.get<{ err: boolean; data?: ReviewCustomerTimeline; message?: string }>(
        `/customers/${encodeURIComponent(customerId)}/timeline?${params.toString()}`,
        "node"
      );

      if (response.err) {
        throw new Error(response.message || "Failed to fetch customer timeline");
      }

      return response;
    },
    enabled: !!businessId && !!customerId,
    staleTime: 15 * 1000,
  });
}

export function useSaveReviewCustomers() {
  const queryClient = useQueryClient();

  return useMutation<ReviewCustomerUpsertResponse, ReviewCustomerMutationError, ReviewCustomerUpsertPayload>({
    mutationFn: async (payload) => {
      let response: ReviewCustomerUpsertResponse;
      try {
        response = await api.post<ReviewCustomerUpsertResponse>(
          "/customers/bulk",
          "node",
          payload
        );
      } catch (error: any) {
        const data = error?.response?.data;
        const mutationError = new Error(
          data?.message || error?.message || "Failed to save customers"
        ) as ReviewCustomerMutationError;
        if (data?.code === "CUSTOMER_DUPLICATE" || data?.code === "CUSTOMER_PREVIOUSLY_MESSAGED") {
          mutationError.code = data.code;
          mutationError.fieldErrors = data.fieldErrors || {};
        }
        throw mutationError;
      }

      if (response.err) {
        const mutationError = new Error(response.message || "Failed to save customers") as ReviewCustomerMutationError;
        if (response.code === "CUSTOMER_DUPLICATE" || response.code === "CUSTOMER_PREVIOUSLY_MESSAGED") {
          mutationError.code = response.code;
          mutationError.fieldErrors = response.fieldErrors || {};
        }
        throw mutationError;
      }

      return response;
    },
    onSuccess: () => {
      toast.success("Customers saved");
      queryClient.invalidateQueries({ queryKey: ["review-customers"] });
    },
    onError: (error) => {
      if (error.code === "CUSTOMER_DUPLICATE" || error.code === "CUSTOMER_PREVIOUSLY_MESSAGED") return;
      toast.error(error.message || "Failed to save customers");
    },
  });
}

export function useDeleteReviewCustomer() {
  const queryClient = useQueryClient();

  return useMutation<ReviewCustomerDeleteResponse, Error, { id: string; businessId: string }>({
    mutationFn: async ({ id, businessId }) => {
      const params = new URLSearchParams({ businessId });
      const response = await api.delete<ReviewCustomerDeleteResponse>(
        `/customers/${encodeURIComponent(id)}?${params.toString()}`,
        "node"
      );

      if (response.err) {
        throw new Error(response.message || "Failed to delete customer");
      }

      return response;
    },
    onSuccess: () => {
      toast.success("Customer deleted");
      queryClient.invalidateQueries({ queryKey: ["review-customers"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete customer");
    },
  });
}

export function useSendReviewCustomerNow() {
  const queryClient = useQueryClient();

  return useMutation<ReviewCustomerSendNowResponse, Error, { id: string; businessId: string }>({
    mutationFn: async ({ id, businessId }) => {
      const params = new URLSearchParams({ businessId });
      const response = await api.post<ReviewCustomerSendNowResponse>(
        `/customers/${encodeURIComponent(id)}/send-now?${params.toString()}`,
        "node",
        {}
      );

      if (response.err) {
        throw new Error(response.message || "Failed to send campaign step");
      }

      return response;
    },
    onSuccess: (response, variables) => {
      toast.success(response.data?.message || "Campaign step sent");
      queryClient.invalidateQueries({ queryKey: ["review-customers"] });
      queryClient.invalidateQueries({
        queryKey: ["review-customer-timeline", variables.businessId, variables.id],
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send campaign step");
    },
  });
}
