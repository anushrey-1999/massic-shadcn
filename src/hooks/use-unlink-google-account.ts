import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useAuthStore } from "@/store/auth-store";

function getApiErrorMessage(error: any): string | undefined {
  const data = error?.response?.data;

  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.Message === "string" && data.Message.trim()) return data.Message;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;

  return undefined;
}

type UnlinkGoogleAccountResponse = {
  success?: boolean;
  err?: boolean;
  message?: string;
};

type RefreshTokenResponse = {
  success?: boolean;
  data?: {
    token?: string;
    [key: string]: any;
  };
};

export function useUnlinkGoogleAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;

  return useMutation<void, Error, { authId: string }>({
    mutationFn: async ({ authId }) => {
      if (!userUniqueId) {
        throw new Error("User not authenticated");
      }
      if (!authId) {
        throw new Error("AuthId is required");
      }

      let res: UnlinkGoogleAccountResponse;
      try {
        res = await api.post<UnlinkGoogleAccountResponse>(
          "/agency/unlink-auth",
          "node",
          {
            UserUniqueId: userUniqueId,
            AuthId: authId,
          }
        );
      } catch (error: any) {
        const message = getApiErrorMessage(error) || "Failed to unlink Google account";
        throw new Error(message);
      }

      if (res?.success !== true) {
        throw new Error(res?.message || "Failed to unlink Google account");
      }

      // Refresh token to pull updated user payload (agencyDetails, etc.)
      try {
        const refresh = await api.post<RefreshTokenResponse>(
          "/auth/refresh-token",
          "node",
          { type: "REFRESH_TOKEN" }
        );

        const nextToken = refresh?.data?.token;
        const nextUserData = refresh?.data;
        if (refresh?.success && nextToken && nextUserData) {
          const { token: _ignoredToken, ...userData } = nextUserData;
          useAuthStore.getState().setAuth(nextToken, userData);
        }
      } catch {
        // Best-effort: UI will still refresh other queries.
      }

      // Refresh UI data
      queryClient.invalidateQueries({ queryKey: ["businessProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["linkedBusinesses"] });
    },
  });
}
