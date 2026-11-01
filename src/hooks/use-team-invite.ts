import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./use-api";
import { useAuthStore } from "@/store/auth-store";

export interface ValidateTokenResponse {
  AccountExists: boolean;
  Email: string;
  TeamMemberRoleId: number;
  CreatedBy: number;
  OrganzationName: string;
  InviteToken: string;
}

interface ApiValidateTokenResponse {
  success: boolean;
  message: string;
  data: ValidateTokenResponse;
}

export function useValidateInviteToken(token: string | null) {
  return useQuery<ValidateTokenResponse, Error>({
    queryKey: ["validate-invite-token", token],
    queryFn: async () => {
      if (!token) {
        throw new Error("Token is required");
      }

      const response = await api.get<ApiValidateTokenResponse>(
        `/auth/validate-invite-token?token=${token}`,
        "node"
      );

      if (!response.success) {
        throw new Error(response.message || "Invalid or expired token");
      }

      return response.data;
    },
    enabled: !!token,
    retry: false,
  });
}

export interface CreateTeamMemberProfileData {
  token: string;
  Password: string;
  ConfirmPassword?: string;
  FirstName?: string;
  LastName?: string;
}

interface ApiCreateProfileResponse {
  success: boolean;
  message: string;
  data?: { token?: string; [key: string]: unknown };
}

export function useCreateTeamMemberProfile() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  return useMutation<{ token: string; user: Record<string, unknown> }, Error, CreateTeamMemberProfileData>({
    mutationFn: async (data: CreateTeamMemberProfileData) => {
      const response = await api.post<ApiCreateProfileResponse>(
        "/auth/create-profile-email",
        "node",
        data,
        { skipAuth: true, suppressUnauthorizedSession: true }
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to create profile");
      }
      if (!response.data?.token) {
        throw new Error("Invitation accepted. Please sign in from the login page.");
      }
      const { token, ...user } = response.data;
      return { token, user };
    },
    onSuccess: ({ token, user }) => {
      setAuth(token, user);
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
