"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/hooks/use-api";
import {
  isOrchestrationActive,
  isWorkflowActive,
} from "@/lib/workflow-status";
import { hasActiveCoreOrGrowthPlan } from "@/lib/subscription-status";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import { useBusinessStore } from "@/store/business-store";
import type {
  CreateJobRequest,
  JobWriteFields,
  JobResponse,
  UpdateJobRequest,
} from "@/types/profile-v2";
import {
  buildCreateJobRequest,
  buildUpdateJobRequest,
} from "@/utils/profile-v2-mappers";

const JOBS_KEY = "jobs";

export type JobDetails = JobResponse;

function isBusinessPurchased(businessId: string): boolean {
  const profiles = useBusinessStore.getState().profiles;
  const business = profiles.find((profile) => profile.UniqueId === businessId);
  const isAgencyWhitelisted = profiles.some(
    (profile) => profile.isWhitelisted === true
  );

  return hasActiveCoreOrGrowthPlan(
    business?.SubscriptionItems,
    isAgencyWhitelisted
  );
}

/** Legacy Node business-profile shape. It is never sent to Infer. */
export interface BusinessProfilePayload {
  Website?: string;
  Name?: string;
  Description?: string;
  UserDefinedBusinessDescription?: string;
  AOV?: number | string | null;
  LTV?: string | null;
  BrandTerms?: string[] | null;
  RecurringFlag?: string | null;
  PrimaryLocation?: { Location?: string; Country?: string };
  BusinessObjective?: string;
  LocationType?: string;
  USPs?: string[] | null;
  SellingPoints?: string[] | null;
  CTAs?: unknown;
  SocialBrandVoice?: string[] | null;
  WebBrandVoice?: string[] | null;
  ProfileId?: string | null;
  BusinessCategory?: string | null;
  ServiceAreaType?: string | null;
  ServiceAreas?: string[] | null;
  StructuredServiceAreas?: Array<Record<string, unknown>> | null;
  ProfileLocation?: string | null;
  ProfileCountry?: string | null;
  Segment?: string | number | null;
  B2bB2c?: string | null;
  Competitors?: unknown;
  FoundingDate?: string | null;
  LogoUrl?: string | null;
  Locations?: unknown;
  DetailedLocations?: Array<Record<string, unknown>> | null;
  StructuredLocations?: Array<Record<string, unknown>> | null;
  KeyPeople?: Array<Record<string, unknown>> | null;
  LicensesCompliance?: string[] | null;
  AwardsCertifications?: string[] | null;
  ColorsFontsCss?: string | null;
  ImagePhotoLibrary?: Array<string | Record<string, unknown>> | null;
  SocialProfiles?: Array<string | Record<string, unknown>> | null;
  DirectoryProfiles?: Array<string | Record<string, unknown>> | null;
  SupportEmail?: string | null;
  CommsEmail?: string | null;
  [key: string]: unknown;
}

/** Legacy UI offering row retained for Node-profile mapping only. */
export interface Offering {
  name?: string;
  description?: string;
  link?: string;
  offering_type?: string;
  offeringType?: string;
  price_range?: string;
  priceRange?: string;
  price_positioning?: string;
  duration?: string;
  inclusions?: string[] | string;
}

type LocationOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function assertJobIdentity(job: JobResponse, businessId: string): JobResponse {
  if (!job.job_id) {
    throw new Error("The Job API did not return a job id.");
  }
  if (job.business_id !== businessId) {
    throw new Error("The Job API returned a different business.");
  }
  return job;
}

export function useJobByBusinessId(businessId: string | null) {
  const jobQuery = useQuery<JobResponse | null>({
    queryKey: [JOBS_KEY, "detail", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      try {
        return await api.get<JobResponse>(
          `/jobs/${encodeURIComponent(businessId)}`,
          "python"
        );
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(businessId),
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (
        job?.profile_status === "processing" ||
        isOrchestrationActive(job)
      ) {
        return 5_000;
      }
      return job && isWorkflowActive(job) ? 20_000 : false;
    },
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      return status !== 404 && failureCount < 2;
    },
  });

  return jobQuery;
}

export interface CreateJobParams {
  businessId: string;
  values: BusinessInfoFormData;
  locationOptions?: LocationOption[];
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation<JobResponse, Error, CreateJobParams>({
    retry: false,
    mutationFn: async ({
      businessId,
      values,
      locationOptions = [],
    }) => {
      const request: CreateJobRequest = buildCreateJobRequest(
        businessId,
        values,
        locationOptions,
        isBusinessPurchased(businessId)
      );
      const response = await api.post<JobResponse>(
        "/jobs",
        "python",
        request
      );
      return assertJobIdentity(response, businessId);
    },
    onSuccess: (job) => {
      queryClient.setQueryData(
        [JOBS_KEY, "detail", job.business_id],
        job
      );
    },
  });
}
export interface UpdateJobParams {
  businessId: string;
  values: BusinessInfoFormData;
  locationOptions?: LocationOption[];
}

export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation<JobResponse, Error, UpdateJobParams>({
    retry: false,
    mutationFn: async ({
      businessId,
      values,
      locationOptions = [],
    }) => {
      const request: UpdateJobRequest = buildUpdateJobRequest(
        values,
        locationOptions,
        isBusinessPurchased(businessId)
      );
      const response = await api.put<JobResponse>(
        `/jobs/${encodeURIComponent(businessId)}`,
        "python",
        request
      );
      return assertJobIdentity(response, businessId);
    },
    onSuccess: (job) => {
      queryClient.setQueryData(
        [JOBS_KEY, "detail", job.business_id],
        job
      );
    },
  });
}
export function usePatchJob() {
  const queryClient = useQueryClient();

  return useMutation<
    JobResponse,
    Error,
    { businessId: string; request: JobWriteFields }
  >({
    retry: false,
    mutationFn: async ({ businessId, request }) => {
      const response = await api.put<JobResponse>(
        `/jobs/${encodeURIComponent(businessId)}`,
        "python",
        {
          ...request,
          is_business_purchased: isBusinessPurchased(businessId),
        } satisfies UpdateJobRequest
      );
      return assertJobIdentity(response, businessId);
    },
    onSuccess: (job) => {
      queryClient.setQueryData(
        [JOBS_KEY, "detail", job.business_id],
        job
      );
    },
  });
}
