import axios from "axios";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export interface CmsFeaturedImageAsset {
  assetId: string;
  businessId: string;
  contentId: string;
  assetType: "featured_image";
  storageProvider: "s3";
  bucket: string;
  objectKey: string;
  cdnUrl: string;
  mimeType: string;
  fileName: string;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  altText: string;
  status: "pending" | "active";
  createdAt: string | null;
  updatedAt: string | null;
}

interface FeaturedImageResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    asset: CmsFeaturedImageAsset | null;
  };
}

export interface CmsFieldImageAssignment {
  assignmentId: string;
  businessId: string;
  contentId: string;
  platform: "webflow" | "sanity";
  fieldKey: string;
  fieldLabel: string;
  asset: CmsFeaturedImageAsset | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface FieldImagesResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    assignments: CmsFieldImageAssignment[];
  };
}

interface UploadSessionResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    asset: CmsFeaturedImageAsset;
    upload: {
      method: "PUT";
      bucket: string;
      uploadUrl: string;
      uploadHeaders: Record<string, string>;
      expiresInSeconds: number;
    };
  };
}

interface CreateUploadSessionPayload {
  businessId: string;
  contentId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
}

interface FinalizePayload {
  businessId: string;
  contentId: string;
  assetId: string;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
  platform?: "webflow" | "sanity";
  fieldKey?: string;
  fieldLabel?: string | null;
}

interface ClearPayload {
  businessId: string;
  contentId: string;
}

interface ClearFieldImagePayload {
  businessId: string;
  contentId: string;
  platform: "webflow" | "sanity";
  fieldKey: string;
}

export interface UploadFeaturedImagePayload {
  businessId: string;
  contentId: string;
  file: File;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
  platform?: "webflow" | "sanity";
  fieldKey?: string;
  fieldLabel?: string | null;
  onProgress?: (progressPercent: number) => void;
}

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.Message ||
    error?.message ||
    fallback
  );
}

function featuredImageQueryKey(businessId: string | null, contentId: string | null) {
  return ["cms-featured-image", businessId || "", contentId || ""] as const;
}

function fieldImagesQueryKey(businessId: string | null, contentId: string | null, platform: string | null) {
  return ["cms-field-images", businessId || "", contentId || "", platform || ""] as const;
}

function upsertFieldImageQueryCache(
  queryClient: QueryClient,
  asset: CmsFeaturedImageAsset,
  variables: { platform?: "webflow" | "sanity"; fieldKey?: string; fieldLabel?: string | null }
) {
  if (!variables.platform || !variables.fieldKey) return;

  const platform = variables.platform;
  const fieldKey = variables.fieldKey;
  const queryKey = fieldImagesQueryKey(asset.businessId, asset.contentId, platform);
  queryClient.setQueryData<CmsFieldImageAssignment[]>(queryKey, (current = []) => {
    const existing = current.find(assignment => assignment.fieldKey === fieldKey);
    const nextAssignment: CmsFieldImageAssignment = {
      assignmentId: existing?.assignmentId || `${platform}:${fieldKey}`,
      businessId: asset.businessId,
      contentId: asset.contentId,
      platform,
      fieldKey,
      fieldLabel: variables.fieldLabel || existing?.fieldLabel || "",
      asset,
      createdAt: existing?.createdAt || asset.createdAt,
      updatedAt: new Date().toISOString(),
    };

    return [
      nextAssignment,
      ...current.filter(assignment => assignment.fieldKey !== fieldKey),
    ];
  });
}

function removeFieldImageQueryCache(
  queryClient: QueryClient,
  variables: { businessId: string; contentId: string; platform: "webflow" | "sanity"; fieldKey: string }
) {
  queryClient.setQueryData<CmsFieldImageAssignment[]>(
    fieldImagesQueryKey(variables.businessId, variables.contentId, variables.platform),
    (current = []) => current.filter(assignment => assignment.fieldKey !== variables.fieldKey)
  );
}

export function useCmsFeaturedImage(businessId: string | null, contentId: string | null, enabled = true) {
  return useQuery<CmsFeaturedImageAsset | null>({
    queryKey: featuredImageQueryKey(businessId, contentId),
    enabled: Boolean(enabled && businessId && contentId),
    queryFn: async () => {
      const res = await api.get<FeaturedImageResponse>(
        `/cms/media/featured-image?businessId=${encodeURIComponent(String(businessId))}&contentId=${encodeURIComponent(String(contentId))}`,
        "node"
      );
      if (!res?.success) {
        throw new Error(res?.message || "Failed to load featured image");
      }
      return res?.data?.asset || null;
    },
  });
}

export function useCmsFieldImages(
  businessId: string | null,
  contentId: string | null,
  platform: "webflow" | "sanity" | null,
  enabled = true
) {
  return useQuery<CmsFieldImageAssignment[]>({
    queryKey: fieldImagesQueryKey(businessId, contentId, platform),
    enabled: Boolean(enabled && businessId && contentId && platform),
    queryFn: async () => {
      const params = new URLSearchParams({
        businessId: String(businessId),
        contentId: String(contentId),
        platform: String(platform),
      });
      const res = await api.get<FieldImagesResponse>(`/cms/media/field-images?${params.toString()}`, "node");
      if (!res?.success) {
        throw new Error(res?.message || "Failed to load field images");
      }
      return res?.data?.assignments || [];
    },
  });
}

export function useFinalizeCmsFeaturedImage() {
  const queryClient = useQueryClient();

  return useMutation<CmsFeaturedImageAsset, Error, FinalizePayload>({
    mutationFn: async (payload) => {
      const res = await api.post<FeaturedImageResponse>("/cms/media/featured-image/finalize", "node", payload);
      if (!res?.success || !res?.data?.asset) {
        throw new Error(res?.message || "Failed to finalize featured image");
      }
      return res.data.asset;
    },
    onSuccess: (asset, variables) => {
      void queryClient.invalidateQueries({
        queryKey: featuredImageQueryKey(asset.businessId, asset.contentId),
      });
      if (variables.platform) {
        upsertFieldImageQueryCache(queryClient, asset, variables);
        void queryClient.invalidateQueries({
          queryKey: fieldImagesQueryKey(asset.businessId, asset.contentId, variables.platform),
        });
      }
    },
  });
}

export function useClearCmsFeaturedImage() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ClearPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<{ success: boolean; err: boolean; message?: string }>(
        "/cms/media/featured-image/clear",
        "node",
        payload
      );
      if (!res?.success) {
        throw new Error(res?.message || "Failed to clear featured image");
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: featuredImageQueryKey(variables.businessId, variables.contentId),
      });
    },
  });
}

export function useClearCmsFieldImage() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ClearFieldImagePayload>({
    mutationFn: async (payload) => {
      const res = await api.post<{ success: boolean; err: boolean; message?: string }>(
        "/cms/media/field-image/clear",
        "node",
        payload
      );
      if (!res?.success) {
        throw new Error(res?.message || "Failed to clear field image");
      }
    },
    onSuccess: (_data, variables) => {
      removeFieldImageQueryCache(queryClient, variables);
      void queryClient.invalidateQueries({
        queryKey: fieldImagesQueryKey(variables.businessId, variables.contentId, variables.platform),
      });
    },
  });
}

export function useUploadCmsFeaturedImage() {
  const queryClient = useQueryClient();

  return useMutation<CmsFeaturedImageAsset, Error, UploadFeaturedImagePayload>({
    mutationFn: async ({ businessId, contentId, file, width, height, altText, platform, fieldKey, fieldLabel, onProgress }) => {
      const sessionPayload: CreateUploadSessionPayload = {
        businessId,
        contentId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        width: width || null,
        height: height || null,
        altText: altText || "",
      };

      const sessionRes = await api.post<UploadSessionResponse>(
        "/cms/media/featured-image/upload-session",
        "node",
        sessionPayload
      );

      if (!sessionRes?.success || !sessionRes?.data?.asset || !sessionRes?.data?.upload?.uploadUrl) {
        throw new Error(sessionRes?.message || "Failed to create featured image upload session");
      }

      await axios.put(sessionRes.data.upload.uploadUrl, file, {
        headers: sessionRes.data.upload.uploadHeaders,
        onUploadProgress: (progressEvent) => {
          if (!onProgress || !progressEvent.total) return;
          const progressPercent = Math.min(
            100,
            Math.max(0, Math.round((progressEvent.loaded / progressEvent.total) * 100))
          );
          onProgress(progressPercent);
        },
      });

      const finalizeRes = await api.post<FeaturedImageResponse>(
        "/cms/media/featured-image/finalize",
        "node",
        {
          businessId,
          contentId,
          assetId: sessionRes.data.asset.assetId,
          width: width || null,
          height: height || null,
          altText: altText || "",
          ...(platform && fieldKey
            ? {
                platform,
                fieldKey,
                fieldLabel: fieldLabel || "",
              }
            : {}),
        }
      );

      if (!finalizeRes?.success || !finalizeRes?.data?.asset) {
        throw new Error(finalizeRes?.message || "Failed to finalize featured image");
      }

      return finalizeRes.data.asset;
    },
    onSuccess: (asset, variables) => {
      void queryClient.invalidateQueries({
        queryKey: featuredImageQueryKey(asset.businessId, asset.contentId),
      });
      if (variables.platform) {
        upsertFieldImageQueryCache(queryClient, asset, variables);
        void queryClient.invalidateQueries({
          queryKey: fieldImagesQueryKey(asset.businessId, asset.contentId, variables.platform),
        });
      }
    },
    onError: (error) => {
      toast.error("Featured image upload failed", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
  });
}
