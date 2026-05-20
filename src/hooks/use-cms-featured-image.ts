import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
}

interface ClearPayload {
  businessId: string;
  contentId: string;
}

export interface UploadFeaturedImagePayload {
  businessId: string;
  contentId: string;
  file: File;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
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
    onSuccess: (asset) => {
      void queryClient.invalidateQueries({
        queryKey: featuredImageQueryKey(asset.businessId, asset.contentId),
      });
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

export function useUploadCmsFeaturedImage() {
  const queryClient = useQueryClient();

  return useMutation<CmsFeaturedImageAsset, Error, UploadFeaturedImagePayload>({
    mutationFn: async ({ businessId, contentId, file, width, height, altText, onProgress }) => {
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
        }
      );

      if (!finalizeRes?.success || !finalizeRes?.data?.asset) {
        throw new Error(finalizeRes?.message || "Failed to finalize featured image");
      }

      return finalizeRes.data.asset;
    },
    onSuccess: (asset) => {
      void queryClient.invalidateQueries({
        queryKey: featuredImageQueryKey(asset.businessId, asset.contentId),
      });
    },
    onError: (error) => {
      toast.error("Featured image upload failed", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
  });
}
