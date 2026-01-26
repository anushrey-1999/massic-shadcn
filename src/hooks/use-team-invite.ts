import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./use-api";

export interface ValidateTokenResponse {
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
  FirstName: string;
  LastName?: string;
}

interface ApiCreateProfileResponse {
  success: boolean;
  message: string;
  data?: any;
}

export function useCreateTeamMemberProfile() {
  return useMutation<void, Error, CreateTeamMemberProfileData>({
    mutationFn: async (data: CreateTeamMemberProfileData) => {
      const response = await api.post<ApiCreateProfileResponse>(
        "/auth/create-profile-email",
        "node",
        data
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to create profile");
      }
    },
  });
}
