import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { api } from "@/hooks/use-api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import Cookies from "js-cookie";

const USER_KEY = "user";

/**
 * Agency info data structure
 */
export interface AgencyInfo {
  name: string;
  website: string;
  email: string;
  logo?: string;
}

/**
 * Update agency info payload
 */
interface UpdateAgencyPayload {
  agencyName: string;
  agencyWebsite: string;
}

/**
 * API response structure for update-user
 */
interface UpdateUserResponse {
  err: boolean;
  message?: string;
  data?: any;
}

interface LogoUploadSessionResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    objectKey: string;
    cdnUrl: string;
    upload: {
      method: string;
      bucket: string;
      uploadUrl: string;
      uploadHeaders: Record<string, string>;
      expiresInSeconds: number;
    };
  };
}

interface LogoFinalizeResponse {
  success: boolean;
  err: boolean;
  message?: string;
  data?: {
    logoUrl: string;
  };
}

/**
 * Helper to update user in auth store and cookies
 */
function updateUserInStore(updates: Partial<Record<string, any>>) {
  const { user, setAuth, token } = useAuthStore.getState();

  if (!user || !token) return;

  const updatedUser = { ...user, ...updates };

  // Update cookies
  Cookies.set(USER_KEY, JSON.stringify(updatedUser), {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // Update store
  setAuth(token, updatedUser);
}

/**
 * Hook to get current agency info from auth store
 * For team members, returns the owner's agency info instead
 */
export function useAgencyInfo() {
  const { user, isAuthenticated } = useAuthStore();

  // If user is a team member and has ownerAgencyInfo, use that
  const isTeamMember = user?.isTeamMember || false;
  const ownerInfo = user?.ownerAgencyInfo;

  const agencyInfo: AgencyInfo = isTeamMember && ownerInfo
    ? {
      name: ownerInfo.name || "",
      website: ownerInfo.website || "",
      email: ownerInfo.email || "",
      logo: ownerInfo.logo || "",
    }
    : {
      name: user?.name || user?.username || "",
      website: user?.website || "",
      email: user?.email || "",
      logo: user?.logo || "",
    };

  return {
    agencyInfo,
    isAuthenticated,
    userId: user?.id,
    userUniqueId: user?.uniqueId || user?.UniqueId,
    agencyDetails: user?.agencyDetails || [],
    isTeamMember,
  };
}

/**
 * Hook to update agency info (name, website)
 */
export function useUpdateAgencyInfo() {
  const { user } = useAuthStore();

  return useMutation<void, Error, UpdateAgencyPayload>({
    mutationFn: async (payload: UpdateAgencyPayload) => {
      if (!user?.email) {
        throw new Error("User not authenticated");
      }

      const response = await api.post<UpdateUserResponse>(
        "/update-user",
        "node",
        {
          details: {
            username: payload.agencyName,
            website: payload.agencyWebsite,
            email: user.email,
          },
        }
      );

      if (response.err !== false) {
        throw new Error(response.message || "Failed to update agency info");
      }

      // Update auth store with new values
      updateUserInStore({
        name: payload.agencyName,
        website: payload.agencyWebsite,
      });
    },
    onSuccess: () => {
      toast.success("Agency information updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update agency info", {
        description: error.message || "Please try again later.",
      });
    },
  });
}

/**
 * Hook to upload agency logo
 */
export function useUploadLogo() {
  const { user } = useAuthStore();

  return useMutation<string, Error, File>({
    mutationFn: async (file: File) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const sessionRes = await api.post<LogoUploadSessionResponse>(
        "/users/logo/upload-session",
        "node",
        {
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        }
      );

      if (!sessionRes?.success || !sessionRes?.data?.objectKey || !sessionRes?.data?.upload?.uploadUrl) {
        throw new Error(sessionRes?.message || "Failed to create logo upload session");
      }

      await axios.put(sessionRes.data.upload.uploadUrl, file, {
        headers: sessionRes.data.upload.uploadHeaders,
      });

      const finalizeRes = await api.post<LogoFinalizeResponse>(
        "/users/logo/finalize",
        "node",
        {
          objectKey: sessionRes.data.objectKey,
        }
      );

      if (!finalizeRes?.success || !finalizeRes?.data?.logoUrl) {
        throw new Error(finalizeRes?.message || "Failed to finalize logo upload");
      }

      const logoUrl = finalizeRes.data.logoUrl;
      updateUserInStore({ logo: logoUrl });

      return logoUrl;
    },
    onSuccess: () => {
      toast.success("Logo uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to upload logo", {
        description: error.message || "Please try again later.",
      });
    },
  });
}
