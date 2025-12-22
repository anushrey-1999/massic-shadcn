import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";
import axios from "axios";
import Cookies from "js-cookie";

const JOBS_KEY = "jobs";

// Type for offerings array
export interface Offering {
  name: string;
  description: string;
  link: string;
}

// Type for business profile payload (matching the structure from ProfileTemplate)
export interface BusinessProfilePayload {
  Website?: string;
  Name?: string;
  Description?: string;
  UserDefinedBusinessDescription?: string;
  PrimaryLocation?: {
    Location?: string;
    Country?: string;
  };
  BusinessObjective?: string;
  LocationType?: string;
  USPs?: string[] | null;
  CTAs?: {
    value: string;
  } | null;
  SocialBrandVoice?: string[] | null;
  WebBrandVoice?: string[] | null;
  [key: string]: any; // Allow other fields
}

// Type for job response
export interface JobDetails {
  job_id?: string;
  business_id?: string;
  name?: string;
  business_url?: string;
  user_defined_business_description?: string;
  offerings?: Array<{
    name?: string;
    offering?: string;
    description?: string;
    url?: string;
  }>;
  usps?: string[];
  ctas?: {
    value: string | Array<{ buttonText: string; url: string }>;
  };
  social_brand_voice?: string[];
  web_brand_voice?: string[];
  workflow_status?: {
    status?: "pending" | "processing" | "success" | "error";
    [key: string]: any;
  };
  [key: string]: any;
}

// Helper function to convert business profile payload to job API FormData
// Reuses the already-mapped business profile payload instead of mapping form data again
function mapBusinessProfilePayloadToJobFormData(
  businessProfilePayload: BusinessProfilePayload,
  businessId: string,
  offerings: Offering[]
): FormData {
  const formDataPayload = new FormData();

  // Validate required fields
  if (!businessId) {
    throw new Error("Business ID is required");
  }
  if (!businessProfilePayload.Name) {
    throw new Error("Business name is required");
  }
  if (!businessProfilePayload.Website) {
    throw new Error("Business website is required");
  }
  if (!businessProfilePayload.PrimaryLocation?.Location) {
    throw new Error("Primary location is required");
  }

  // Map from business profile payload to job API format
  formDataPayload.append("business_id", businessId);
  formDataPayload.append("name", businessProfilePayload.Name);
  formDataPayload.append("business_url", businessProfilePayload.Website);
  formDataPayload.append("brand", businessProfilePayload.Name);
  formDataPayload.append(
    "location",
    businessProfilePayload.PrimaryLocation.Location
  );
  formDataPayload.append(
    "user_defined_business_description",
    businessProfilePayload.UserDefinedBusinessDescription ||
      businessProfilePayload.Description ||
      ""
  );
  formDataPayload.append(
    "serve",
    (businessProfilePayload.BusinessObjective || "local").toLowerCase()
  );
  formDataPayload.append(
    "sell",
    (businessProfilePayload.LocationType || "services").toLowerCase()
  );

  // Handle USPs - ensure it's always a valid JSON array
  const usps = Array.isArray(businessProfilePayload.USPs)
    ? businessProfilePayload.USPs
    : [];
  formDataPayload.append("usps", JSON.stringify(usps));

  // Handle CTAs
  let ctaArray: Array<{ buttonText: string; url: string }> = [];
  if (businessProfilePayload.CTAs?.value) {
    try {
      // CTAs.value might be a JSON string or already parsed
      const ctaValue =
        typeof businessProfilePayload.CTAs.value === "string"
          ? JSON.parse(businessProfilePayload.CTAs.value)
          : businessProfilePayload.CTAs.value;

      // Handle if it's an array directly or nested
      if (Array.isArray(ctaValue)) {
        ctaArray = ctaValue;
      } else if (typeof ctaValue === "string") {
        // Try parsing again if it's a double-encoded string
        ctaArray = JSON.parse(ctaValue);
      }
    } catch (e) {
      console.error("Error parsing CTAs:", e);
      ctaArray = [];
    }
  }

  formDataPayload.append(
    "ctas",
    JSON.stringify({
      value: JSON.stringify(
        ctaArray.map((cta) => ({
          buttonText: cta.buttonText || "",
          url: cta.url || "",
        }))
      ),
    })
  );

  // Handle Social Brand Voice - ensure it's always a valid JSON array
  const socialBrandVoice = Array.isArray(businessProfilePayload.SocialBrandVoice)
    ? businessProfilePayload.SocialBrandVoice
    : [];
  formDataPayload.append(
    "social_brand_voice",
    JSON.stringify(
      socialBrandVoice
        .map((s) => s.toString().trim().toLowerCase())
        .filter((s) => s.length > 0)
        .slice(0, 3)
    )
  );

  // Handle Web Brand Voice - ensure it's always a valid JSON array
  const webBrandVoice = Array.isArray(businessProfilePayload.WebBrandVoice)
    ? businessProfilePayload.WebBrandVoice
    : [];
  formDataPayload.append(
    "web_brand_voice",
    JSON.stringify(
      webBrandVoice
        .map((s) => s.toString().trim().toLowerCase())
        .filter((s) => s.length > 0)
        .slice(0, 3)
    )
  );

  formDataPayload.append("trigger_workflow", "False");

  // Handle offerings CSV - always send a CSV file with headers and at least one row (required by API)
  // Simple CSV generation without external library
  const csvRows: string[] = [];
  csvRows.push("Offerings,Description,Url"); // Header

  if (offerings.length > 0) {
    offerings.forEach((offering) => {
      const name = (offering.name || "").replace(/"/g, '""'); // Escape quotes
      const description = (offering.description || "").replace(/"/g, '""');
      const url = (offering.link || "").replace(/"/g, '""');
      csvRows.push(`"${name}","${description}","${url}"`);
    });
  } else {
    // Empty row with headers if no offerings
    csvRows.push('"","",""');
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const file = new File([blob], "offerings.csv", { type: "text/csv" });
  formDataPayload.append("csv_file", file);

  return formDataPayload;
}

// Helper to create axios instance for FormData requests
function createFormDataAxiosInstance() {
  const baseURL =
    process.env.NEXT_PUBLIC_PYTHON_API_URL || "https://infer.seedinternaldev.xyz/v1";
  const token = Cookies.get("token");

  return axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      "Content-Type": "multipart/form-data",
      ...(token && { token }),
    },
  });
}

/**
 * Get job details by business ID
 * Automatically polls every 20 seconds when workflow status is "processing" or "pending"
 */
export function useJobByBusinessId(businessId: string | null) {
  return useQuery<JobDetails | null>({
    queryKey: [JOBS_KEY, "detail", businessId],
    queryFn: async () => {
      if (!businessId) {
        return null;
      }

      try {
        const response = await api.get<JobDetails>(
          `/job/${businessId}`,
          "python"
        );
        return response || null;
      } catch (error: any) {
        // Job not found is not necessarily an error (job might not exist yet)
        if (error.response?.status === 404) {
          console.log("No job found for business:", businessId);
          return null;
        }
        console.error("Error fetching job details:", error);
        throw error;
      }
    },
    enabled: !!businessId,
    staleTime: 30 * 1000, // 30 seconds - short enough to catch workflow status changes, but not excessive
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: true, // Refetch on mount if data is stale (within 30 seconds)
    refetchOnWindowFocus: true, // Refetch on window focus if data is stale
    refetchInterval: (query) => {
      // Poll every 20 seconds when workflow is processing or pending
      const data = query.state.data;
      const workflowStatus = data?.workflow_status?.status;
      if (workflowStatus === "processing") {
        return 20000; // 20 seconds
      }
      return false; // Stop polling when success or error
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (job doesn't exist)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

interface CreateJobParams {
  businessId: string;
  businessProfilePayload: BusinessProfilePayload;
  offerings: Offering[];
}

/**
 * Create a new job
 */
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation<JobDetails, Error, CreateJobParams>({
    mutationFn: async ({ businessId, businessProfilePayload, offerings }) => {
      if (!businessId) {
        throw new Error("Business ID is required");
      }

      try {
        const formDataPayload = mapBusinessProfilePayloadToJobFormData(
          businessProfilePayload,
          businessId,
          offerings
        );

        const instance = createFormDataAxiosInstance();
        const response = await instance.post<JobDetails>("/job", formDataPayload);

        if (!response.data) {
          const errorMessage =
            (response as any).response?.data?.detail ||
            (response as any).response?.data?.message ||
            "Failed to create job";
          throw new Error(errorMessage);
        }

        // Invalidate and refetch job query
        queryClient.invalidateQueries({
          queryKey: [JOBS_KEY, "detail", businessId],
        });

        return response.data;
      } catch (error: any) {
        // Provide more detailed error message for 422 errors
        if (error.response?.status === 422) {
          const errorDetail = error.response?.data?.detail || error.response?.data?.message || "Validation error";
          throw new Error(`Validation failed: ${errorDetail}`);
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      toast.success("Job created successfully!");
      // Optionally update cache
      queryClient.setQueryData(
        [JOBS_KEY, "detail", variables.businessId],
        data
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to create job", {
        description: error.message || "Please try again later.",
      });
    },
  });
}

interface UpdateJobParams {
  businessId: string;
  businessProfilePayload: BusinessProfilePayload;
  offerings: Offering[];
}

/**
 * Update an existing job
 */
export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation<JobDetails, Error, UpdateJobParams>({
    mutationFn: async ({ businessId, businessProfilePayload, offerings }) => {
      if (!businessId) {
        throw new Error("Business ID is required");
      }

      try {
        const formDataPayload = mapBusinessProfilePayloadToJobFormData(
          businessProfilePayload,
          businessId,
          offerings
        );

        const instance = createFormDataAxiosInstance();
        const response = await instance.put<JobDetails>("/job", formDataPayload);

        if (!response.data) {
          const errorMessage =
            (response as any).response?.data?.detail ||
            (response as any).response?.data?.message ||
            "Failed to update job";
          throw new Error(errorMessage);
        }

        // Invalidate and refetch job query
        queryClient.invalidateQueries({
          queryKey: [JOBS_KEY, "detail", businessId],
        });

        return response.data;
      } catch (error: any) {
        // Provide more detailed error message for 422 errors
        if (error.response?.status === 422) {
          const errorDetail = error.response?.data?.detail || error.response?.data?.message || "Validation error";
          throw new Error(`Validation failed: ${errorDetail}`);
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      toast.success("Job updated successfully");
      // Update cache optimistically
      queryClient.setQueryData(
        [JOBS_KEY, "detail", variables.businessId],
        data
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to update job", {
        description: error.message || "Please try again later.",
      });
    },
  });
}
