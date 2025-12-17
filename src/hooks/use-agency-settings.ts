import { useMutation, useQueryClient } from "@tanstack/react-query";
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

/**
 * API response structure for logo upload
 */
interface LogoUploadResponse {
  err: boolean;
  uri?: string;
  message?: string;
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
 */
export function useAgencyInfo() {
  const { user, isAuthenticated } = useAuthStore();

  const agencyInfo: AgencyInfo = {
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

      // Convert file to FormData for upload
      const formData = new FormData();
      formData.append("UploadFile", file, file.name);

      // Upload to blob storage
      const uploadResponse = await api.post<LogoUploadResponse>(
        `/Storage/UploadToBlob?Container=usr&Entity=logo&ItemId=${user.id}`,
        "dotnet",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (uploadResponse.err !== false || !uploadResponse.uri) {
        throw new Error(uploadResponse.message || "Failed to upload logo");
      }

      const logoUrl = uploadResponse.uri;

      // Update user profile with new logo URL
      const updateResponse = await api.post<UpdateUserResponse>(
        "/update-user",
        "node",
        {
          details: {
            logo: logoUrl,
            email: user.email,
            name: user.name || user.username,
            website: user.website,
          },
        }
      );

      if (updateResponse.err !== false) {
        throw new Error(updateResponse.message || "Failed to update logo in profile");
      }

      // Update auth store with new logo
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
